import { useState, useSyncExternalStore } from "react";
import { createTodoStore } from "@/stores/todoStore";

/**
 * Provides the current todo list and store methods for a component tree.
 * Creates one store per mount; useSyncExternalStore ensures React re-renders on every mutation.
 *
 * @returns The reactive todo array and the store with mutation methods.
 */
export function useTodos() {
  const [store] = useState(createTodoStore);
  const todos = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { todos, store };
}
