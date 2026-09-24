import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { ConversationService } from "../conversations";
import { restoreMessages } from "../practice-messages";
import { createClient, type Client } from "@libsql/client";

let directory: string;
let storage: LibSQLStore;
let memory: Memory;
let service: ConversationService;
let database: Client;
beforeEach(async () => {
  directory = await mkdtemp(join(process.env.PRACTICE_TEST_ROOT || tmpdir(), "ui-dojo-test-"));
  database = createClient({ url: `file:${join(directory, "test.db").replaceAll("\\", "/")}` });
  storage = new LibSQLStore({ id: "test", client: database });
  await storage.init();
  memory = new Memory({ storage, options: { generateTitle: false } });
  service = new ConversationService(memory, "test-user");
});
afterEach(() => { database.close(); });

describe("durable conversation lifecycle", () => {
  it("merges concurrent title/pin/archive mutations and preserves them through reopening", async () => {
    const thread = await service.create();
    await Promise.all([service.update(thread.id, { title: "Ghibli cuối tuần" }), service.update(thread.id, { pinned: true }), service.update(thread.id, { archived: true })]);
    const archived = await service.get(thread.id);
    expect(archived.title).toBe("Ghibli cuối tuần");
    expect(archived.pinnedAt).toBeTruthy();
    await expect(service.beginRun(thread.id)).rejects.toMatchObject({ code: "archived" });
    await service.update(thread.id, { archived: false });
    database.close();
    database = createClient({ url: `file:${join(directory, "test.db").replaceAll("\\", "/")}` });
    storage = new LibSQLStore({ id: "reopened", client: database });
    memory = new Memory({ storage });
    service = new ConversationService(memory, "test-user");
    expect(await service.get(thread.id)).toMatchObject({ title: "Ghibli cuối tuần", pinnedAt: archived.pinnedAt, archivedAt: null });
  });

  it("guards foreign IDs, deletion during streaming and overlapping runs", async () => {
    const thread = await service.create();
    const foreign = new ConversationService(memory, "other-user");
    await expect(foreign.get(thread.id)).rejects.toMatchObject({ code: "not_found" });
    const release = await service.beginRun(thread.id);
    await expect(service.beginRun(thread.id)).rejects.toMatchObject({ code: "busy" });
    await expect(service.delete(thread.id, async () => {})).rejects.toMatchObject({ code: "busy" });
    release();
    await service.delete(thread.id, async () => {});
    await expect(service.get(thread.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("restores text and completed tool results and searches beyond the first message page", async () => {
    const thread = await service.create();
    const messages = Array.from({ length: 61 }, (_, index) => ({
      id: `message-${index}`, threadId: thread.id, resourceId: "test-user", role: "user" as const,
      createdAt: new Date(1_700_000_000_000 + index * 1000),
      content: { format: 2 as const, parts: [{ type: "text" as const, text: index === 60 ? "Kế hoạch Totoro cuối tuần" : `Message ${index}` }] },
    }));
    await memory.saveMessages({ messages });
    await memory.saveMessages({ messages: [{
      id: "assistant-tool", threadId: thread.id, resourceId: "test-user", role: "assistant", createdAt: new Date(),
      content: { format: 2, parts: [{ type: "text", text: "Theme changed" }, { type: "tool-invocation", toolInvocation: {
        state: "result", toolCallId: "call-1", toolName: "set_theme", args: { mode: "dark" }, result: { theme: "dark" },
      } }] },
    }] });
    const first = await service.messages(thread.id);
    const second = await service.messages(thread.id, 1);
    const latest = await service.messages(thread.id, 0, "DESC");
    expect(latest.messages.at(-1)?.id).toBe("assistant-tool");
    expect(latest.messages.map((message) => new Date(message.createdAt).getTime())).toEqual(latest.messages.map((message) => new Date(message.createdAt).getTime()).sort((a, b) => a - b));
    expect(first.hasMore).toBe(true);
    expect(second.hasMore).toBe(false);
    const restored = restoreMessages([...first.messages, ...second.messages]);
    expect(new Set(restored.map((message) => message.id)).size).toBe(restored.length);
    expect(restored.find((message) => message.role === "tool")).toMatchObject({ toolCallId: "call-1", content: '{"theme":"dark"}' });
    expect((await service.list({ query: "totoro", scope: "active", page: 0 })).items[0]?.id).toBe(thread.id);
    await service.update(thread.id, { archived: true });
    expect((await service.list({ query: "totoro", scope: "active", page: 0 })).total).toBe(0);
    expect((await service.list({ query: "totoro", scope: "archived", page: 0 })).total).toBe(1);
  });
});
