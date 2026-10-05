import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { migratePractice } from "../../repositories/practice-database";
import { AttachmentService } from "../attachments";
import { ConversationService } from "../conversations";
import {
  ConversationSearchService,
  type EmbeddingProvider,
} from "../conversation-search";

let directory: string;
let database: Client;
let conversations: ConversationService;
let attachments: AttachmentService;

beforeEach(async () => {
  directory = await mkdtemp(
    join(process.env.PRACTICE_TEST_ROOT || tmpdir(), "ui-dojo-search-"),
  );
  database = createClient({
    url: `file:${join(directory, "test.db").replaceAll("\\", "/")}`,
  });
  const storage = new LibSQLStore({ id: "search-test", client: database });
  await storage.init();
  await migratePractice(database);
  conversations = new ConversationService(
    new Memory({ storage, options: { generateTitle: false } }),
    "search-user",
  );
  attachments = new AttachmentService(database, "search-user", directory);
});

afterEach(() => {
  database.close();
});

function fixtureVector(text: string): number[] {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("forest spirit") ||
    normalized.includes("totoro") ||
    normalized.includes("catbus")
  )
    return [1, 0, 0];
  if (normalized.includes("finance") || normalized.includes("quarterly"))
    return [0, 1, 0];
  return [0, 0, 1];
}

describe("hybrid conversation search", () => {
  it("combines semantic and full-text ranking, highlights matches and caches document embeddings", async () => {
    const calls: string[][] = [];
    const embed: EmbeddingProvider = vi.fn(async (texts) => {
      calls.push([...texts]);
      return texts.map(fixtureVector);
    });
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      embed,
      "fixture-model",
    );
    const ghibli = await conversations.create();
    await conversations.update(ghibli.id, { title: "Weekend animation" });
    await conversations.saveUserMessage(
      ghibli.id,
      randomUUID(),
      `${"Production notes unrelated to animation. ".repeat(10)}Totoro waits beside the Catbus at dusk.`,
    );
    const work = await conversations.create();
    await conversations.update(work.id, { title: "Work notes" });
    await conversations.saveUserMessage(
      work.id,
      randomUUID(),
      "Quarterly finance meeting notes and forecasts.",
    );

    const semantic = await search.search({
      query: "forest spirit",
      scope: "active",
      page: 0,
    });
    expect(semantic.searchMode).toBe("hybrid");
    expect(semantic.items[0]).toMatchObject({
      id: ghibli.id,
      matchSource: "message",
      lexicalScore: 0,
      semanticScore: 1,
    });
    expect(semantic.items[0].snippetHighlights?.length).toBeGreaterThan(0);
    expect(semantic.items[0].snippet).toContain(
      "Totoro waits beside the Catbus",
    );
    expect(
      semantic.items[0].snippet
        ?.slice(
          semantic.items[0].snippetHighlights![0].start,
          semantic.items[0].snippetHighlights![0].end,
        )
        .toLowerCase(),
    ).toContain("totoro waits beside the catbus");

    const lexical = await search.search({
      query: "quarterly finance",
      scope: "active",
      page: 0,
    });
    expect(lexical.items[0]).toMatchObject({
      id: work.id,
      matchSource: "message",
    });
    expect(lexical.items[0].snippetHighlights?.length).toBeGreaterThan(0);
    expect(
      lexical.items[0].snippet
        ?.slice(
          lexical.items[0].snippetHighlights![0].start,
          lexical.items[0].snippetHighlights![0].end,
        )
        .toLowerCase(),
    ).toContain("quarterly finance");

    expect(calls[0].length).toBeGreaterThan(1);
    expect(calls[1]).toEqual(["quarterly finance"]);
  });

  it("filters by inclusive date, attachment presence and archive status, then removes derived indexes", async () => {
    const embed: EmbeddingProvider = async (texts) => texts.map(fixtureVector);
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      embed,
      "fixture-model",
    );
    const withFile = await conversations.create();
    await conversations.update(withFile.id, { title: "Totoro references" });
    await conversations.saveUserMessage(
      withFile.id,
      randomUUID(),
      "A note about the Catbus.",
    );
    await attachments.upload(withFile.id, "notes.txt", Buffer.from("fixture"));
    const empty = await conversations.create();
    await conversations.update(empty.id, { title: "No files" });
    const today = new Date().toISOString().slice(0, 10);

    const filtered = await search.search({
      query: "",
      scope: "active",
      page: 0,
      updatedFrom: today,
      updatedTo: today,
      hasAttachments: true,
    });
    expect(filtered.items.map((item) => item.id)).toEqual([withFile.id]);
    expect(filtered.items[0].attachmentCount).toBe(1);

    await conversations.update(withFile.id, { archived: true });
    expect(
      (
        await search.search({
          query: "",
          scope: "active",
          page: 0,
          hasAttachments: true,
        })
      ).total,
    ).toBe(0);
    expect(
      (
        await search.search({
          query: "",
          scope: "archived",
          page: 0,
          hasAttachments: true,
        })
      ).items[0].id,
    ).toBe(withFile.id);

    await search.search({ query: "Totoro", scope: "all", page: 0 });
    await search.deleteThread(withFile.id);
    const embeddings = await database.execute({
      sql: "SELECT COUNT(*) AS count FROM practice_search_embeddings WHERE resource_id = ? AND thread_id = ?",
      args: ["search-user", withFile.id],
    });
    const fullText = await database.execute({
      sql: "SELECT COUNT(*) AS count FROM practice_search_fts WHERE resource_id = ? AND thread_id = ?",
      args: ["search-user", withFile.id],
    });
    expect(Number(embeddings.rows[0].count)).toBe(0);
    expect(Number(fullText.rows[0].count)).toBe(0);
  });
});
