import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useTodos } from "../useTodos";

it("keeps UI snapshots current across same-tick updates in StrictMode", () => {
  const { result } = renderHook(useTodos, { wrapper: StrictMode });
  act(() => {
    result.current.store.addTodo("Task");
    const id = result.current.store.getSnapshot()[0].id;
    result.current.store.updateTodo(id, { assignedTo: "Linh" });
    result.current.store.toggleComplete(id);
    result.current.store.updateTodo(id, { text: "Edited" });
  });
  expect(result.current.todos).toMatchObject([{ text: "Edited", assignedTo: "Linh", isCompleted: true }]);
});

it("isolates task state between list instances", () => {
  const first = renderHook(useTodos);
  const second = renderHook(useTodos);
  act(() => first.result.current.store.addTodo("Private to first list"));
  expect(second.result.current.todos).toEqual([]);
});
