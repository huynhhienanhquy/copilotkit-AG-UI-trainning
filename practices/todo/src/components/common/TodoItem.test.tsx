import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { useSyncExternalStore } from "react";
import { createTodoStore } from "@/stores/todoStore";
import { TodoItem } from "./TodoItem";

function setup() {
  const store = createTodoStore();
  store.updateTodoList([{ id: "a", text: "Prepare demo", assignedTo: "Linh", isCompleted: false }]);
  function Harness() {
    const todos = useSyncExternalStore(store.subscribe, store.getSnapshot);
    return <ul>{todos.map((todo) => <TodoItem key={todo.id} todo={todo} {...store} />)}</ul>;
  }
  render(<Harness />);
  return { store, user: userEvent.setup() };
}

it("cancels edits without losing the assignee and returns focus to Edit", async () => {
  const { store, user } = setup();
  await user.click(screen.getByRole("button", { name: "Edit Prepare demo" }));
  await user.clear(screen.getByRole("textbox", { name: /Assigned to/ }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(store.getSnapshot()[0].assignedTo).toBe("Linh");
  expect(screen.getByRole("button", { name: "Edit Prepare demo" })).toHaveFocus();
});

it("saves only changed fields while Copilot changes other fields", async () => {
  const { store, user } = setup();
  await user.click(screen.getByRole("button", { name: "Edit Prepare demo" }));
  const text = screen.getByRole("textbox", { name: "Task" });
  await user.clear(text);
  await user.type(text, "  Ship demo  ");
  act(() => { store.updateTodo("a", { assignedTo: "Mai", isCompleted: true }); });
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(store.getSnapshot()[0]).toEqual({ id: "a", text: "Ship demo", assignedTo: "Mai", isCompleted: true });
});

it("rejects empty text, retains the editor, then allows unassigning", async () => {
  const { store, user } = setup();
  await user.click(screen.getByRole("button", { name: "Edit Prepare demo" }));
  const text = screen.getByRole("textbox", { name: "Task" });
  await user.clear(text);
  await user.type(text, "   ");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Task text cannot be empty");
  expect(store.getSnapshot()[0].text).toBe("Prepare demo");
  await user.clear(text);
  await user.type(text, "Updated");
  await user.clear(screen.getByRole("textbox", { name: /Assigned to/ }));
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(store.getSnapshot()[0].assignedTo).toBeUndefined();
});

it("supports toggling and Escape cancellation and deletion while editing", async () => {
  const { store, user } = setup();
  await user.click(screen.getByRole("checkbox"));
  expect(store.getSnapshot()[0].isCompleted).toBe(true);
  await user.click(screen.getByRole("button", { name: "Edit Prepare demo" }));
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Edit Prepare demo" }));
  act(() => { store.deleteTodo("a"); });
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  expect(store.updateTodo("a", { text: "Too late" }).ok).toBe(false);
});
