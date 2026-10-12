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
  vi.restoreAllMocks();
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
  it("anchors prefix highlights at matching tokens rather than substrings inside words", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      async () => {
        throw new Error("Provider unavailable");
      },
      "fixture-model",
    );
    const thread = await conversations.create();
    await conversations.saveUserMessage(
      thread.id,
      randomUUID(),
      `Education notes. ${"Unrelated production notes. ".repeat(25)}Catbus arrives at dusk.`,
    );
    const result = await search.search({
      query: "cat",
      scope: "active",
      page: 0,
    });
    expect(result.searchMode).toBe("lexical");
    expect(result.items).toHaveLength(1);
    const match = result.items[0];
    expect(match.snippet).toContain("Catbus arrives");
    expect(match.snippet).not.toContain("Education");
    const range = match.snippetHighlights![0];
    expect(match.snippet!.slice(range.start, range.end)).toBe("Cat");
  });

  it("retains the semantic passage when the query occurs only inside an unrelated word", async () => {
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      async (texts) =>
        texts.map((text) =>
          text === "cat" || text.includes("Totoro") ? [1, 0] : [0, 1],
        ),
      "fixture-model",
    );
    const thread = await conversations.create();
    await conversations.saveUserMessage(
      thread.id,
      randomUUID(),
      `Education notes. ${"Unrelated production notes. ".repeat(25)}Totoro waits at dusk.`,
    );
    const result = await search.search({
      query: "cat",
      scope: "active",
      page: 0,
    });
    expect(result.items).toHaveLength(1);
    const match = result.items[0];
    expect(match.lexicalScore).toBe(0);
    expect(match.snippet).toContain("Totoro waits");
    const range = match.snippetHighlights![0];
    expect(match.snippet!.slice(range.start, range.end)).toContain(
      "Totoro waits",
    );
  });

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
    expect(calls[0]).toContain("Weekend animation");
    expect(calls[0]).toContain("Work notes");
    expect(calls[1]).toEqual(["quarterly finance"]);
  });

  it("searches semantic passages beyond the bounded document embedding", async () => {
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      async (texts) => texts.map(fixtureVector),
      "fixture-model",
    );
    const thread = await conversations.create();
    const text = `${"Unrelated production notes. ".repeat(500)}\nTotoro waits beside the Catbus at dusk.`;
    expect(text.indexOf("Totoro")).toBeGreaterThan(12_000);
    await conversations.saveUserMessage(thread.id, randomUUID(), text);

    const result = await search.search({
      query: "forest spirit",
      scope: "active",
      page: 0,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(thread.id);
    expect(result.items[0].snippet).toContain("Totoro waits beside the Catbus");
    const highlight = result.items[0].snippetHighlights![0];
    expect(
      result.items[0].snippet!.slice(highlight.start, highlight.end),
    ).toContain("Totoro waits beside the Catbus");
  });

  it("re-embeds renamed titles and retains a semantic title match", async () => {
    const calls: string[][] = [];
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      async (texts) => {
        calls.push([...texts]);
        return texts.map(fixtureVector);
      },
      "fixture-model",
    );
    const thread = await conversations.create();
    await conversations.update(thread.id, { title: "Totoro weekend" });
    const first = await search.search({
      query: "forest spirit",
      scope: "active",
      page: 0,
    });
    expect(first.items[0]).toMatchObject({
      id: thread.id,
      matchSource: "title",
      semanticScore: 1,
    });
    await conversations.update(thread.id, { title: "Quarterly finance" });
    const renamed = await search.search({
      query: "forest spirit",
      scope: "active",
      page: 0,
    });
    expect(renamed.items).toEqual([]);
    expect(calls[1]).toEqual(["forest spirit", "Quarterly finance"]);
  });

  it("preserves original Unicode ranges and accent highlights when embeddings fail", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const embed: EmbeddingProvider = vi.fn(async () => {
      throw new Error("Provider unavailable");
    });
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      embed,
      "fixture-model",
    );
    const thread = await conversations.create();
    await conversations.saveUserMessage(
      thread.id,
      randomUUID(),
      "ﬃ café and café recommendations.",
    );
    for (const [query, expected] of [
      ["recommendations", "recommendations"],
      ["cafe", "café"],
    ]) {
      const result = await search.search({ query, scope: "active", page: 0 });
      expect(result.searchMode).toBe("lexical");
      expect(result.items).toHaveLength(1);
      const highlight = result.items[0].snippetHighlights![0];
      expect(
        result.items[0].snippet!.slice(highlight.start, highlight.end),
      ).toBe(expected);
    }
    expect(embed).toHaveBeenCalledOnce();
  });

  it("does not let out-of-scope index rows exhaust the full-text candidate limit", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      async () => {
        throw new Error("Provider unavailable");
      },
      "fixture-model",
    );
    const thread = await conversations.create();
    await conversations.saveUserMessage(
      thread.id,
      randomUUID(),
      `Totoro ${"production notes ".repeat(30)}`,
    );
    // Archived or stale rows can remain indexed while only active threads are searched.
    await database.batch(
      Array.from({ length: 2001 }, (_, index) => ({
        sql: "INSERT INTO practice_search_fts(resource_id, thread_id, source_type, source_id, content) VALUES(?, ?, ?, ?, ?)",
        args: [
          "search-user",
          `excluded-${index}`,
          "title",
          `excluded-${index}`,
          "Totoro",
        ],
      })),
      "write",
    );
    const result = await search.search({
      query: "Totoro",
      scope: "active",
      page: 0,
    });
    expect(result.searchMode).toBe("lexical");
    expect(result.items.map((item) => item.id)).toEqual([thread.id]);
  });

  it("falls back to full-text results for an invalid query embedding", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const search = new ConversationSearchService(
      database,
      conversations,
      attachments,
      "search-user",
      async (texts) =>
        texts.map((text, index) =>
          index ? fixtureVector(text) : [Number.NaN],
        ),
      "fixture-model",
    );
    const thread = await conversations.create();
    await conversations.update(thread.id, { title: "Totoro weekend" });
    const result = await search.search({
      query: "Totoro",
      scope: "active",
      page: 0,
    });
    expect(result.searchMode).toBe("lexical");
    expect(result.items[0]).toMatchObject({ id: thread.id, semanticScore: 0 });
    expect(Number.isFinite(result.items[0].score)).toBe(true);
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
