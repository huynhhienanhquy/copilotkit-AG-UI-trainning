/**
 * Renders a user-authored chat message in a styled bubble with a "You" caption.
 *
 * @param content - The raw text content of the user message.
 */
export function CustomUserMessage({ content }: { content: string }) {
  return <div className="todo-chat-user"><span className="todo-chat-caption">You</span><p>{content}</p></div>;
}
