import { useRef, useState } from "react";
import { TodoItem } from "@/components/common/TodoItem";
import { useTodos } from "@/hooks/useTodos";
import { useTodoCopilot } from "@/hooks/useTodoCopilot";
import { TODO_TEXT_LIMIT } from "@/stores/todoStore";
import type { TodoResult } from "@/types/todo";

/** Renders the full task list with an add form, progress counter, and per-item controls. */
export function TodoList() {
  const { todos, store } = useTodos();
  useTodoCopilot(todos, store);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<TodoResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const completed = todos.filter((todo) => todo.isCompleted).length;
  function report(result: TodoResult) { setFeedback(result); return result; }

  return (
    <section aria-labelledby="tasks-title" className="todo-list">
      <div className="todo-list-heading">
        <h2 id="tasks-title">Your tasks</h2>
        <span className="todo-muted">{completed} of {todos.length} completed</span>
      </div>
      <form className="todo-add-form" noValidate onSubmit={(event) => {
        event.preventDefault();
        const result = report(store.addTodo(input));
        if (result.ok) { setInput(""); inputRef.current?.focus(); }
      }}>
        <label className="sr-only" htmlFor="new-task">New task</label>
        <input ref={inputRef} id="new-task" className="todo-field" value={input} required maxLength={TODO_TEXT_LIMIT}
          placeholder="What needs to get done?" onChange={(event) => setInput(event.target.value)}
          aria-invalid={feedback?.ok === false} aria-describedby="task-feedback"
          onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} />
        <button className="todo-button todo-button-primary" type="submit" disabled={!input.trim()}>Add task</button>
      </form>
      <p id="task-feedback" className={feedback && !feedback.ok ? "todo-error todo-feedback" : "todo-muted todo-feedback"} role="status">
        {feedback?.message || "Add a task yourself, or ask Copilot to help."}
      </p>
      {todos.length === 0 ? (
        <div className="todo-empty"><p>No tasks yet</p><span>Start with one small thing you want to finish.</span></div>
      ) : (
        <ul className="todo-items">
          {todos.map((todo) => <TodoItem key={todo.id} todo={todo}
            toggleComplete={(id) => report(store.toggleComplete(id))}
            updateTodo={(id, patch) => report(store.updateTodo(id, patch))}
            deleteTodo={(id) => {
              const result = report(store.deleteTodo(id));
              if (result.ok) inputRef.current?.focus();
              return result;
            }} />)}
        </ul>
      )}
    </section>
  );
}
