import { useState, useSyncExternalStore } from "react";
import { createTodoStore } from "@/stores/todoStore";

/**
 * Provide the current todo list and store mutation methods to a React component tree.
 *
 * Creates one isolated store per component mount via useState. The store is
 * subscribed through useSyncExternalStore, so React automatically re-renders
 * when any mutation publishes a new snapshot. This hook is the single source
 * of truth for both the UI and the Copilot actions (via useTodoCopilot).
 *
 * When to use: Any component that needs to read or mutate the todo list.
 *
 * @returns An object containing the reactive `todos` array and the `store`
 *   object with methods: addTodo, updateTodo, toggleComplete, deleteTodo, updateTodoList.
 *
 * @example
 * const { todos, store } = useTodos();
 * store.addTodo("Buy milk");
 */
export function useTodos() {
  const [store] = useState(createTodoStore);
  const todos = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { todos, store };
}
