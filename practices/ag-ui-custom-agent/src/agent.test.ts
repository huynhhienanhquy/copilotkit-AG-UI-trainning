import assert from "node:assert/strict";
import test from "node:test";
import { EventType, type RunAgentInput } from "@ag-ui/core";
import { lastValueFrom, toArray } from "rxjs";

import { CustomAgent } from "./agent.js";
import { initialState } from "./state.js";

test("streams a calculator response and completes synchronized state", async () => {
  const agent = new CustomAgent({
    agentId: "test-agent",
    initialState,
  });
  const input = {
    threadId: "thread-test",
    runId: "run-test",
    messages: [
      {
        id: "message-test",
        role: "user",
        content: "calculator 4*33",
      },
    ],
    state: initialState,
    tools: [],
    context: [],
  } as RunAgentInput;

  const events = await lastValueFrom(agent.run(input).pipe(toArray()));
  const text = events
    .filter((event) => event.type === EventType.TEXT_MESSAGE_CONTENT)
    .map((event) => event.delta)
    .join("")
    .trim();
  const finalDelta = events
    .filter((event) => event.type === EventType.STATE_DELTA)
    .at(-1);

  assert.equal(events[0]?.type, EventType.RUN_STARTED);
  assert.equal(events.at(-1)?.type, EventType.RUN_FINISHED);
  assert.equal(text, "Calculator result: 4 * 33 = 132");
  assert.deepEqual(finalDelta?.delta, [
    { op: "replace", path: "/status", value: "completed" },
    { op: "replace", path: "/progress", value: 100 },
    {
      op: "replace",
      path: "/result",
      value: "Calculator result: 4 * 33 = 132",
    },
  ]);
});
