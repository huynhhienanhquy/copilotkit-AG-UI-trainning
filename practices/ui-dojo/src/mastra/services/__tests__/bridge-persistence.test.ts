import { it, expect } from "vitest";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { createClient } from "@libsql/client";
import type { MockLanguageModelV2 } from "ai/test";
import { simulateReadableStream } from "ai";
import { MastraAgent } from "@ag-ui/mastra";
import { randomUUID } from "node:crypto";
import { restoreMessages } from "../practice-messages";
import { currentTurnMessages } from "../../../lib/practice/run-messages";

it("round-trips a real Mastra/AG-UI frontend tool continuation through memory", async () => {
  const database = createClient({ url: "file::memory:" });
  const storage = new LibSQLStore({ id: "bridge-test", client: database });
  await storage.init();
  const memory = new Memory({ storage, options: { generateTitle: false } });
  let invocation = 0;
  const model: Pick<MockLanguageModelV2, "specificationVersion" | "provider" | "modelId" | "supportedUrls" | "doStream" | "doGenerate"> = {
    specificationVersion: "v2", provider: "practice-test", modelId: "scripted", supportedUrls: {},
    doGenerate: async () => { throw new Error("This test uses streaming only"); },
    doStream: async () => {
    invocation++;
    const chunks: Awaited<ReturnType<typeof model.doStream>>["stream"] extends ReadableStream<infer Part> ? Part[] : never = invocation === 1 ? [
      { type: "stream-start", warnings: [] },
      { type: "tool-call", toolCallId: "theme-call", toolName: "set_theme", input: '{"mode":"dark"}' },
      { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
    ] : [
      { type: "stream-start", warnings: [] }, { type: "text-start", id: "text" },
      { type: "text-delta", id: "text", delta: invocation === 2 ? "Dark theme is applied." : "You asked for dark theme." },
      { type: "text-end", id: "text" },
      { type: "finish", finishReason: "stop", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
    ];
    return { stream: simulateReadableStream({ chunks }) };
  } };
  const agent = new Agent({ id: "bridge-ghibli", name: "Test", instructions: "Use tools when requested.", model, memory });
  const threadId = randomUUID();
  const userId = randomUUID();
  await memory.saveThread({ thread: { id: threadId, resourceId: "bridge-user", title: "Bridge test", createdAt: new Date(), updatedAt: new Date() } });
  const tools = [{ name: "set_theme", description: "Set the theme", parameters: { type: "object", properties: { mode: { type: "string" } }, required: ["mode"] } }];
  try {
    const bridge = new MastraAgent({ agent, threadId, resourceId: "bridge-user", initialMessages: [{ id: userId, role: "user", content: "Use dark theme" }] });
    await bridge.runAgent({ tools });
    expect(bridge.messages.some((message) => message.role === "assistant" && message.toolCalls?.some((call) => call.id === "theme-call"))).toBe(true);
    bridge.addMessage({ id: randomUUID(), role: "tool", toolCallId: "theme-call", content: '{"theme":"dark"}' });
    await bridge.runAgent({ tools });
    const saved = await memory.recall({ threadId, resourceId: "bridge-user", perPage: false });
    const restored = restoreMessages(saved.messages);
    expect(restored.filter((message) => message.id === userId)).toHaveLength(1);
    expect(restored.find((message) => message.role === "tool" && message.toolCallId === "theme-call")?.content).toBe('{"theme":"dark"}');
    const nextUser = { id: randomUUID(), role: "user" as const, content: "What did I ask you to do?" };
    await memory.saveMessages({ messages: [{ id: nextUser.id, role: "user", threadId, resourceId: "bridge-user", createdAt: new Date(), content: { format: 2, parts: [{ type: "text", text: nextUser.content }] } }] });
    const reopened = new MastraAgent({ agent, threadId, resourceId: "bridge-user", initialMessages: currentTurnMessages([...restored, nextUser]) });
    await reopened.runAgent({ tools });
    const final = await memory.recall({ threadId, resourceId: "bridge-user", perPage: false });
    expect(final.messages.filter((message) => message.role === "user")).toHaveLength(2);
    expect(final.messages.filter((message) => message.id === userId)).toHaveLength(1);
    expect(invocation).toBe(3);
    expect(final.messages.filter((message) => message.role === "assistant")).toHaveLength(2);
    expect(final.messages.at(-1)?.content.parts).toContainEqual(expect.objectContaining({ type: "text", text: "You asked for dark theme." }));
    const callParts = final.messages.flatMap((message) => message.content.parts).filter((part) => part.type === "tool-invocation" && part.toolInvocation.toolCallId === "theme-call");
    expect(callParts).toHaveLength(1);
  } finally { database.close(); }
});
