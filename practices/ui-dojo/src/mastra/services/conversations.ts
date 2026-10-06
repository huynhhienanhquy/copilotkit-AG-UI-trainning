import { randomUUID } from "node:crypto";
import type { Memory } from "@mastra/memory";
import type { StorageThreadType } from "@mastra/core/memory";
import type { MastraDBMessage } from "@mastra/core/agent";
import type {
  Conversation,
  ListQuery,
  Page,
  ThreadPatch,
} from "../../lib/practice/contracts";
import { DEFAULT_CONVERSATION_TITLE } from "../../lib/practice/contracts";
import { PracticeError } from "./practice-errors";

/** Convert storage dates/metadata to the browser contract without leaking resource IDs. */
function toConversation(thread: StorageThreadType): Conversation {
  return {
    id: thread.id,
    title: thread.title || DEFAULT_CONVERSATION_TITLE,
    createdAt: new Date(thread.createdAt).toISOString(),
    updatedAt: new Date(thread.updatedAt).toISOString(),
    archivedAt:
      typeof thread.metadata?.archivedAt === "string"
        ? thread.metadata.archivedAt
        : null,
    pinnedAt:
      typeof thread.metadata?.pinnedAt === "string"
        ? thread.metadata.pinnedAt
        : null,
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
  private async exclusive<T>(
    id: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.queues.set(id, next);
    try {
      return await next;
    } finally {
      if (this.queues.get(id) === next) this.queues.delete(id);
    }
  }

  /** Load an owned practice thread; unknown and foreign IDs intentionally look identical. */
  async requireThread(id: string): Promise<StorageThreadType> {
    const thread = await this.memory.getThreadById({ threadId: id });
    if (
      !thread ||
      thread.resourceId !== this.resourceId ||
      thread.metadata?.practice !== true
    ) {
      throw new PracticeError("not_found", "Conversation not found", 404);
    }
    return thread;
  }

  /** Create a durable empty thread before a first message or attachment is submitted. */
  async create(): Promise<Conversation> {
    const now = new Date();
    const thread = await this.memory.saveThread({
      thread: {
        id: randomUUID(),
        resourceId: this.resourceId,
        title: DEFAULT_CONVERSATION_TITLE,
        createdAt: now,
        updatedAt: now,
        metadata: {
          practice: true,
          schemaVersion: 1,
          archivedAt: null,
          pinnedAt: null,
        },
      },
    });
    return toConversation(thread);
  }

  /** Read an owned thread for route hydration. */
  async get(id: string): Promise<Conversation> {
    return toConversation(await this.requireThread(id));
  }

  /** Serialize file/message writes with deletion and reject writes to archived or running threads. */
  async writeToThread<T>(id: string, operation: () => Promise<T>): Promise<T> {
    return this.exclusive(id, async () => {
      const thread = await this.requireThread(id);
      if (thread.metadata?.archivedAt)
        throw new PracticeError(
          "archived",
          "Restore this conversation before making changes",
          409,
        );
      if (this.activeRuns.has(id))
        throw new PracticeError(
          "busy",
          "Wait for the current response to finish",
          409,
        );
      return operation();
    });
  }

  /** Persist the user message before starting a model request, retaining its stable ID on retry. */
  async saveUserMessage(
    threadId: string,
    id: string,
    text: string,
  ): Promise<{ created: boolean; isFirstMessage: boolean }> {
    const store = await this.memory.storage.getStore("memory");
    if (!store)
      throw new PracticeError(
        "storage_unavailable",
        "Message storage is unavailable",
        500,
      );
    const {
      messages: [existing],
    } = await store.listMessagesById({ messageIds: [id] });
    if (existing) {
      if (
        existing.threadId !== threadId ||
        existing.resourceId !== this.resourceId
      )
        throw new PracticeError("not_found", "Message not found", 404);
      const savedText = existing.content.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");
      if (existing.role !== "user" || savedText !== text)
        throw new PracticeError(
          "message_conflict",
          "This message ID has already been used",
          409,
        );
      const history = await this.memory.recall({
        threadId,
        resourceId: this.resourceId,
        page: 0,
        perPage: 1,
      });
      return { created: false, isFirstMessage: history.total === 1 };
    }
    const history = await this.memory.recall({
      threadId,
      resourceId: this.resourceId,
      page: 0,
      perPage: 1,
    });
    await this.memory.saveMessages({
      messages: [
        {
          id,
          threadId,
          resourceId: this.resourceId,
          role: "user",
          createdAt: new Date(),
          content: { format: 2, parts: [{ type: "text", text }] },
        },
      ],
    });
    return { created: true, isFirstMessage: history.total === 0 };
  }

  /** Read one chronological page; no tool execution occurs while restoring history. */
  async messages(id: string, page = 0, direction: "ASC" | "DESC" = "ASC") {
    await this.requireThread(id);
    const result = await this.memory.recall({
      threadId: id,
      resourceId: this.resourceId,
      page,
      perPage: 50,
      orderBy: { field: "createdAt", direction },
    });
    // Recall may normalize ordering independently of the storage page direction.
    return {
      ...result,
      messages: [...result.messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    };
  }

  /** Load the complete canonical timeline for destructive turn revisions. */
  private async allMessages(id: string): Promise<MastraDBMessage[]> {
    const messages: MastraDBMessage[] = [];
    let page = 0;
    for (;;) {
      const result = await this.memory.recall({
        threadId: id,
        resourceId: this.resourceId,
        page: page++,
        perPage: 100,
        orderBy: { field: "createdAt", direction: "ASC" },
      });
      messages.push(...result.messages);
      if (!result.hasMore) break;
    }
    return messages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  /**
   * Replace or replay a turn and discard its stale descendants. Re-running from
   * the preceding user turn also makes a failed tool call safe to retry once.
   */
  async reviseTurn(
    threadId: string,
    messageId: string,
    input:
      | { action: "edit"; text: string }
      | { action: "regenerate" | "retry_tool" },
  ): Promise<{ messages: MastraDBMessage[]; deletedMessageIds: string[] }> {
    return this.writeToThread(threadId, async () => {
      const messages = await this.allMessages(threadId);
      const index = messages.findIndex((message) => message.id === messageId);
      const target = messages[index];
      if (!target)
        throw new PracticeError("not_found", "Message not found", 404);

      let deleteFrom = index;
      if (input.action === "edit") {
        if (target.role !== "user")
          throw new PracticeError(
            "invalid_message",
            "Only user messages can be edited",
          );
        const previousText = target.content.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n");
        const attachmentIndex = previousText.indexOf("\n\nAttached files:\n");
        const references =
          attachmentIndex >= 0 ? previousText.slice(attachmentIndex) : "";
        await this.memory.updateMessages({
          messages: [
            {
              id: target.id,
              content: {
                ...target.content,
                parts: [{ type: "text", text: input.text + references }],
              },
            },
          ],
        });
        deleteFrom = index + 1;
      } else {
        if (target.role !== "assistant")
          throw new PracticeError(
            "invalid_message",
            "Choose an assistant response to run again",
          );
        if (
          input.action === "retry_tool" &&
          !target.content.parts.some(
            (part) =>
              part.type === "tool-invocation" &&
              (part.toolInvocation.state !== "result" ||
                Boolean(part.toolInvocation.errorText) ||
                (typeof part.toolInvocation.result === "object" &&
                  part.toolInvocation.result !== null &&
                  "error" in part.toolInvocation.result)),
          )
        )
          throw new PracticeError(
            "tool_not_failed",
            "This response has no failed tool call to retry",
            409,
          );
      }

      const deletedMessageIds = messages
        .slice(deleteFrom)
        .map((message) => message.id);
      if (deletedMessageIds.length)
        await this.memory.deleteMessages(deletedMessageIds);
      return {
        messages: await this.allMessages(threadId),
        deletedMessageIds,
      };
    });
  }

  /** Persist an aborted response marker so refreshes retain its terminal state. */
  async markLatestAssistantInterrupted(threadId: string): Promise<void> {
    await this.exclusive(threadId, async () => {
      await this.requireThread(threadId);
      const messages = await this.allMessages(threadId);
      let latestUserIndex = -1;
      for (let index = messages.length - 1; index >= 0; index--) {
        if (messages[index].role === "user") {
          latestUserIndex = index;
          break;
        }
      }
      const latest = [...messages.slice(latestUserIndex + 1)]
        .reverse()
        .find((message) => message.role === "assistant");
      if (!latest) return;
      await this.memory.updateMessages({
        messages: [
          {
            id: latest.id,
            content: {
              ...latest.content,
              metadata: {
                ...latest.content.metadata,
                practiceStatus: "interrupted",
              },
            },
          },
        ],
      });
    });
  }

  /** Search all persisted text, paging the storage scan instead of only filtering loaded UI data. */
  async list({ query, scope, page }: ListQuery): Promise<Page<Conversation>> {
    const matched: Conversation[] = [];
    let storagePage = 0;
    const needle = query.normalize("NFKC").toLocaleLowerCase();
    for (;;) {
      const result = await this.memory.listThreads({
        filter: { resourceId: this.resourceId, metadata: { practice: true } },
        page: storagePage++,
        perPage: 100,
        orderBy: { field: "updatedAt", direction: "DESC" },
      });
      for (const raw of result.threads) {
        const thread = toConversation(raw);
        if (
          (scope === "active" && thread.archivedAt) ||
          (scope === "archived" && !thread.archivedAt)
        )
          continue;
        if (
          !needle ||
          thread.title.normalize("NFKC").toLocaleLowerCase().includes(needle)
        ) {
          matched.push(thread);
          continue;
        }
        let messagePage = 0;
        let found = false;
        do {
          const history = await this.messages(thread.id, messagePage++);
          for (const message of history.messages) {
            const text = message.content.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n");
            const position = text
              .normalize("NFKC")
              .toLocaleLowerCase()
              .indexOf(needle);
            if (position >= 0) {
              thread.snippet = text.slice(
                Math.max(0, position - 50),
                position + 150,
              );
              matched.push(thread);
              found = true;
              break;
            }
          }
          if (found || !history.hasMore) break;
        } while (!found);
      }
      if (!result.hasMore) break;
    }
    matched.sort(
      (a, b) =>
        Number(!!b.pinnedAt) - Number(!!a.pinnedAt) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.id.localeCompare(b.id),
    );
    return {
      items: matched.slice(page * 30, (page + 1) * 30),
      page,
      total: matched.length,
      hasMore: (page + 1) * 30 < matched.length,
    };
  }

  /** Merge only provided fields; independent pin/archive/title updates cannot erase each other. */
  async update(id: string, patch: ThreadPatch): Promise<Conversation> {
    return this.exclusive(id, async () => {
      const thread = await this.requireThread(id);
      const metadata = { ...thread.metadata };
      if (patch.archived !== undefined)
        metadata.archivedAt = patch.archived
          ? metadata.archivedAt || new Date().toISOString()
          : null;
      if (patch.pinned !== undefined)
        metadata.pinnedAt = patch.pinned
          ? metadata.pinnedAt || new Date().toISOString()
          : null;
      return toConversation(
        await this.memory.updateThread({
          id,
          title: patch.title ?? thread.title ?? DEFAULT_CONVERSATION_TITLE,
          metadata,
        }),
      );
    });
  }

  /** Atomically apply a generated title without overwriting a user rename. */
  async updateTitleIfDefault(
    id: string,
    title: string,
  ): Promise<{ updated: boolean; conversation: Conversation }> {
    return this.exclusive(id, async () => {
      const thread = await this.requireThread(id);
      if (
        (thread.title || DEFAULT_CONVERSATION_TITLE) !==
        DEFAULT_CONVERSATION_TITLE
      )
        return { updated: false, conversation: toConversation(thread) };
      const updated = await this.memory.updateThread({
        id,
        title,
        metadata: { ...thread.metadata },
      });
      return { updated: true, conversation: toConversation(updated) };
    });
  }

  /** Acquire a run lease before streaming; reject archived/deleted/busy threads. Release in finally. */
  async beginRun(id: string): Promise<() => void> {
    return this.exclusive(id, async () => {
      const thread = await this.requireThread(id);
      if (thread.metadata?.archivedAt)
        throw new PracticeError(
          "archived",
          "Restore this conversation before sending a message",
          409,
        );
      if (this.activeRuns.has(id))
        throw new PracticeError("busy", "A response is already running", 409);
      this.activeRuns.add(id);
      return () => {
        this.activeRuns.delete(id);
      };
    });
  }

  /** Delete an idle owned thread; cleanup runs first and is retryable if storage deletion fails. */
  async delete(id: string, cleanup: () => Promise<void>): Promise<void> {
    await this.exclusive(id, async () => {
      await this.requireThread(id);
      if (this.activeRuns.has(id))
        throw new PracticeError(
          "busy",
          "Stop the response before deleting this conversation",
          409,
        );
      await cleanup();
      await this.memory.deleteThread(id);
    });
  }
}
