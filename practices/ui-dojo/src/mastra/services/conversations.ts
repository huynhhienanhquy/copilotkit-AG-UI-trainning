import { randomUUID } from "node:crypto";
import type { Memory } from "@mastra/memory";
import type { StorageThreadType } from "@mastra/core/memory";
import type { Conversation, ListQuery, Page, ThreadPatch } from "../../lib/practice/contracts";
import { PracticeError } from "./practice-errors";

/** Convert storage dates/metadata to the browser contract without leaking resource IDs. */
function toConversation(thread: StorageThreadType): Conversation {
  return {
    id: thread.id,
    title: thread.title || "New conversation",
    createdAt: new Date(thread.createdAt).toISOString(),
    updatedAt: new Date(thread.updatedAt).toISOString(),
    archivedAt: typeof thread.metadata?.archivedAt === "string" ? thread.metadata.archivedAt : null,
    pinnedAt: typeof thread.metadata?.pinnedAt === "string" ? thread.metadata.pinnedAt : null,
  };
}

/** Own thread authorization and mutations; construct once per server/resource. */
export class ConversationService {
  private readonly memory: Memory;
  private readonly resourceId: string;
  private readonly activeRuns = new Set<string>();
  private readonly queues = new Map<string, Promise<unknown>>();

  /** Inject memory and a server-owned resource ID; tests use isolated stores. */
  constructor(memory: Memory, resourceId: string) {
    this.memory = memory;
    this.resourceId = resourceId;
  }

