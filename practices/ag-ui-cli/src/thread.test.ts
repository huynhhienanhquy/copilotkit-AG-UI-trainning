import assert from "node:assert/strict";
import test from "node:test";

import { ensureMemoryThread, type ThreadMemory } from "./thread.js";

test("creates a missing thread once before the first agent run", async () => {
  const threads = new Map<string, { id: string; resourceId: string }>();
  let createCalls = 0;
  const memory: ThreadMemory = {
    async getThreadById({ threadId, resourceId }) {
      const thread = threads.get(threadId) ?? null;
      return thread?.resourceId === resourceId ? thread : null;
    },
    async createThread({ threadId, resourceId }) {
      assert.ok(threadId);
      createCalls += 1;
      const thread = { id: threadId, resourceId };
      threads.set(threadId, thread);
      return thread;
    },
  };

  await ensureMemoryThread({
    memory,
    threadId: "thread-test",
    resourceId: "resource-test",
  });
  await ensureMemoryThread({
    memory,
    threadId: "thread-test",
    resourceId: "resource-test",
  });

  assert.equal(createCalls, 1);
});
