import { createHash } from "node:crypto";
import type { Client, InValue } from "@libsql/client";
import type {
  Conversation,
  ConversationSearchPage,
  ConversationSearchResult,
  HighlightRange,
  ListQuery,
} from "../../lib/practice/contracts";
import type { AttachmentService } from "./attachments";
import type { ConversationService } from "./conversations";

type SearchDocument = {
  threadId: string;
  sourceType: "title" | "message";
  sourceId: string;
  content: string;
};

type RankedDocument = SearchDocument & {
  lexicalScore: number;
  semanticScore: number;
  score: number;
};

export type EmbeddingProvider = (
  texts: string[],
  model: string,
  signal?: AbortSignal,
) => Promise<number[][]>;

const PAGE_SIZE = 30;
const EMBEDDING_BATCH_SIZE = 64;
const MAX_EMBEDDING_TEXT = 12_000;

/** Embed bounded search documents in batches; the API key stays server-side. */
async function openAIEmbeddings(
  texts: string[],
  model: string,
  signal?: AbortSignal,
): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const vectors: number[][] = [];
  for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
    const baseUrl = (
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: texts.slice(index, index + EMBEDDING_BATCH_SIZE),
        encoding_format: "float",
      }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(20_000)])
        : AbortSignal.timeout(20_000),
    });
    if (!response.ok)
      throw new Error(`Embedding provider returned ${response.status}`);
    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !Array.isArray((payload as { data?: unknown }).data)
    ) {
      throw new Error("Embedding provider returned an invalid response");
    }
    const data = (payload as { data: { index: number; embedding: number[] }[] })
      .data;
    vectors.push(
      ...data.sort((a, b) => a.index - b.index).map((item) => item.embedding),
    );
  }
  return vectors;
}

function documentKey(
  document: Pick<SearchDocument, "sourceType" | "sourceId">,
): string {
  return `${document.sourceType}:${document.sourceId}`;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function parseVector(value: unknown): number[] | undefined {
  try {
    const parsed: unknown = JSON.parse(String(value));
    if (
      Array.isArray(parsed) &&
      parsed.length &&
      parsed.every((item) => typeof item === "number" && Number.isFinite(item))
    ) {
      return parsed;
    }
  } catch {
    // A corrupt cache entry is regenerated below.
  }
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftLength = 0;
  let rightLength = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index];
    leftLength += left[index] ** 2;
    rightLength += right[index] ** 2;
  }
  return leftLength && rightLength
    ? dot / Math.sqrt(leftLength * rightLength)
    : 0;
}

function queryTokens(query: string): string[] {
  return [
    ...new Set(
      query
        .normalize("NFKC")
        .toLocaleLowerCase()
        .match(/[\p{L}\p{N}]+/gu) || [],
    ),
  ].slice(0, 20);
}

function mergeRanges(ranges: HighlightRange[]): HighlightRange[] {
  const merged: HighlightRange[] = [];
  for (const range of ranges.sort(
    (a, b) => a.start - b.start || a.end - b.end,
  )) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end)
      previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

/** Build a safe plain-text excerpt and character ranges for React <mark> rendering. */
function highlightedSnippet(
  content: string,
  query: string,
): { snippet: string; highlights: HighlightRange[] } {
  const comparable = content.normalize("NFKC").toLocaleLowerCase();
  const phrase = query.normalize("NFKC").toLocaleLowerCase();
  const matches: HighlightRange[] = [];
  const phraseIndex = phrase ? comparable.indexOf(phrase) : -1;
  if (phraseIndex >= 0)
    matches.push({ start: phraseIndex, end: phraseIndex + phrase.length });
  if (!matches.length) {
    for (const token of queryTokens(query)) {
      let index = comparable.indexOf(token);
      while (index >= 0 && matches.length < 12) {
        matches.push({ start: index, end: index + token.length });
        index = comparable.indexOf(token, index + token.length);
      }
    }
  }
  const anchor = matches[0]?.start ?? 0;
  const start = Math.max(0, anchor - 80);
  const end = Math.min(content.length, Math.max(anchor + 160, start + 240));
  const prefix = start ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  const snippet = prefix + content.slice(start, end) + suffix;
  const offset = prefix.length - start;
  return {
    snippet,
    highlights: mergeRanges(
      matches
        .filter((range) => range.end > start && range.start < end)
        .map((range) => ({
          start: Math.max(start, range.start) + offset,
          end: Math.min(end, range.end) + offset,
        })),
    ),
  };
}

