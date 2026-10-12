import { it, expect } from "vitest";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { createClient } from "@libsql/client";
import type { MockLanguageModelV2 } from "ai/test";
import { simulateReadableStream } from "ai";
import { MastraAgent } from "@ag-ui/mastra";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { restoreMessages } from "../practice-messages";
import { currentTurnMessages } from "../../../lib/practice/run-messages";
import { ConversationService } from "../conversations";

it("round-trips a real Mastra/AG-UI frontend tool continuation through memory", async () => {
  const database = createClient({ url: "file::memory:" });
  const storage = new LibSQLStore({ id: "bridge-test", client: database });
  await storage.init();
  const memory = new Memory({ storage, options: { generateTitle: false } });
  let invocation = 0;
  const model: Pick<
    MockLanguageModelV2,
    | "specificationVersion"
    | "provider"
    | "modelId"
    | "supportedUrls"
    | "doStream"
    | "doGenerate"
  > = {
    specificationVersion: "v2",
    provider: "practice-test",
    modelId: "scripted",
    supportedUrls: {},
    doGenerate: async () => {
      throw new Error("This test uses streaming only");
    },
    doStream: async () => {
      invocation++;
      const chunks: Awaited<
        ReturnType<typeof model.doStream>
      >["stream"] extends ReadableStream<infer Part>
        ? Part[]
        : never =
        invocation === 1
          ? [
              { type: "stream-start", warnings: [] },
              {
                type: "tool-call",
                toolCallId: "theme-call",
                toolName: "set_theme",
                input: '{"mode":"dark"}',
              },
              {
                type: "finish",
                finishReason: "tool-calls",
                usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
              },
            ]
          : [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "text" },
              {
                type: "text-delta",
                id: "text",
                delta:
                  invocation === 2
                    ? "Dark theme is applied."
                    : "You asked for dark theme.",
              },
              { type: "text-end", id: "text" },
              {
                type: "finish",
                finishReason: "stop",
                usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
              },
            ];
      return { stream: simulateReadableStream({ chunks }) };
    },
  };
  const agent = new Agent({
    id: "bridge-ghibli",
    name: "Test",
    instructions: "Use tools when requested.",
    model,
    memory,
  });
  const threadId = randomUUID();
  const userId = randomUUID();
  await memory.saveThread({
    thread: {
      id: threadId,
      resourceId: "bridge-user",
      title: "Bridge test",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  const tools = [
    {
      name: "set_theme",
      description: "Set the theme",
      parameters: {
        type: "object",
        properties: { mode: { type: "string" } },
        required: ["mode"],
      },
    },
  ];
  try {
    const bridge = new MastraAgent({
      agent,
      threadId,
      resourceId: "bridge-user",
      initialMessages: [
        { id: userId, role: "user", content: "Use dark theme" },
      ],
    });
    await bridge.runAgent({ tools });
    expect(
      bridge.messages.some(
        (message) =>
          message.role === "assistant" &&
          message.toolCalls?.some((call) => call.id === "theme-call"),
      ),
    ).toBe(true);
    bridge.addMessage({
      id: randomUUID(),
      role: "tool",
      toolCallId: "theme-call",
      content: '{"theme":"dark"}',
    });
    await bridge.runAgent({ tools });
    const saved = await memory.recall({
      threadId,
      resourceId: "bridge-user",
      perPage: false,
    });
    const restored = restoreMessages(saved.messages);
    expect(restored.filter((message) => message.id === userId)).toHaveLength(1);
    expect(
      restored.find(
        (message) =>
          message.role === "tool" && message.toolCallId === "theme-call",
      )?.content,
    ).toBe('{"theme":"dark"}');
    const nextUser = {
      id: randomUUID(),
      role: "user" as const,
      content: "What did I ask you to do?",
    };
    await memory.saveMessages({
      messages: [
        {
          id: nextUser.id,
          role: "user",
          threadId,
          resourceId: "bridge-user",
          createdAt: new Date(),
          content: {
            format: 2,
            parts: [{ type: "text", text: nextUser.content }],
          },
        },
      ],
    });
    const reopened = new MastraAgent({
      agent,
      threadId,
      resourceId: "bridge-user",
      initialMessages: currentTurnMessages([...restored, nextUser]),
    });
    await reopened.runAgent({ tools });
    const final = await memory.recall({
      threadId,
      resourceId: "bridge-user",
      perPage: false,
    });
    expect(
      final.messages.filter((message) => message.role === "user"),
    ).toHaveLength(2);
    expect(
      final.messages.filter((message) => message.id === userId),
    ).toHaveLength(1);
    expect(invocation).toBe(3);
    expect(
      final.messages.filter((message) => message.role === "assistant"),
    ).toHaveLength(2);
    expect(final.messages.at(-1)?.content.parts).toContainEqual(
      expect.objectContaining({
        type: "text",
        text: "You asked for dark theme.",
      }),
    );
    const callParts = final.messages
      .flatMap((message) => message.content.parts)
      .filter(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.toolCallId === "theme-call",
      );
    expect(callParts).toHaveLength(1);
  } finally {
    database.close();
  }
});

it("continues a mixed-success tool retry without replaying completed calls", async () => {
  const directory = await mkdtemp(
    join(process.env.PRACTICE_TEST_ROOT || tmpdir(), "ui-dojo-bridge-retry-"),
  );
  // Message deletion opens a new LibSQL connection; use a durable store for this bridge test.
  const database = createClient({
    url: `file:${join(directory, "test.db").replaceAll("\\", "/")}`,
  });
  const storage = new LibSQLStore({
    id: "bridge-retry-test",
    client: database,
  });
  await storage.init();
  const memory = new Memory({ storage, options: { generateTitle: false } });
  const conversations = new ConversationService(memory, "bridge-retry-user");
  const thread = await conversations.create();
  const userId = randomUUID();
  const prompts: unknown[] = [];
  let invocation = 0;
  const model: Pick<
    MockLanguageModelV2,
    | "specificationVersion"
    | "provider"
    | "modelId"
    | "supportedUrls"
    | "doStream"
    | "doGenerate"
  > = {
    specificationVersion: "v2",
    provider: "practice-test",
    modelId: "scripted-retry",
    supportedUrls: {},
    doGenerate: async () => {
      throw new Error("This test uses streaming only");
    },
    doStream: async (options) => {
      prompts.push(options.prompt);
      invocation++;
      const chunks: Awaited<
        ReturnType<typeof model.doStream>
      >["stream"] extends ReadableStream<infer Part>
        ? Part[]
        : never = [
        { type: "stream-start", warnings: [] },
        ...(invocation === 1
          ? [
              {
                type: "tool-call" as const,
                toolCallId: "completed-pin",
                toolName: "update_conversation",
                input: JSON.stringify({
                  threadId: thread.id,
                  patch: { pinned: true },
                }),
              },
              {
                type: "tool-call" as const,
                toolCallId: "failed-theme",
                toolName: "set_theme",
                input: '{"mode":"dark"}',
              },
            ]
          : invocation === 3
            ? [
                {
                  type: "tool-call" as const,
                  toolCallId: "retried-theme",
                  toolName: "set_theme",
                  input: '{"mode":"dark"}',
                },
              ]
            : [
                { type: "text-start" as const, id: "text" },
                {
                  type: "text-delta" as const,
                  id: "text",
                  delta:
                    invocation === 2
                      ? "The theme tool failed."
                      : "Dark theme is applied.",
                },
                { type: "text-end" as const, id: "text" },
              ]),
        {
          type: "finish",
          finishReason:
            invocation === 1 || invocation === 3 ? "tool-calls" : "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        },
      ];
      return { stream: simulateReadableStream({ chunks }) };
    },
  };
  const agent = new Agent({
    id: "bridge-retry-ghibli",
    name: "Test",
    instructions: "Retry only failed calls and preserve completed actions.",
    model,
    memory,
  });
  const tools = [
    {
      name: "set_theme",
      description: "Set the theme",
      parameters: {
        type: "object",
        properties: { mode: { type: "string" } },
        required: ["mode"],
      },
    },
    {
      name: "update_conversation",
      description: "Update conversation",
      parameters: {
        type: "object",
        properties: { threadId: { type: "string" }, patch: { type: "object" } },
        required: ["threadId", "patch"],
      },
    },
  ];
  try {
    const bridge = new MastraAgent({
      agent,
      threadId: thread.id,
      resourceId: "bridge-retry-user",
      initialMessages: [
        {
          id: userId,
          role: "user",
          content: "Pin this conversation and use dark theme.",
        },
      ],
    });
    await bridge.runAgent({ tools });
    bridge.addMessage({
      id: randomUUID(),
      role: "tool",
      toolCallId: "completed-pin",
      content: '{"pinnedAt":"2026-10-11T00:00:00Z"}',
    });
    bridge.addMessage({
      id: randomUUID(),
      role: "tool",
      toolCallId: "failed-theme",
      content: '{"error":"Theme provider unavailable"}',
    });
    await bridge.runAgent({ tools });
    const saved = await memory.recall({
      threadId: thread.id,
      resourceId: "bridge-retry-user",
      perPage: false,
    });
    const failedResponse = saved.messages.find((message) =>
      message.content.parts.some(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.toolCallId === "failed-theme",
      ),
    )!;
    await memory.saveMessages({
      messages: [
        {
          id: randomUUID(),
          threadId: thread.id,
          resourceId: "bridge-retry-user",
          role: "user",
          createdAt: new Date(Date.now() + 1000),
          content: {
            format: 2,
            parts: [{ type: "text", text: "A later request" }],
          },
        },
        {
          id: randomUUID(),
          threadId: thread.id,
          resourceId: "bridge-retry-user",
          role: "assistant",
          createdAt: new Date(Date.now() + 2000),
          content: {
            format: 2,
            parts: [{ type: "text", text: "Later response removed by retry" }],
          },
        },
      ],
    });
    const revised = await conversations.reviseTurn(
      thread.id,
      failedResponse.id,
      { action: "retry_tool" },
    );
    expect(revised.deletedMessageIds.length).toBeGreaterThan(0);

    const retryBridge = new MastraAgent({
      agent,
      threadId: thread.id,
      resourceId: "bridge-retry-user",
      initialMessages: currentTurnMessages(restoreMessages(revised.messages)),
    });
    await retryBridge.runAgent({ tools });
    const retryPrompt = JSON.stringify(prompts[2]);
    expect(retryPrompt).toContain("completed-pin");
    expect(retryPrompt).toContain("pinnedAt");
    expect(retryPrompt).toContain("Theme provider unavailable");
    expect(retryPrompt).not.toContain("Later response removed by retry");
    const newCalls = retryBridge.messages
      .flatMap((message) =>
        message.role === "assistant" ? message.toolCalls || [] : [],
      )
      .filter((call) => !["completed-pin", "failed-theme"].includes(call.id));
    expect(newCalls.map((call) => call.function.name)).toEqual(["set_theme"]);
    retryBridge.addMessage({
      id: randomUUID(),
      role: "tool",
      toolCallId: "retried-theme",
      content: '{"theme":"dark"}',
    });
    await retryBridge.runAgent({ tools });

    const final = await memory.recall({
      threadId: thread.id,
      resourceId: "bridge-retry-user",
      perPage: false,
    });
    const calls = final.messages
      .flatMap((message) => message.content.parts)
      .filter((part) => part.type === "tool-invocation");
    expect(
      calls.filter(
        (part) => part.toolInvocation.toolCallId === "completed-pin",
      ),
    ).toHaveLength(1);
    expect(
      calls.filter(
        (part) => part.toolInvocation.toolCallId === "retried-theme",
      ),
    ).toHaveLength(1);
    expect(
      final.messages.filter((message) => message.id === userId),
    ).toHaveLength(1);
    expect(
      restoreMessages(final.messages).filter(
        (message) =>
          message.role === "tool" && message.toolCallId === "completed-pin",
      ),
    ).toHaveLength(1);
    expect(final.messages.at(-1)?.content.parts).toContainEqual(
      expect.objectContaining({ type: "text", text: "Dark theme is applied." }),
    );
    expect(invocation).toBe(4);
  } finally {
    database.close();
  }
});
