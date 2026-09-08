export function CustomTypingIndicator() {
  return (
    <div className="todo-chat-typing" role="status">
      <span className="todo-chat-dots" aria-hidden="true"><i /><i /><i /></span>
      <span>Copilot is working…</span>
    </div>
  );
}
