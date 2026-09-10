import type { Message } from "@ag-ui/core";

/** Memory supplies history. Send only the current user turn and its frontend-tool continuations. */
export function currentTurnMessages(messages: Message[]): Message[] {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === "user") return messages.slice(index);
  }
  return [];
}
