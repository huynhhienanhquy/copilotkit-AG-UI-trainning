import { useId, useRef, useState } from "react";
import type { Todo, TodoPatch, TodoResult } from "@/types/todo";
import { ASSIGNEE_LIMIT, TODO_TEXT_LIMIT } from "@/stores/todoStore";

interface TodoItemProps {
  todo: Todo;
  toggleComplete: (id: string) => TodoResult;
  deleteTodo: (id: string) => TodoResult;
  updateTodo: (id: string, patch: TodoPatch) => TodoResult;
}

/**
 * Displays a single task with toggle, edit, delete, and inline editor for text and assignee.
 *
 * @param todo - The task to render.
 * @param toggleComplete - Callback to toggle the completion status by ID.
 * @param deleteTodo - Callback to remove the task by ID.
 * @param updateTodo - Callback to apply a partial patch to the task by ID.
 */
export function TodoItem({ todo, toggleComplete, deleteTodo, updateTodo }: TodoItemProps) {
  const [draft, setDraft] = useState<{
    text: string; assignedTo: string; originalText: string; originalAssignee: string;
  } | null>(null);
  const [error, setError] = useState("");
  const editButton = useRef<HTMLButtonElement>(null);
  const id = useId();

  /** Clears the draft state and returns focus to the Edit button. */
  function finishEditing() {
    setDraft(null);
    setError("");
    editButton.current?.focus();
  }
  /**
   * Validates the draft and applies only changed fields to the task.
   * Keeps the draft open if validation fails so the user can correct it.
   */
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.text.trim()) { setError("Task text cannot be empty."); return; }
    const patch: TodoPatch = {};
    if (draft.text.trim() !== draft.originalText) patch.text = draft.text.trim();
    if (draft.assignedTo.trim() !== draft.originalAssignee) patch.assignedTo = draft.assignedTo.trim();
    const result = updateTodo(todo.id, patch);
    if (!result.ok) { setError(result.message); return; }
    finishEditing();
  }
  /** Displays the error message from a failed result, or clears it on success. */
  function report(result: TodoResult) {
    setError(result.ok ? "" : result.message);
  }

  return (
    <li className="todo-item">
      <div className="todo-item-row">
        <input type="checkbox" className="todo-checkbox" checked={todo.isCompleted}
          aria-label={`Mark ${todo.text} as ${todo.isCompleted ? "incomplete" : "complete"}`}
          onChange={() => report(toggleComplete(todo.id))} />
        <div className="todo-item-content">
          <p className={todo.isCompleted ? "todo-text todo-completed" : "todo-text"}>{todo.text}</p>
          {todo.assignedTo && <span className="todo-assignee">Assigned to {todo.assignedTo}</span>}
        </div>
        <div className="todo-item-actions">
          <button ref={editButton} type="button" className="todo-button todo-button-secondary"
            aria-label={`Edit ${todo.text}`} aria-expanded={draft !== null} aria-controls={`${id}-editor`}
            onClick={() => {
              if (draft) return;
              setError("");
              setDraft({ text: todo.text, assignedTo: todo.assignedTo || "",
                originalText: todo.text, originalAssignee: todo.assignedTo || "" });
            }}>Edit</button>
          <button type="button" className="todo-button todo-button-danger" aria-label={`Delete ${todo.text}`}
            onClick={() => report(deleteTodo(todo.id))}>Delete</button>
        </div>
      </div>
      {draft && (
        <form id={`${id}-editor`} className="todo-editor" onSubmit={save} noValidate
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.nativeEvent.isComposing) { event.stopPropagation(); finishEditing(); }
            if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
          }}>
          <label htmlFor={`${id}-text`}>Task <span aria-hidden="true">*</span></label>
          <input id={`${id}-text`} className="todo-field" value={draft.text} required maxLength={TODO_TEXT_LIMIT}
            ref={(element) => {
              if (element && !element.dataset.focused) { element.focus(); element.dataset.focused = "true"; }
            }}
            aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => { setDraft({ ...draft, text: event.target.value }); setError(""); }} />
          <label htmlFor={`${id}-assignee`}>Assigned to <span className="todo-muted">(optional)</span></label>
          <input id={`${id}-assignee`} className="todo-field" value={draft.assignedTo} maxLength={ASSIGNEE_LIMIT}
            placeholder="Leave empty to unassign" onChange={(event) => setDraft({ ...draft, assignedTo: event.target.value })} />
          <div className="todo-editor-actions">
            <button className="todo-button todo-button-primary" type="submit">Save</button>
            <button className="todo-button todo-button-secondary" type="button" onClick={finishEditing}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p id={`${id}-error`} role="alert" className="todo-error">{error}</p>}
    </li>
  );
}
