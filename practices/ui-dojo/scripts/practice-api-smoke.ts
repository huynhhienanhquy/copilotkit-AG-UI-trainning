import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  pdfFixture,
  docxFixture,
} from "../src/mastra/services/__tests__/document-fixtures";
import { citationMarker } from "../src/lib/practice/citations";
import type {
  Extraction,
  ConversationSearchPage,
} from "../src/lib/practice/contracts";

const base = process.env.PRACTICE_TEST_URL || "http://localhost:4750/practice";
const created: string[] = [];
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      ...(typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  assert(
    response.ok,
    `${options.method || "GET"} ${path}: ${response.status} ${await (!response.ok ? response.text() : Promise.resolve(""))}`,
  );
  return response.status === 204 ? null : response.json();
}
try {
  const thread = await request("/threads", { method: "POST" });
  created.push(thread.id);
  const second = await request("/threads", { method: "POST" });
  created.push(second.id);
  await Promise.all([
    request(`/threads/${thread.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "API fixture Totoro", pinned: true }),
    }),
    request(`/threads/${thread.id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: true }),
    }),
  ]);
  assert.equal(
    (await request(`/threads/${thread.id}`)).title,
    "API fixture Totoro",
  );
  assert((await request(`/threads/${thread.id}`)).pinnedAt);
  await request(`/threads/${thread.id}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: false }),
  });
  const fileIds: string[] = [];
  for (const [name, bytes, expected] of [
    ["picnic.txt", Buffer.from("Totoro picnic: bring tea."), "bring tea"],
    ["picnic.md", Buffer.from("# Totoro\nTrà cuối tuần 🌿"), "Trà cuối tuần"],
    [
      "picnic.pdf",
      pdfFixture(["Totoro picnic at noon", "Kiki brings bread"]),
      "Totoro picnic at noon",
    ],
    ["picnic.docx", docxFixture(), "Totoro cuối tuần"],
  ] as const) {
    const form = new FormData();
    form.set("file", new File([new Uint8Array(bytes)], name));
    const file = await request(`/threads/${thread.id}/attachments`, {
      method: "POST",
      body: form,
    });
    fileIds.push(file.id);
    const extraction: Extraction = await request(
      `/attachments/${file.id}/extract`,
    );
    assert(extraction.text.includes(expected));
    assert.equal(extraction.attachmentId, file.id);
    assert.equal(extraction.filename, name);
    assert(extraction.chunks.length > 0);
    assert.equal(
      extraction.chunks.map((chunk) => chunk.text).join(""),
      extraction.text,
    );
    for (const chunk of extraction.chunks) {
      assert.equal(chunk.attachmentId, file.id);
      assert.equal(
        chunk.text,
        extraction.text.slice(
          chunk.start - extraction.offset,
          chunk.end - extraction.offset,
        ),
      );
      assert.equal(chunk.citation, citationMarker(chunk));
      const page = extraction.pages.find(
        (candidate) => candidate.page === chunk.page,
      );
      assert(page && page.start <= chunk.start && page.end >= chunk.end);
    }
    if (name === "picnic.pdf")
      assert.deepEqual(
        extraction.chunks.map((chunk) => chunk.page),
        [1, 2],
      );
  }
  const messageId = randomUUID();
  const body = JSON.stringify({
    id: messageId,
    text: "Saved before model",
    attachmentIds: fileIds.slice(0, 3),
  });
  await request(`/threads/${thread.id}/messages`, { method: "POST", body });
  await request(`/threads/${thread.id}/messages`, { method: "POST", body });
  assert.equal((await request(`/threads/${thread.id}/messages`)).total, 1);
  assert.equal(
    (await request(`/threads/${thread.id}`)).title,
    "API fixture Totoro",
  );
  assert.equal(
    (await request(`/threads/${thread.id}/attachments`))[0].messageId,
    messageId,
  );
  const conflict = await fetch(`${base}/threads/${second.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: messageId,
      text: "cross-thread overwrite",
      attachmentIds: [],
    }),
  });
  assert.equal(conflict.status, 404);
  for (let index = 0; index < 52; index++)
    await request(`/threads/${thread.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        id: randomUUID(),
        text: `pagination ${index}`,
        attachmentIds: [],
      }),
    });
  const latest = await request(`/threads/${thread.id}/messages`);
  const older = await request(`/threads/${thread.id}/messages?page=1`);
  assert.equal(latest.items.at(-1).content, "pagination 51");
  assert.equal(older.items[0].id, messageId);
  assert.equal(
    new Set(
      [...older.items, ...latest.items].map(
        (message: { id: string }) => message.id,
      ),
    ).size,
    53,
  );
  const search: ConversationSearchPage = await request(
    "/threads?query=Saved%20before%20model&scope=active&hasAttachments=true&updatedFrom=2000-01-01&updatedTo=2100-01-01",
  );
  const match = search.items.find((item) => item.id === thread.id);
  assert(match);
  assert.equal(match.attachmentCount, 4);
  assert.equal(match.matchedMessageId, messageId);
  assert(match.snippetHighlights?.length);
  assert(
    !(
      await request("/threads?query=Saved%20before%20model&scope=archived")
    ).items.some((item: { id: string }) => item.id === thread.id),
  );
  assert(
    !(
      await request(
        "/threads?query=Saved%20before%20model&hasAttachments=false",
      )
    ).items.some((item: { id: string }) => item.id === thread.id),
  );
  const watchlistBefore = await request("/watchlist");
  await request(`/threads/${thread.id}`, { method: "DELETE" });
  created.splice(created.indexOf(thread.id), 1);
  assert.equal((await fetch(`${base}/attachments/${fileIds[0]}`)).status, 404);
  assert.deepEqual(await request("/watchlist"), watchlistBefore);
  console.log(
    "PASS: HTTP CRUD, concurrent metadata, 4 real parsers, multipage citation provenance, custom-title preservation, durable message/file binding, retry idempotency, cross-thread IDs, pagination/search filters and highlights, file cleanup and independent watchlist.",
  );
} finally {
  for (const id of created)
    await request(`/threads/${id}`, { method: "DELETE" });
}
