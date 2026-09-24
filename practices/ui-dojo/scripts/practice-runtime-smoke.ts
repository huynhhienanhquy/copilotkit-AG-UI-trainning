import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.PRACTICE_TEST_URL || "http://localhost:4750/practice";
const thread = await (await fetch(`${base}/threads`, { method: "POST" })).json();
const message = { id: randomUUID(), role: "user", content: "Write a detailed 1000-word plot comparison of Ghibli films. Do not call tools." };
const input = { threadId: thread.id, runId: randomUUID(), messages: [message], tools: [], context: [], state: {}, forwardedProps: {} };
const body = JSON.stringify({ method: "agent/run", params: { agentId: "ghibliAgent" }, body: input });
const headers = { "Content-Type": "application/json" };
const controller = new AbortController();
try {
  const running = await fetch(`${base}/copilotkit`, { method: "POST", headers, body, signal: controller.signal });
  assert.equal(running.status, 200);
  const reader = running.body!.getReader();
  const first = await reader.read(); assert(!first.done);
  const overlap = await fetch(`${base}/copilotkit`, { method: "POST", headers, body });
  assert.equal(overlap.status, 409);
  const deletion = await fetch(`${base}/threads/${thread.id}`, { method: "DELETE" });
  assert.equal(deletion.status, 409);
  const stopped = await fetch(`${base}/copilotkit`, { method: "POST", headers,
    body: JSON.stringify({ method: "agent/stop", params: { agentId: "ghibliAgent", threadId: thread.id } }) });
  assert(stopped.ok);
  controller.abort();
  let removed = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(`${base}/threads/${thread.id}`, { method: "DELETE" });
    if (response.status === 204) { removed = true; break; }
    assert.equal(response.status, 409);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert(removed, "Run lease was not released after stop/disconnect");
  assert.equal((await fetch(`${base}/threads/${thread.id}`)).status, 404);
  console.log("PASS: overlapping runs and deletion rejected while streaming; stop/disconnect releases lease; deleted thread remains absent.");
} finally {
  controller.abort();
  await fetch(`${base}/threads/${thread.id}`, { method: "DELETE" });
}
