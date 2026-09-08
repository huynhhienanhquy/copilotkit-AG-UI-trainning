import { act, renderHook } from "@testing-library/react";
import { CopilotKit, useCopilotContext } from "@copilotkit/react-core";
import { expect, it } from "vitest";
import { useTodos } from "../useTodos";
import { useTodoCopilot } from "../useTodoCopilot";

it("registers real Copilot actions and shares updates with readable context", async () => {
  const { result } = renderHook(() => {
    const state = useTodos();
    useTodoCopilot(state.todos, state.store);
    return { ...state, copilot: useCopilotContext() };
  }, { wrapper: ({ children }) => <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit> });
  const action = (name: string) => Object.values(result.current.copilot.actions).find((item) => item.name === name)!;
  await act(async () => {
    await action("updateTodoList").handler?.({ items: [{ id: "a", text: "Demo", assignedTo: "Linh" }] });
  });
  expect(result.current.todos[0].text).toBe("Demo");
  await act(async () => { await action("updateTodo").handler?.({ id: "a", isCompleted: true }); });
  expect(result.current.todos[0]).toMatchObject({ assignedTo: "Linh", isCompleted: true });
  act(() => { result.current.store.updateTodo("a", { text: "Edited on UI" }); });
  expect(result.current.copilot.getContextString([], ["global"])).toContain("Edited on UI");
  await act(async () => { await action("deleteTodo").handler?.({ id: "a" }); });
  expect(result.current.todos).toEqual([]);
  let response: unknown;
  await act(async () => { response = await action("updateTodo").handler?.({ id: "a", text: "Resurrect" }); });
  expect(response).toMatchObject({ ok: false, code: "NOT_FOUND" });
});
