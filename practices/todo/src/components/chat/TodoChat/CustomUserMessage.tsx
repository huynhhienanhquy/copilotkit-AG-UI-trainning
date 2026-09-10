/**
 * Render a user-authored chat message in a styled bubble with a "You" caption.
 *
 * The content is displayed as plain text (no Markdown rendering) to prevent
 * the user from injecting markup that could be confused with assistant output.
 * This is a defense-in-depth measure against indirect prompt injection via
 * user-supplied content that might appear in logs or shared transcripts.
 *
 * When to use: Inside CustomMessages for each TextMessage with role="user".
 *
 * @param content - The raw text content of the user message, displayed verbatim.
 */
export function CustomUserMessage({ content }: { content: string }) {
  return <div className="todo-chat-user"><span className="todo-chat-caption">You</span><p>{content}</p></div>;
}