  /** Serialize thread mutations so metadata merges and delete/run guards are atomic locally. */
  private async exclusive<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.queues.set(id, next);
    try { return await next; }
    finally { if (this.queues.get(id) === next) this.queues.delete(id); }
  }

  /** Load an owned practice thread; unknown and foreign IDs intentionally look identical. */
  async requireThread(id: string): Promise<StorageThreadType> {
    const thread = await this.memory.getThreadById({ threadId: id });
    if (!thread || thread.resourceId !== this.resourceId || thread.metadata?.practice !== true) {
      throw new PracticeError("not_found", "Conversation not found", 404);
    }
    return thread;
  }

  /** Create a durable empty thread before a first message or attachment is submitted. */
  async create(): Promise<Conversation> {
    const now = new Date();
    const thread = await this.memory.saveThread({ thread: {
      id: randomUUID(), resourceId: this.resourceId, title: "New conversation",
      createdAt: now, updatedAt: now,
      metadata: { practice: true, schemaVersion: 1, archivedAt: null, pinnedAt: null },
    } });
    return toConversation(thread);
  }

  /** Read an owned thread for route hydration. */
  async get(id: string): Promise<Conversation> { return toConversation(await this.requireThread(id)); }

  /** Serialize file/message writes with deletion and reject writes to archived or running threads. */
  async writeToThread<T>(id: string, operation: () => Promise<T>): Promise<T> {
    return this.exclusive(id, async () => {
      const thread = await this.requireThread(id);
      if (thread.metadata?.archivedAt) throw new PracticeError("archived", "Restore this conversation before making changes", 409);
      if (this.activeRuns.has(id)) throw new PracticeError("busy", "Wait for the current response to finish", 409);
      return operation();
    });
  }

  /** Persist the user message before starting a model request, retaining its stable ID on retry. */
  async saveUserMessage(threadId: string, id: string, text: string): Promise<void> {
    const store = await this.memory.storage.getStore("memory");
    if (!store) throw new PracticeError("storage_unavailable", "Message storage is unavailable", 500);
    const { messages: [existing] } = await store.listMessagesById({ messageIds: [id] });
    if (existing) {
      if (existing.threadId !== threadId || existing.resourceId !== this.resourceId) throw new PracticeError("not_found", "Message not found", 404);
      const savedText = existing.content.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n");
      if (existing.role !== "user" || savedText !== text) throw new PracticeError("message_conflict", "This message ID has already been used", 409);
      return;
    }
    await this.memory.saveMessages({ messages: [{ id, threadId, resourceId: this.resourceId,
      role: "user", createdAt: new Date(), content: { format: 2, parts: [{ type: "text", text }] } }] });
  }

  /** Read one chronological page; no tool execution occurs while restoring history. */
  async messages(id: string, page = 0, direction: "ASC" | "DESC" = "ASC") {
    await this.requireThread(id);
    const result = await this.memory.recall({ threadId: id, resourceId: this.resourceId, page, perPage: 50,
      orderBy: { field: "createdAt", direction } });
    // Recall may normalize ordering independently of the storage page direction.
    return { ...result, messages: [...result.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) };
  }

  /** Search all persisted text, paging the storage scan instead of only filtering loaded UI data. */
  async list({ query, scope, page }: ListQuery): Promise<Page<Conversation>> {
    const matched: Conversation[] = [];
    let storagePage = 0;
    const needle = query.normalize("NFKC").toLocaleLowerCase();
    for (;;) {
      const result = await this.memory.listThreads({ filter: { resourceId: this.resourceId, metadata: { practice: true } },
        page: storagePage++, perPage: 100, orderBy: { field: "updatedAt", direction: "DESC" } });
      for (const raw of result.threads) {
        const thread = toConversation(raw);
        if (scope === "active" && thread.archivedAt || scope === "archived" && !thread.archivedAt) continue;
        if (!needle || thread.title.normalize("NFKC").toLocaleLowerCase().includes(needle)) {
          matched.push(thread); continue;
        }
        let messagePage = 0;
        let found = false;
        do {
          const history = await this.messages(thread.id, messagePage++);
          for (const message of history.messages) {
            const text = message.content.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n");
            const position = text.normalize("NFKC").toLocaleLowerCase().indexOf(needle);
            if (position >= 0) {
              thread.snippet = text.slice(Math.max(0, position - 50), position + 150);
              matched.push(thread); found = true; break;
            }
          }
          if (found || !history.hasMore) break;
        } while (!found);
      }
      if (!result.hasMore) break;
    }
    matched.sort((a, b) => Number(!!b.pinnedAt) - Number(!!a.pinnedAt) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return { items: matched.slice(page * 30, (page + 1) * 30), page, total: matched.length, hasMore: (page + 1) * 30 < matched.length };
  }

  /** Merge only provided fields; independent pin/archive/title updates cannot erase each other. */
  async update(id: string, patch: ThreadPatch): Promise<Conversation> {
    return this.exclusive(id, async () => {
      const thread = await this.requireThread(id);
      const metadata = { ...thread.metadata };
      if (patch.archived !== undefined) metadata.archivedAt = patch.archived ? metadata.archivedAt || new Date().toISOString() : null;
      if (patch.pinned !== undefined) metadata.pinnedAt = patch.pinned ? metadata.pinnedAt || new Date().toISOString() : null;
      return toConversation(await this.memory.updateThread({ id, title: patch.title ?? thread.title ?? "New conversation", metadata }));
    });
  }

  /** Acquire a run lease before streaming; reject archived/deleted/busy threads. Release in finally. */
  async beginRun(id: string): Promise<() => void> {
    return this.exclusive(id, async () => {
      const thread = await this.requireThread(id);
      if (thread.metadata?.archivedAt) throw new PracticeError("archived", "Restore this conversation before sending a message", 409);
      if (this.activeRuns.has(id)) throw new PracticeError("busy", "A response is already running", 409);
      this.activeRuns.add(id);
      return () => { this.activeRuns.delete(id); };
    });
  }

  /** Delete an idle owned thread; cleanup runs first and is retryable if storage deletion fails. */
  async delete(id: string, cleanup: () => Promise<void>): Promise<void> {
    await this.exclusive(id, async () => {
      await this.requireThread(id);
      if (this.activeRuns.has(id)) throw new PracticeError("busy", "Stop the response before deleting this conversation", 409);
      await cleanup();
      await this.memory.deleteThread(id);
    });
  }
}