async function writeBatches(
  database: Client,
  statements: { sql: string; args: InValue[] }[],
): Promise<void> {
  for (let index = 0; index < statements.length; index += 100) {
    await database.batch(statements.slice(index, index + 100), "write");
  }
}

/** Hybrid persisted conversation search with FTS5, cached embeddings and filters. */
export class ConversationSearchService {
  private readonly database: Client;
  private readonly conversations: ConversationService;
  private readonly attachments: AttachmentService;
  private readonly resourceId: string;
  private readonly embed: EmbeddingProvider;
  private readonly model: string;
  private fullTextQueue: Promise<void> = Promise.resolve();
  private semanticRetryAfter = 0;

  constructor(
    database: Client,
    conversations: ConversationService,
    attachments: AttachmentService,
    resourceId: string,
    embed: EmbeddingProvider = openAIEmbeddings,
    model = process.env.PRACTICE_EMBEDDING_MODEL || "text-embedding-3-small",
  ) {
    this.database = database;
    this.conversations = conversations;
    this.attachments = attachments;
    this.resourceId = resourceId;
    this.embed = embed;
    this.model = model;
  }

  private async allThreads(scope: ListQuery["scope"]): Promise<Conversation[]> {
    const threads: Conversation[] = [];
    let page = 0;
    for (;;) {
      const result = await this.conversations.list({ query: "", scope, page });
      threads.push(...result.items);
      if (!result.hasMore) return threads;
      page++;
    }
  }

  private async documents(threads: Conversation[]): Promise<SearchDocument[]> {
    const documents: SearchDocument[] = [];
    for (const thread of threads) {
      documents.push({
        threadId: thread.id,
        sourceType: "title",
        sourceId: thread.id,
        content: thread.title,
      });
      let page = 0;
      for (;;) {
        const history = await this.conversations.messages(thread.id, page++);
        for (const message of history.messages) {
          const content = message.content.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n")
            .trim();
          if (content)
            documents.push({
              threadId: thread.id,
              sourceType: "message",
              sourceId: message.id,
              content,
            });
        }
        if (!history.hasMore) break;
      }
    }
    return documents;
  }

  /** Rebuild lexical rows from canonical memory so message changes are immediately searchable. */
  private async syncFullText(
    documents: SearchDocument[],
    threadIds: string[],
  ): Promise<void> {
    const statements = threadIds.map((threadId) => ({
      sql: "DELETE FROM practice_search_fts WHERE resource_id = ? AND thread_id = ?",
      args: [this.resourceId, threadId] as InValue[],
    }));
    statements.push(
      ...documents.map((document) => ({
        sql: "INSERT INTO practice_search_fts(resource_id, thread_id, source_type, source_id, content) VALUES(?, ?, ?, ?, ?)",
        args: [
          this.resourceId,
          document.threadId,
          document.sourceType,
          document.sourceId,
          document.content,
        ] as InValue[],
      })),
    );
    const operation = this.fullTextQueue
      .catch(() => undefined)
      .then(() => writeBatches(this.database, statements));
    this.fullTextQueue = operation;
    await operation;
  }

