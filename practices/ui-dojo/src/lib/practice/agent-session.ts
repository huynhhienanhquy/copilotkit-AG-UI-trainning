import type { AbstractAgent } from "@ag-ui/client";
import type { Message } from "@ag-ui/core";

/**
 * Initialize the SDK's mutable agent at the external-store boundary.
 * AG-UI exposes threadId as a public field, not a setter. Call once per mounted
 * session before enabling send; replacing messages only hydrates display state.
 */
export function initializeAgentSession(agent: AbstractAgent, threadId: string, messages: Message[]): void {
  agent.threadId = threadId;
  agent.setMessages(messages);
}
