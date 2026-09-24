import assert from "node:assert/strict";
import test from "node:test";
import { EventType, type RunAgentInput } from "@ag-ui/core";
import { WorkspaceAgent } from "./agent.js";
import { WorkspaceStore } from "./state.js";

test("demo streaming preserves every character", async () => {
  const agent = new WorkspaceAgent(new WorkspaceStore(), {
    demoMode: true,
    model: "deterministic-demo",
  });
  const input = {
    threadId: "stream-test",
    runId: "run-test",
    messages: [{ id: "user-test", role: "user", content: "Create task Design the interface" }],
    state: {},
    tools: [],
    context: [],
  } as RunAgentInput;

  let response = "";
  for await (const event of agent.run(input)) {
    if (event.type === EventType.TEXT_MESSAGE_CONTENT) response += event.delta;
  }

  assert.equal(
    response,
    "Created task “Design the interface”. Shared state was synchronized through AG-UI.",
  );
});

test("demo mode executes the calculator tool through AG-UI events", async () => {
  const agent = new WorkspaceAgent(new WorkspaceStore(), {
    demoMode: true,
    model: "deterministic-demo",
  });
  const input = {
    threadId: "calculator-test",
    runId: "calculator-run",
    messages: [{ id: "user-test", role: "user", content: "Calculate (12 + 8) * 3" }],
    state: {},
    tools: [],
    context: [],
  } as RunAgentInput;

  const events = [];
  for await (const event of agent.run(input)) events.push(event);

  const start = events.find((event) => event.type === EventType.TOOL_CALL_START);
  const result = events.find((event) => event.type === EventType.TOOL_CALL_RESULT);
  const response = events
    .filter((event) => event.type === EventType.TEXT_MESSAGE_CONTENT)
    .map((event) => typeof event.delta === "string" ? event.delta : "")
    .join("");
  const resultContent = typeof result?.content === "string" ? result.content : "";

  assert.equal(start?.toolCallName, "calculate");
  assert.match(resultContent, /\"value\":60/);
  assert.equal(response, "Result: (12 + 8) * 3 = 60.");
});
