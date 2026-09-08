import type { ReactNode } from "react";

/**
 * Displays a system-level notice or error in the chat with an appropriate caption and role.
 *
 * @param children - The message content to display.
 * @param tone - Visual tone: "info" for notices, "error" for failures (sets role="alert").
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
