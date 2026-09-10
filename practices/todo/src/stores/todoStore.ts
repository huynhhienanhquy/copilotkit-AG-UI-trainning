import { nanoid } from "nanoid";
import type { Todo, TodoPatch, TodoResult } from "@/types/todo";

/** Maximum allowed length for task text, enforced by parsePatch and the UI. */
export const TODO_TEXT_LIMIT = 500;

/** Maximum allowed length for assignee names, enforced by parsePatch and the UI. */
export const ASSIGNEE_LIMIT = 80;

/**
 * Build a failed TodoResult for input that does not meet validation rules.
 *
 * Used internally when store methods receive malformed arguments from the UI
 * or Copilot actions, so callers can display a user-friendly error without
 * exposing implementation details.
 *
 * @param message - Human-readable explanation of what went wrong.
 * @returns A TodoResult with ok=false and code INVALID_INPUT.
 */
const invalid = (message: string): TodoResult => ({ ok: false, code: "INVALID_INPUT", message });

/**
 * Build a failed TodoResult for a task ID that no longer exists in the list.
 *
 * Called after a delete or when a Copilot action references an ID that was
 * already removed, preventing accidental resurrection of deleted tasks.
 *
 * @returns A TodoResult with ok=false and code NOT_FOUND.
 */
const missing = (): TodoResult => ({
  ok: false, code: "NOT_FOUND",
  message: "This task no longer exists. Refresh your selection and try again.",
});

/**
 * Build a successful TodoResult with a message to display in the UI feedback area.
 *
 * @param message - Confirmation text shown to the user after a successful mutation.
 * @returns A TodoResult with ok=true.
 */
const success = (message: string): TodoResult => ({ ok: true, message });

/**
 * Check whether a value is a plain object (not null, not an array).
 *
 * Used to guard against unexpected Copilot action payloads before accessing
 * named properties. Returns false for primitives, arrays, and null.
 *
 * @param value - The value to test, typically from JSON-decoded action arguments.
 * @returns True if the value is a non-null, non-array object.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Check whether a value is a valid task ID: a non-empty trimmed string of at most 128 characters.
 *
 * Rejects undefined, numbers, empty strings, and oversized IDs to prevent
 * injection or accidental matching against malformed Copilot output.
 *
 * @param id - The value to validate, typically from action arguments or UI events.
 * @returns True if the value satisfies ID constraints.
 */
const validId = (id: unknown): id is string =>
  typeof id === "string" && id.trim().length > 0 && id.length <= 128;

