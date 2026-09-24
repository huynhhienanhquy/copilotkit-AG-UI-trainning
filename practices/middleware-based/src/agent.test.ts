import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

import { OpenAIAgent } from "./agent.js";

const server = createServer((_request, response) => {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  response.write(
    sseChunk({
      choices: [
        {
          index: 0,
          delta: { role: "assistant", content: "Hello" },
          finish_reason: null,
        },
      ],
    }),
  );
  response.write(
    sseChunk({
      choices: [
        {
          index: 0,
          delta: { content: " from AG-UI" },
          finish_reason: "stop",
        },
      ],
    }),
  );
  response.write(
    sseChunk({
      choices: [],
      usage: {
        prompt_tokens: 4,
        completion_tokens: 3,
        total_tokens: 7,
      },
    }),
  );
  response.end("data: [DONE]\n\n");
});

let baseURL = "";

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to start the mock OpenAI server.");
  }
  baseURL = `http://127.0.0.1:${address.port}/v1`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("translates an OpenAI stream into AG-UI events and message history", async () => {
  const agent = new OpenAIAgent({
    apiKey: "test-key",
    baseURL,
    model: "mock-model",
    threadId: "thread-test",
  });
  agent.addMessage({ id: randomUUID(), role: "user", content: "Say hello" });

  const eventTypes: string[] = [];
  let totalTokens: number | undefined;

  const result = await agent.runAgent(
    { runId: "run-test" },
    {
      onRunStartedEvent({ event }) {
        eventTypes.push(event.type);
      },
      onTextMessageStartEvent({ event }) {
        eventTypes.push(event.type);
      },
      onTextMessageContentEvent({ event }) {
        eventTypes.push(event.type);
      },
      onTextMessageEndEvent({ event }) {
        eventTypes.push(event.type);
      },
      onRunFinishedEvent({ event }) {
        eventTypes.push(event.type);
        totalTokens = event.usage?.[0]?.totalTokens;
      },
    },
  );

  assert.deepEqual(eventTypes, [
    "RUN_STARTED",
    "TEXT_MESSAGE_START",
    "TEXT_MESSAGE_CONTENT",
    "TEXT_MESSAGE_CONTENT",
    "TEXT_MESSAGE_END",
    "RUN_FINISHED",
  ]);
  assert.equal(totalTokens, 7);
  assert.equal(result.newMessages.length, 1);
  assert.equal(result.newMessages[0]?.role, "assistant");
  assert.equal(result.newMessages[0]?.content, "Hello from AG-UI");
});

function sseChunk(payload: {
  choices: unknown[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}): string {
  return `data: ${JSON.stringify({
    id: "chatcmpl-test",
    object: "chat.completion.chunk",
    created: 0,
    model: "mock-model",
    ...payload,
  })}\n\n`;
}
