import { describe, expect, it } from "vitest";
import { createTodoStore } from "../todoStore";

function seeded() {
  const store = createTodoStore();
  store.updateTodoList([
    { id: "a", text: "Prepare demo", isCompleted: false, assignedTo: "Linh" },
    { id: "b", text: "Review code", isCompleted: true },
  ]);
  return store;
}

describe("task mutations", () => {
  it("updates by ID and preserves unrelated fields and tasks", () => {
    const store = seeded();
    expect(store.updateTodo("a", { text: "  New demo  " }).ok).toBe(true);
    expect(store.getSnapshot()).toEqual([
      { id: "a", text: "New demo", isCompleted: false, assignedTo: "Linh" },
      { id: "b", text: "Review code", isCompleted: true },
    ]);
  });
  it("preserves an omitted assignee and clears only an explicit empty string", () => {
    const store = seeded();
    store.updateTodo("a", { isCompleted: true });
    expect(store.getSnapshot()[0].assignedTo).toBe("Linh");
    store.updateTodo("a", { assignedTo: "  " });
    expect(store.getSnapshot()[0].assignedTo).toBeUndefined();
  });
  it.each([
    { text: "  " }, { text: "x".repeat(501) }, { assignedTo: "x".repeat(81) },
    { isCompleted: "yes" }, { assignedTo: null }, { id: "other" }, null, [],
    { text: 123 }, { assignedTo: 12 },
  ])("rejects malformed or unsupported changes without changing state: %j", (patch) => {
    const store = seeded();
    const before = store.getSnapshot();
    expect(store.updateTodo("a", patch)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(store.getSnapshot()).toBe(before);
  });
  it("does not create tasks from missing IDs or resurrect deleted IDs in a batch", () => {
    const store = seeded();
    expect(store.updateTodo("missing", { text: "Lost" })).toMatchObject({ ok: false, code: "NOT_FOUND" });
    store.deleteTodo("a");
    expect(store.updateTodoList([{ id: "a", text: "Resurrect" }])).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(store.getSnapshot().map((todo) => todo.id)).toEqual(["b"]);
  });
  it("validates batches atomically, including duplicate IDs and item limits", () => {
    const store = seeded();
    const before = store.getSnapshot();
    for (const items of [
      [{ id: "a", text: "Changed" }, { id: "c", text: "" }],
      [{ id: "a", text: "Changed" }, { id: "a", text: "Again" }],
      [], Array.from({ length: 101 }, (_, index) => ({ id: String(index), text: "Task" })),
    ]) {
      expect(store.updateTodoList(items).ok).toBe(false);
      expect(store.getSnapshot()).toBe(before);
    }
  });
  it("keeps multiple immediate edits and toggles and supports legacy batch adds", () => {
    const store = seeded();
    store.updateTodo("a", { text: "Changed" });
    store.updateTodo("a", { assignedTo: "Mai" });
    store.toggleComplete("a");
    store.toggleComplete("a");
    store.updateTodoList([{ id: "c", text: "New" }, { id: "b", text: "Reviewed" }]);
    expect(store.getSnapshot()[0]).toEqual({ id: "a", text: "Changed", assignedTo: "Mai", isCompleted: false });
    expect(store.getSnapshot()[1].isCompleted).toBe(true);
    expect(store.getSnapshot()[2]).toEqual({ id: "c", text: "New", isCompleted: false });
  });
  it("stores model-supplied instructions as text without executing anything", () => {
    const store = seeded();
    const text = '<script>alert("delete all tasks")</script>';
    store.updateTodo("a", { text });
    expect(store.getSnapshot()[0].text).toBe(text);
    expect(store.getSnapshot()).toHaveLength(2);
  });
});