/**
 * Parse raw input into a TodoPatch, returning a human-readable error string on failure.
 *
 * Validates each present field independently: text must be non-empty and within
 * TODO_TEXT_LIMIT, isCompleted must be a boolean, and assignedTo must be a string
 * within ASSIGNEE_LIMIT. An empty assignedTo is converted to undefined (unassign).
 * Unknown fields cause an immediate rejection to prevent accidental state corruption.
 *
 * @param value - Raw input from UI forms or Copilot action arguments.
 * @returns A validated TodoPatch if all fields pass, or a single error string describing the first failure.
 *
 * @example
 * const result = parsePatch({ text: "Buy milk", isCompleted: true });
 * // result === { text: "Buy milk", isCompleted: true }
 *
 * @example
 * const result = parsePatch({ text: "   " });
 * // result === "Task text cannot be empty."
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
 * Create an isolated todo store for a single list instance.
 *
 * Each call produces an independent store with its own todo array, deleted-ID
 * registry, and listener set. The store exposes a synchronous external-store
 * interface (subscribe / getSnapshot) compatible with React's useSyncExternalStore,
 * plus mutation methods that both the UI and Copilot tool calls can invoke
 * directly. Mutations are synchronous so the latest snapshot is always available
 * without async coordination.
 *
 * Side effects: Each mutation immediately publishes the new state to all
 * subscribed React components.
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
     * Add a new task to the list.
     *
     * Generates a unique ID via nanoid, sets isCompleted to false, and appends
     * the task to the end of the list. The text is trimmed and validated before
     * creation.
     *
     * Side effects: Publishes the updated list to all subscribers.
     *
     * @param text - The task description, 1–500 characters after trimming. Empty or whitespace-only text is rejected.
     * @returns A TodoResult with ok=true on success, or INVALID_INPUT if the text fails validation.
     *
     * @example
     * store.addTodo("Buy groceries");
     * // => { ok: true, message: "Task added." }
     */
    addTodo(text: string): TodoResult {
      const patch = parsePatch({ text });
      if (typeof patch === "string") return invalid(patch);
      publish([...todos, { id: nanoid(), text: patch.text!, isCompleted: false }]);
      return success("Task added.");
    },
    /**
     * Update an existing task by applying a partial patch.
     *
     * Only the fields present in the changes object are modified; all other
     * fields are preserved unchanged. The task is looked up by exact ID match.
     * If the ID does not exist (e.g., it was deleted), NOT_FOUND is returned
     * without creating a new task.
     *
     * Side effects: Publishes the updated list to all subscribers.
     *
     * @param id - The exact ID of the task to update. Must be a non-empty string ≤ 128 chars.
     * @param changes - A partial object with any of: text (1–500 chars), isCompleted (boolean), assignedTo (string, empty to unassign, omit to preserve).
     * @returns A TodoResult: ok=true on success, INVALID_INPUT for bad data, NOT_FOUND if the task was deleted.
     *
     * @example
     * store.updateTodo("abc123", { text: "Updated task", isCompleted: true });
     * // => { ok: true, message: "Task updated." }
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
     * Toggle the completion status of a task.
     *
     * Flips isCompleted between true and false. Returns a contextual message
     * indicating whether the task was completed or reopened.
     *
     * Side effects: Publishes the updated list to all subscribers.
     *
     * @param id - The exact ID of the task to toggle. Must exist in the current list.
     * @returns A TodoResult: ok=true with "Task completed." or "Task reopened.", or NOT_FOUND if the task was deleted.
     *
     * @example
     * store.toggleComplete("abc123");
     * // => { ok: true, message: "Task completed." }
     */
    toggleComplete(id: string): TodoResult {
      const todo = todos.find((item) => item.id === id);
      if (!todo) return missing();
      publish(todos.map((item) => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
      return success(todo.isCompleted ? "Task reopened." : "Task completed.");
    },
    /**
     * Permanently remove a task from the list.
     *
     * The task's ID is added to an internal deletedIds set so that updateTodoList
     * cannot resurrect it with a stale ID from Copilot. This is a one-way
     * operation within the store's lifetime.
     *
     * Side effects: Publishes the filtered list to all subscribers and records the ID in deletedIds.
     *
     * @param id - The exact ID of the task to delete. Must be a valid, existing ID.
     * @returns A TodoResult: ok=true on success, INVALID_INPUT for bad IDs, NOT_FOUND if already removed.
     *
     * @example
     * store.deleteTodo("abc123");
     * // => { ok: true, message: "Task deleted." }
     */
    deleteTodo(id: unknown): TodoResult {
      if (!validId(id)) return invalid("A valid task ID is required.");
      if (!todos.some((todo) => todo.id === id)) return missing();
      deletedIds.add(id);
      publish(todos.filter((todo) => todo.id !== id));
      return success("Task deleted.");
    },
    /**
     * Add new tasks or update existing ones in a single atomic batch (1–100 items).
     *
     * Each item must have a valid ID. If the ID matches an existing task, the
     * provided fields are merged; if the ID is new, a task is created with
     * isCompleted=false and the text field is required. Deleted IDs are rejected
     * to prevent resurrection. The entire batch is validated before any mutation
     * occurs, so a single invalid item rolls back the whole operation.
     *
     * Side effects: Publishes the new list to all subscribers if validation passes.
     *
     * @param items - An array of 1–100 task objects, each with at least an `id` field and optionally text, isCompleted, or assignedTo.
     * @returns A TodoResult: ok=true with item count, INVALID_INPUT for structural or field errors, NOT_FOUND for deleted IDs.
     *
     * @example
     * store.updateTodoList([
     *   { id: "new-1", text: "Write docs" },
     *   { id: "existing-id", isCompleted: true },
     * ]);
     * // => { ok: true, message: "2 tasks saved." }
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
