import type { ReactNode } from "react";

/**
 * Display a system-level notice or error in the chat with an appropriate
 * caption and ARIA role for screen readers.
 *
 * Used for three purposes:
 *   1. Welcome messages shown when the chat first opens (tone="info").
 *   2. Action status notices during and after task mutations (tone="info").
 *   3. Error banners for network failures, timeouts, or validation errors (tone="error").
 *
 * When tone="error", the element gets role="alert" so assistive technology
 * announces it immediately without requiring focus.
 *
 * When to use: Inside CustomMessages for any non-user, non-assistant notice.
 *
 * @param children - The message content to display (text or simple elements).
 * @param tone - Visual tone: "info" for neutral notices, "error" for failures (sets role="alert").
 */
export function CustomSystemMessage({ children, tone = "info" }: {
  children: ReactNode; tone?: "info" | "error";
}) {
  return (
    <div className={`todo-chat-notice todo-chat-notice-${tone}`} role={tone === "error" ? "alert" : undefined}>
      <span className="todo-chat-caption">{tone === "error" ? "Something went wrong" : "Todo Copilot"}</span>
      <div>{children}</div>
    </div>
  );
}
