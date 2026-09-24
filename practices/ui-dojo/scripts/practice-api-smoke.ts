import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pdfFixture, docxFixture } from "../src/mastra/services/__tests__/document-fixtures";

const base = process.env.PRACTICE_TEST_URL || "http://localhost:4750/practice";
const created: string[] = [];
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(base + path, { ...options, headers: { ...(typeof options.body === "string" ? { "Content-Type": "application/json" } : {}), ...options.headers }, signal: AbortSignal.timeout(30_000) });
  assert(response.ok, `${options.method || "GET"} ${path}: ${response.status} ${await (!response.ok ? response.text() : Promise.resolve(""))}`);
  return response.status === 204 ? null : response.json();
}
try {
  const thread = await request("/threads", { method: "POST" }); created.push(thread.id);
  const second = await request("/threads", { method: "POST" }); created.push(second.id);
  await Promise.all([
    request(`/threads/${thread.id}`, { method: "PATCH", body: JSON.stringify({ title: "API fixture Totoro", pinned: true }) }),
    request(`/threads/${thread.id}`, { method: "PATCH", body: JSON.stringify({ archived: true }) }),
  ]);
  assert.equal((await request(`/threads/${thread.id}`)).title, "API fixture Totoro");
  assert((await request(`/threads/${thread.id}`)).pinnedAt);
  await request(`/threads/${thread.id}`, { method: "PATCH", body: JSON.stringify({ archived: false }) });
  const fileIds: string[] = [];
  for (const [name, bytes, expected] of [
    ["picnic.txt", Buffer.from("Totoro picnic: bring tea."), "bring tea"],
    ["picnic.md", Buffer.from("# Totoro\nTrà cuối tuần 🌿"), "Trà cuối tuần"],
    ["picnic.pdf", pdfFixture(), "Totoro picnic at noon"],
    ["picnic.docx", docxFixture(), "Totoro cuối tuần"],
  ] as const) {
    const form = new FormData(); form.set("file", new File([new Uint8Array(bytes)], name));
    const file = await request(`/threads/${thread.id}/attachments`, { method: "POST", body: form }); fileIds.push(file.id);
    assert((await request(`/attachments/${file.id}/extract`)).text.includes(expected));
  }
  const messageId = randomUUID();
  const body = JSON.stringify({ id: messageId, text: "Saved before model", attachmentIds: fileIds.slice(0, 3) });
  await request(`/threads/${thread.id}/messages`, { method: "POST", body });
  await request(`/threads/${thread.id}/messages`, { method: "POST", body });
  assert.equal((await request(`/threads/${thread.id}/messages`)).total, 1);
  assert.equal((await request(`/threads/${thread.id}/attachments`))[0].messageId, messageId);
  const conflict = await fetch(`${base}/threads/${second.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: messageId, text: "cross-thread overwrite", attachmentIds: [] }) });
  assert.equal(conflict.status, 404);
  for (let index = 0; index < 52; index++) await request(`/threads/${thread.id}/messages`, { method: "POST", body: JSON.stringify({ id: randomUUID(), text: `pagination ${index}`, attachmentIds: [] }) });
  const latest = await request(`/threads/${thread.id}/messages`);
  const older = await request(`/threads/${thread.id}/messages?page=1`);
  assert.equal(latest.items.at(-1).content, "pagination 51");
  assert.equal(older.items[0].id, messageId);
  assert.equal(new Set([...older.items, ...latest.items].map((message: { id: string }) => message.id)).size, 53);
  assert((await request("/threads?query=Saved%20before%20model&scope=all")).items.some((item: { id: string }) => item.id === thread.id));
  const watchlistBefore = await request("/watchlist");
  await request(`/threads/${thread.id}`, { method: "DELETE" }); created.splice(created.indexOf(thread.id), 1);
  assert.equal((await fetch(`${base}/attachments/${fileIds[0]}`)).status, 404);
  assert.deepEqual(await request("/watchlist"), watchlistBefore);
  console.log("PASS: HTTP CRUD, concurrent metadata, 4 real parsers, durable message/file binding, retry idempotency, cross-thread IDs, pagination/search, file cleanup and independent watchlist.");
} finally {
  for (const id of created) await request(`/threads/${id}`, { method: "DELETE" });
}