  private async lexicalRanks(
    query: string,
    allowedThreads: Set<string>,
  ): Promise<Map<string, number>> {
    const tokens = queryTokens(query);
    if (!tokens.length) return new Map();
    const expression = tokens.map((token) => `"${token}"*`).join(" OR ");
    const result = await this.database.execute({
      sql: `SELECT source_type, source_id, thread_id
        FROM practice_search_fts
        WHERE practice_search_fts MATCH ? AND resource_id = ?
        ORDER BY bm25(practice_search_fts) LIMIT 2000`,
      args: [expression, this.resourceId],
    });
    const rows = result.rows.filter((row) =>
      allowedThreads.has(String(row.thread_id)),
    );
    return new Map(
      rows.map((row, index) => [
        documentKey({
          sourceType: String(row.source_type) as SearchDocument["sourceType"],
          sourceId: String(row.source_id),
        }),
        1 / (1 + index / 10),
      ]),
    );
  }

  private async cachedEmbeddings(): Promise<
    Map<string, { hash: string; vector: number[] }>
  > {
    const result = await this.database.execute({
      sql: "SELECT source_type, source_id, content_hash, embedding_json FROM practice_search_embeddings WHERE resource_id = ? AND model = ?",
      args: [this.resourceId, this.model],
    });
    const cache = new Map<string, { hash: string; vector: number[] }>();
    for (const row of result.rows) {
      const vector = parseVector(row.embedding_json);
      if (vector)
        cache.set(
          documentKey({
            sourceType: String(row.source_type) as SearchDocument["sourceType"],
            sourceId: String(row.source_id),
          }),
          {
            hash: String(row.content_hash),
            vector,
          },
        );
    }
    return cache;
  }

