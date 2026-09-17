import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceStore } from "./state.js";

test("server tools mutate state and isolate threads", () => {
  const store = new WorkspaceStore();
  const created = store.execute("thread-a", {
    name: "upsert_task",
    arguments: { title: "Ship AG-UI practice" },
  });

  assert.equal(created.state.tasks.length, 1);
  assert.equal(created.state.tasks[0]?.status, "todo");
  assert.equal(store.get("thread-b").tasks.length, 0);

  const completed = store.execute("thread-a", {
    name: "upsert_task",
    arguments: { title: "Ship AG-UI practice", status: "done" },
  });
  assert.equal(completed.state.tasks[0]?.status, "done");

  const cleared = store.execute("thread-a", { name: "clear_completed", arguments: {} });
  assert.equal(cleared.state.tasks.length, 0);
});

