import { describe, expect, it } from "vitest";
import type { AssistantMessage, Message, UserMessage } from "@ag-ui/core";
import { editableUserText, failedToolCallIds } from "./message-actions";

describe("message actions", () => {
  it("shows only human-authored text in the edit form", () => {
    const message: UserMessage = {
      id: "user-1",
      role: "user",
      content:
        "Tell me about Totoro\n\nAttached files:\nnotes.pdf (attachment ID: file-1)",
    };
    expect(editableUserText(message)).toBe("Tell me about Totoro");
  });

  it("detects missing, explicit and serialized tool failures", () => {
    const assistant: AssistantMessage = {
      id: "assistant-1",
      role: "assistant",
      content: "Running tools",
      toolCalls: ["missing", "explicit", "serialized", "successful"].map(
        (id) => ({
          id,
          type: "function" as const,
          function: { name: "test_tool", arguments: "{}" },
        }),
      ),
    };
    const messages: Message[] = [
      assistant,
      {
        id: "tool-explicit",
        role: "tool",
        toolCallId: "explicit",
        content: "failed",
        error: "Network unavailable",
      },
      {
        id: "tool-serialized",
        role: "tool",
        toolCallId: "serialized",
        content: JSON.stringify({ error: "Timed out", status: "call" }),
      },
      {
        id: "tool-success",
        role: "tool",
        toolCallId: "successful",
        content: JSON.stringify({ status: "success" }),
      },
    ];

    expect(failedToolCallIds(assistant, messages)).toEqual([
      "missing",
      "explicit",
      "serialized",
    ]);
  });
});