  private async semanticScores(
    query: string,
    documents: SearchDocument[],
    signal?: AbortSignal,
  ): Promise<Map<string, number> | undefined> {
    if (Date.now() < this.semanticRetryAfter) return;
    try {
      const cache = await this.cachedEmbeddings();
      const missing = documents.filter((document) => {
        const saved = cache.get(documentKey(document));
        return !saved || saved.hash !== hashContent(document.content);
      });
      const inputs = [
        query,
        ...missing.map((document) =>
          document.content.slice(0, MAX_EMBEDDING_TEXT),
        ),
      ];
      const vectors = await this.embed(inputs, this.model, signal);
      if (vectors.length !== inputs.length)
        throw new Error("Embedding provider returned the wrong vector count");
      const queryVector = vectors[0];
      const statements: { sql: string; args: InValue[] }[] = [];
      missing.forEach((document, index) => {
        const vector = vectors[index + 1];
        if (!parseVector(JSON.stringify(vector)))
          throw new Error("Embedding provider returned an invalid vector");
        cache.set(documentKey(document), {
          hash: hashContent(document.content),
          vector,
        });
        statements.push({
          sql: `INSERT INTO practice_search_embeddings(
              resource_id, thread_id, source_type, source_id, content_hash, model, embedding_json, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(resource_id, source_type, source_id) DO UPDATE SET
              thread_id = excluded.thread_id, content_hash = excluded.content_hash,
              model = excluded.model, embedding_json = excluded.embedding_json, updated_at = excluded.updated_at`,
          args: [
            this.resourceId,
            document.threadId,
            document.sourceType,
            document.sourceId,
            hashContent(document.content),
            this.model,
            JSON.stringify(vector),
            new Date().toISOString(),
          ],
        });
      });
      if (statements.length) await writeBatches(this.database, statements);
      return new Map(
        documents.map((document) => [
          documentKey(document),
          cosineSimilarity(
            queryVector,
            cache.get(documentKey(document))?.vector || [],
          ),
        ]),
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      this.semanticRetryAfter = Date.now() + 30_000;
      console.warn(
        JSON.stringify({
          event: "practice_semantic_search_unavailable",
          errorType: error instanceof Error ? error.name : "UnknownError",
        }),
      );
    }
  }

  private result(
    thread: Conversation,
    document: RankedDocument | undefined,
    attachmentCount: number,
    query: string,
  ): ConversationSearchResult {
    if (!document) return { ...thread, attachmentCount };
    const excerpt = highlightedSnippet(document.content, query);
    return {
      ...thread,
      snippet: excerpt.snippet,
      snippetHighlights: excerpt.highlights,
      matchSource: document.sourceType,
      ...(document.sourceType === "message"
        ? { matchedMessageId: document.sourceId }
        : {}),
      lexicalScore: Number(document.lexicalScore.toFixed(4)),
      semanticScore: Number(document.semanticScore.toFixed(4)),
      score: Number(document.score.toFixed(4)),
      attachmentCount,
    };
  }

  /** Search and rank owned threads, applying filters before any embedding work. */
  async search(
    input: ListQuery,
    signal?: AbortSignal,
  ): Promise<ConversationSearchPage> {
    const attachmentCounts = await this.attachments.attachmentCounts();
    const threads = (await this.allThreads(input.scope)).filter((thread) => {
      const date = thread.updatedAt.slice(0, 10);
      if (
        (input.updatedFrom && date < input.updatedFrom) ||
        (input.updatedTo && date > input.updatedTo)
      )
        return false;
      if (
        input.hasAttachments !== undefined &&
        attachmentCounts.has(thread.id) !== input.hasAttachments
      )
        return false;
      return true;
    });
    if (!input.query) {
      const items = threads
        .slice(input.page * PAGE_SIZE, (input.page + 1) * PAGE_SIZE)
        .map((thread) =>
          this.result(
            thread,
            undefined,
            attachmentCounts.get(thread.id) || 0,
            "",
          ),
        );
      return {
        items,
        page: input.page,
        total: threads.length,
        hasMore: (input.page + 1) * PAGE_SIZE < threads.length,
        searchMode: "browse",
      };
    }

    const documents = await this.documents(threads);
    await this.syncFullText(
      documents,
      threads.map((thread) => thread.id),
    );
    const allowedThreads = new Set(threads.map((thread) => thread.id));
    const lexical = await this.lexicalRanks(input.query, allowedThreads);
    const semantic = await this.semanticScores(input.query, documents, signal);
    const bestByThread = new Map<string, RankedDocument>();
    for (const document of documents) {
      const lexicalScore = lexical.get(documentKey(document)) || 0;
      const semanticScore = semantic?.get(documentKey(document)) || 0;
      if (!lexicalScore && (!semantic || semanticScore < 0.45)) continue;
      const score = semantic
        ? lexicalScore
          ? lexicalScore * 0.6 + Math.max(0, semanticScore) * 0.4
          : Math.max(0, semanticScore) * 0.55
        : lexicalScore;
      const ranked = { ...document, lexicalScore, semanticScore, score };
      if ((bestByThread.get(document.threadId)?.score || -1) < score)
        bestByThread.set(document.threadId, ranked);
    }
    const matched = threads
      .filter((thread) => bestByThread.has(thread.id))
      .sort((left, right) => {
        const score =
          (bestByThread.get(right.id)?.score || 0) -
          (bestByThread.get(left.id)?.score || 0);
        return (
          score ||
          Number(!!right.pinnedAt) - Number(!!left.pinnedAt) ||
          right.updatedAt.localeCompare(left.updatedAt)
        );
      });
    const items = matched
      .slice(input.page * PAGE_SIZE, (input.page + 1) * PAGE_SIZE)
      .map((thread) =>
        this.result(
          thread,
          bestByThread.get(thread.id),
          attachmentCounts.get(thread.id) || 0,
          input.query,
        ),
      );
    return {
      items,
      page: input.page,
      total: matched.length,
      hasMore: (input.page + 1) * PAGE_SIZE < matched.length,
      searchMode: semantic ? "hybrid" : "lexical",
    };
  }

  /** Remove derived indexes when the canonical conversation is deleted. */
  async deleteThread(threadId: string): Promise<void> {
    await this.database.batch(
      [
        {
          sql: "DELETE FROM practice_search_embeddings WHERE resource_id = ? AND thread_id = ?",
          args: [this.resourceId, threadId],
        },
        {
          sql: "DELETE FROM practice_search_fts WHERE resource_id = ? AND thread_id = ?",
          args: [this.resourceId, threadId],
        },
      ],
      "write",
    );
  }
}
