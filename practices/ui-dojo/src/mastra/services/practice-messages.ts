import type { Message } from "@ag-ui/core";
import type { MastraDBMessage } from "@mastra/core/agent";

/**
 * Restore persisted Mastra parts as AG-UI messages without invoking a tool.
 * Stable IDs let CopilotKit hydrate and append subsequent turns without duplicates.
 * Completed tool results are emitted beside their calls, including falsy results.
 */
export function restoreMessages(messages: MastraDBMessage[]): Message[] {
  const restored: Message[] = [];
  for (const message of messages) {
    if (message.role === "signal") continue;
    const text = message.content.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n");
    if (message.role !== "assistant") {
      restored.push({ id: message.id, role: message.role, content: text });
      continue;
    }
    const invocations = message.content.parts.filter((part) => part.type === "tool-invocation").map((part) => part.toolInvocation);
    const reasoning = message.content.parts.filter((part) => part.type === "reasoning").map((part) => part.reasoning).join("\n");
    if (reasoning) restored.push({ id: `${message.id}:reasoning`, role: "reasoning", content: reasoning });
    restored.push({
      id: message.id, role: "assistant", content: text,
      ...(invocations.length ? { toolCalls: invocations.map((tool) => ({
        id: tool.toolCallId, type: "function" as const,
        function: { name: tool.toolName, arguments: JSON.stringify(tool.args) },
      })) } : {}),
    });
    for (const tool of invocations) {
      // Resolve historical unfinished calls as interrupted display results so a new run
      // cannot execute an old UI action. A user must explicitly request it again.
      const result = tool.state === "result" ? tool.result ?? null : { error: tool.errorText || "This tool call did not finish. Request it again if needed.", status: tool.state };
      restored.push({ id: `${message.id}:tool:${tool.toolCallId}`, role: "tool", toolCallId: tool.toolCallId,
        content: typeof result === "string" ? result : JSON.stringify(result) });
    }
  }
  return restored;
}
