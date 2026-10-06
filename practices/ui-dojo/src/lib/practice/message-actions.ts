import type {
  AssistantMessage,
  Message,
  ToolMessage,
  UserMessage,
} from "@ag-ui/core";

export const ATTACHMENT_REFERENCE_HEADING = "\n\nAttached files:\n";

/** Hide server-only attachment references while editing the human-authored text. */
export function editableUserText(message: UserMessage): string {
  const content =
    typeof message.content === "string"
      ? message.content
      : message.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n");
  const referenceIndex = content.indexOf(ATTACHMENT_REFERENCE_HEADING);
  return (
    referenceIndex >= 0 ? content.slice(0, referenceIndex) : content
  ).trim();
}

function resultHasError(content: string): boolean {
  try {
    const result: unknown = JSON.parse(content);
    if (!result || typeof result !== "object") return false;
    return (
      ("error" in result && Boolean(result.error)) ||
      ("status" in result &&
        typeof result.status === "string" &&
        !["success", "completed", "result"].includes(result.status))
    );
  } catch {
    return false;
  }
}

/** Identify failed or unfinished calls from their paired AG-UI result message. */
export function failedToolCallIds(
  message: AssistantMessage,
  messages: Message[],
): string[] {
  return (message.toolCalls || [])
    .filter((call) => {
      const result = messages.find(
        (candidate): candidate is ToolMessage =>
          candidate.role === "tool" && candidate.toolCallId === call.id,
      );
      return !result || Boolean(result.error) || resultHasError(result.content);
    })
    .map((call) => call.id);
}
