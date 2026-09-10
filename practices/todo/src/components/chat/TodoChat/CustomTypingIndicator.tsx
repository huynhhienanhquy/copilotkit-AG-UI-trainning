/**
 * Show an animated dots indicator with a text label while the assistant is processing.
 *
 * Uses role="status" so screen readers announce "Copilot is working…" when
 * the indicator appears, and aria-hidden on the decorative dots animation.
 * The indicator is shown only while inProgress is true in CustomMessages;
 * no timer or fake delay is used.
 *
 * When to use: Inside CustomMessages, rendered conditionally when inProgress=true.
 */
export function CustomTypingIndicator() {
  return (
    <div className="todo-chat-typing" role="status">
      <span className="todo-chat-dots" aria-hidden="true"><i /><i /><i /></span>
      <span>Copilot is working…</span>
    </div>
  );
}
