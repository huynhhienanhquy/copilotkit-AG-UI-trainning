import { nanoid } from "nanoid";
import type { Todo, TodoPatch, TodoResult } from "@/types/todo";

export const TODO_TEXT_LIMIT = 500;
export const ASSIGNEE_LIMIT = 80;

/** Creates a failed result for invalid input scenarios. */
const invalid = (message: string): TodoResult => ({ ok: false, code: "INVALID_INPUT", message });

/** Creates a failed result when a requested task cannot be found. */
const missing = (): TodoResult => ({
  ok: false, code: "NOT_FOUND",
  message: "This task no longer exists. Refresh your selection and try again.",
});

/** Creates a successful result with a user-facing message. */
const success = (message: string): TodoResult => ({ ok: true, message });

/** Checks whether a value is a plain object (not null or array). */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Validates that an ID is a non-empty string within the allowed length. */
const validId = (id: unknown): id is string =>
  typeof id === "string" && id.trim().length > 0 && id.length <= 128;

/**
 * Parses and validates raw input into a TodoPatch, or returns an error string.
 *
 * @param value - Raw input from UI or Copilot action arguments.
 * @returns A validated TodoPatch if valid, or a human-readable error message.
 */
function parsePatch(value: unknown): TodoPatch | string {
  if (!isRecord(value)) return "Task changes must be an object.";
  if (Object.keys(value).some((key) => !["text", "isCompleted", "assignedTo"].includes(key))) {
    return "Task changes contain an unsupported field.";
  }
  const patch: TodoPatch = {};
  if ("text" in value) {
    if (typeof value.text !== "string" || !value.text.trim()) return "Task text cannot be empty.";
    if (value.text.trim().length > TODO_TEXT_LIMIT) return `Task text must be ${TODO_TEXT_LIMIT} characters or fewer.`;
    patch.text = value.text.trim();
  }
  if ("isCompleted" in value) {
    if (typeof value.isCompleted !== "boolean") return "Completion status must be true or false.";
    patch.isCompleted = value.isCompleted;
  }
  if ("assignedTo" in value) {
    if (typeof value.assignedTo !== "string") return "Assignee must be text; use an empty string to unassign.";
    if (value.assignedTo.trim().length > ASSIGNEE_LIMIT) return `Assignee must be ${ASSIGNEE_LIMIT} characters or fewer.`;
    patch.assignedTo = value.assignedTo.trim() || undefined;
  }
  return patch;
}

/**
 * Creates an isolated todo store for a single list instance.
 * Synchronous mutations let UI and Copilot tool calls share the latest snapshot.
 *
 * @returns An object with subscribe, getSnapshot, and mutation methods.
 */
export function createTodoStore() {
  let todos: Todo[] = [];
  const deletedIds = new Set<string>();
  const listeners = new Set<() => void>();
  const publish = (next: Todo[]) => {
    todos = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => todos,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /**
     * Adds a new task with the given text.
     *
     * @param text - Task description, 1–500 characters.
     * @returns Success message or validation error.
     */
    addTodo(text: string): TodoResult {
      const patch = parsePatch({ text });
      if (typeof patch === "string") return invalid(patch);
      publish([...todos, { id: nanoid(), text: patch.text!, isCompleted: false }]);
      return success("Task added.");
    },
    /**
     * Updates an existing task by ID with the provided fields.
     *
     * @param id - ID of the task to update.
     * @param changes - Partial patch containing text, isCompleted, or assignedTo.
     * @returns Success message, validation error, or NOT_FOUND if the task was deleted.
     */
    updateTodo(id: unknown, changes: unknown): TodoResult {
      if (!validId(id)) return invalid("A valid task ID is required.");
      const patch = parsePatch(changes);
      if (typeof patch === "string") return invalid(patch);
      if (!todos.some((todo) => todo.id === id)) return missing();
      publish(todos.map((todo) => todo.id === id ? { ...todo, ...patch } : todo));
      return success("Task updated.");
    },
    /**
     * Toggles the completion status of a task.
     *
     * @param id - ID of the task to toggle.
     * @returns Success message or NOT_FOUND if the task was deleted.
     */
    toggleComplete(id: string): TodoResult {
      const todo = todos.find((item) => item.id === id);
      if (!todo) return missing();
      publish(todos.map((item) => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
      return success(todo.isCompleted ? "Task reopened." : "Task completed.");
    },
    /**
     * Removes a task from the list and records its ID to prevent resurrection.
     *
     * @param id - ID of the task to delete.
     * @returns Success message, validation error, or NOT_FOUND.
     */
    deleteTodo(id: unknown): TodoResult {
      if (!validId(id)) return invalid("A valid task ID is required.");
      if (!todos.some((todo) => todo.id === id)) return missing();
      deletedIds.add(id);
      publish(todos.filter((todo) => todo.id !== id));
      return success("Task deleted.");
    },
    /**
     * Adds new tasks or updates existing ones in a batch (1–100 items).
     * Validates the full batch atomically; rejects if any item is invalid.
     *
     * @param items - Array of task objects with at least an `id` field.
     * @returns Success message with count, validation error, or NOT_FOUND for deleted IDs.
     */
    updateTodoList(items: unknown): TodoResult {
      if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
        return invalid("Provide between 1 and 100 task items.");
      }
      // Validate the full batch before publishing so invalid model output cannot partially mutate tasks.
      let next = [...todos];
      const seen = new Set<string>();
      for (const item of items) {
        if (!isRecord(item) || !validId(item.id)) return invalid("Every task needs a valid ID.");
        const { id, ...changes } = item;
        if (seen.has(id)) return invalid("Each task ID may appear only once in a batch.");
        seen.add(id);
        if (deletedIds.has(id)) return missing();
        const patch = parsePatch(changes);
        if (typeof patch === "string") return invalid(patch);
        const existing = next.find((todo) => todo.id === id);
        if (existing) {
          next = next.map((todo) => todo.id === id ? { ...todo, ...patch } : todo);
        } else {
          if (!patch.text) return invalid("New tasks must include non-empty text.");
          next.push({ id, text: patch.text, isCompleted: false, ...patch });
        }
      }
      publish(next);
      return success(`${items.length} task${items.length === 1 ? "" : "s"} saved.`);
    },
  };
}

export type TodoStore = ReturnType<typeof createTodoStore>;
