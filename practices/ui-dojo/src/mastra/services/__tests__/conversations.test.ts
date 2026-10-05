import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { ConversationService } from "../conversations";
import {
  ConversationTitleService,
  normalizeConversationTitle,
} from "../conversation-title";
import { restoreMessages } from "../practice-messages";
import { createClient, type Client } from "@libsql/client";
import { DEFAULT_CONVERSATION_TITLE } from "../../../lib/practice/contracts";

let directory: string;
let storage: LibSQLStore;
let memory: Memory;
let service: ConversationService;
let database: Client;
beforeEach(async () => {
  directory = await mkdtemp(
    join(process.env.PRACTICE_TEST_ROOT || tmpdir(), "ui-dojo-test-"),
  );
  database = createClient({
    url: `file:${join(directory, "test.db").replaceAll("\\", "/")}`,
  });
  storage = new LibSQLStore({ id: "test", client: database });
  await storage.init();
  memory = new Memory({ storage, options: { generateTitle: false } });
  service = new ConversationService(memory, "test-user");
});
afterEach(() => {
  database.close();
});

describe("durable conversation lifecycle", () => {
  it("generates a short title only for the first message", async () => {
    const thread = await service.create();
    const provider = vi.fn(async () => 'Title: "Totoro cuối tuần!"');
    const titles = new ConversationTitleService(service, provider);
    const first = await service.saveUserMessage(
      thread.id,
      "first-message",
      "Lập kế hoạch xem Totoro cuối tuần",
    );
    expect(first).toEqual({ created: true, isFirstMessage: true });
    await titles.generateIfDefault(
      thread.id,
      "Lập kế hoạch xem Totoro cuối tuần",
    );
    expect(provider).toHaveBeenCalledWith(
      "Lập kế hoạch xem Totoro cuối tuần",
      "gpt-5-mini",
    );
    expect((await service.get(thread.id)).title).toBe("Totoro cuối tuần");

    const retry = await service.saveUserMessage(
      thread.id,
      "first-message",
      "Lập kế hoạch xem Totoro cuối tuần",
    );
    expect(retry).toEqual({ created: false, isFirstMessage: true });
    await titles.generateIfDefault(
      thread.id,
      "Lập kế hoạch xem Totoro cuối tuần",
    );
    expect(provider).toHaveBeenCalledTimes(1);

    const second = await service.saveUserMessage(
      thread.id,
      "second-message",
      "Thêm Spirited Away",
    );
    expect(second.isFirstMessage).toBe(false);
  });

  it("does not overwrite a title set by the user while generation is running", async () => {
    const thread = await service.create();
    let finishProvider!: (title: string) => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const providerResult = new Promise<string>((resolve) => {
      finishProvider = resolve;
    });
    const titles = new ConversationTitleService(service, async () => {
      markStarted();
      return providerResult;
    });
    const generating = titles.generateIfDefault(
      thread.id,
      "A Ghibli movie night",
    );
    await started;
    await service.update(thread.id, { title: "My own title" });
    finishProvider("Generated title");
    expect(await generating).toMatchObject({ updated: false });
    expect((await service.get(thread.id)).title).toBe("My own title");
  });

  it("skips the model when the user already renamed the conversation", async () => {
    const thread = await service.create();
    await service.update(thread.id, { title: "My Ghibli notes" });
    const provider = vi.fn(async () => "Generated title");
    const titles = new ConversationTitleService(service, provider);

    await expect(
      titles.generateIfDefault(thread.id, "Tell me about Totoro"),
    ).resolves.toBeNull();
    expect(provider).not.toHaveBeenCalled();
    expect((await service.get(thread.id)).title).toBe("My Ghibli notes");
  });

  it("keeps the first message successful when title generation fails", async () => {
    const thread = await service.create();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const titles = new ConversationTitleService(service, async () => {
      throw new Error("provider unavailable");
    });

    await expect(
      titles.generateIfDefault(thread.id, "Tell me about Kiki"),
    ).resolves.toBeNull();
    expect((await service.get(thread.id)).title).toBe(
      DEFAULT_CONVERSATION_TITLE,
    );
    expect(warning).toHaveBeenCalledWith(
      JSON.stringify({
        event: "practice_title_generation_failed",
        errorType: "Error",
      }),
    );
    warning.mockRestore();

    const recovery = new ConversationTitleService(
      service,
      async () => "Kiki delivery notes",
    );
    await recovery.generateIfDefault(thread.id, "A second message about Kiki");
    expect((await service.get(thread.id)).title).toBe("Kiki delivery notes");
  });

  it("normalizes unsafe model formatting to one bounded title", () => {
    expect(
      normalizeConversationTitle(
        "## Title: “  Ghibli   movie night!  ”\nExtra",
      ),
    ).toBe("Ghibli movie night");
    expect(normalizeConversationTitle("x".repeat(100))).toHaveLength(80);
  });

  it("merges concurrent title/pin/archive mutations and preserves them through reopening", async () => {
    const thread = await service.create();
    await Promise.all([
      service.update(thread.id, { title: "Ghibli cuối tuần" }),
      service.update(thread.id, { pinned: true }),
      service.update(thread.id, { archived: true }),
    ]);
    const archived = await service.get(thread.id);
    expect(archived.title).toBe("Ghibli cuối tuần");
    expect(archived.pinnedAt).toBeTruthy();
    await expect(service.beginRun(thread.id)).rejects.toMatchObject({
      code: "archived",
    });
    await service.update(thread.id, { archived: false });
    database.close();
    database = createClient({
      url: `file:${join(directory, "test.db").replaceAll("\\", "/")}`,
    });
    storage = new LibSQLStore({ id: "reopened", client: database });
    memory = new Memory({ storage });
    service = new ConversationService(memory, "test-user");
    expect(await service.get(thread.id)).toMatchObject({
      title: "Ghibli cuối tuần",
      pinnedAt: archived.pinnedAt,
      archivedAt: null,
    });
  });

  it("guards foreign IDs, deletion during streaming and overlapping runs", async () => {
    const thread = await service.create();
    const foreign = new ConversationService(memory, "other-user");
    await expect(foreign.get(thread.id)).rejects.toMatchObject({
      code: "not_found",
    });
    const release = await service.beginRun(thread.id);
    await expect(service.beginRun(thread.id)).rejects.toMatchObject({
      code: "busy",
    });
    await expect(
      service.delete(thread.id, async () => {}),
    ).rejects.toMatchObject({ code: "busy" });
    release();
    await service.delete(thread.id, async () => {});
    await expect(service.get(thread.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("restores text and completed tool results and searches beyond the first message page", async () => {
    const thread = await service.create();
    const messages = Array.from({ length: 61 }, (_, index) => ({
      id: `message-${index}`,
      threadId: thread.id,
      resourceId: "test-user",
      role: "user" as const,
      createdAt: new Date(1_700_000_000_000 + index * 1000),
      content: {
        format: 2 as const,
        parts: [
          {
            type: "text" as const,
            text:
              index === 60 ? "Kế hoạch Totoro cuối tuần" : `Message ${index}`,
          },
        ],
      },
    }));
    await memory.saveMessages({ messages });
    await memory.saveMessages({
      messages: [
        {
          id: "assistant-tool",
          threadId: thread.id,
          resourceId: "test-user",
          role: "assistant",
          createdAt: new Date(),
          content: {
            format: 2,
            parts: [
              { type: "text", text: "Theme changed" },
              {
                type: "tool-invocation",
                toolInvocation: {
                  state: "result",
                  toolCallId: "call-1",
                  toolName: "set_theme",
                  args: { mode: "dark" },
                  result: { theme: "dark" },
                },
              },
            ],
          },
        },
      ],
    });
    const first = await service.messages(thread.id);
    const second = await service.messages(thread.id, 1);
    const latest = await service.messages(thread.id, 0, "DESC");
    expect(latest.messages.at(-1)?.id).toBe("assistant-tool");
    expect(
      latest.messages.map((message) => new Date(message.createdAt).getTime()),
    ).toEqual(
      latest.messages
        .map((message) => new Date(message.createdAt).getTime())
        .sort((a, b) => a - b),
    );
    expect(first.hasMore).toBe(true);
    expect(second.hasMore).toBe(false);
    const restored = restoreMessages([...first.messages, ...second.messages]);
    expect(new Set(restored.map((message) => message.id)).size).toBe(
      restored.length,
    );
    expect(restored.find((message) => message.role === "tool")).toMatchObject({
      toolCallId: "call-1",
      content: '{"theme":"dark"}',
    });
    expect(
      (await service.list({ query: "totoro", scope: "active", page: 0 }))
        .items[0]?.id,
    ).toBe(thread.id);
    await service.update(thread.id, { archived: true });
    expect(
      (await service.list({ query: "totoro", scope: "active", page: 0 })).total,
    ).toBe(0);
    expect(
      (await service.list({ query: "totoro", scope: "archived", page: 0 }))
        .total,
    ).toBe(1);
  });
});
