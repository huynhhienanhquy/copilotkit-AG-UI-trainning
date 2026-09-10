import { useEffect, useRef } from "react";
import { useChatContext, type MessagesProps } from "@copilotkit/react-ui";
import { useCopilotContext } from "@copilotkit/react-core";
import { ActionExecutionMessage, MessageStatusCode, ResultMessage, TextMessage } from "@copilotkit/runtime-client-gql";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CustomSystemMessage } from "./CustomSystemMessage";
import { CustomUserMessage } from "./CustomUserMessage";
import { CustomTypingIndicator } from "./CustomTypingIndicator";

/**
 * Render the full chat transcript with welcome messages, user bubbles,
 * assistant Markdown, action execution results, and a typing indicator.
 *
 * Handles three message types from CopilotKit:
 *   - TextMessage: user messages are shown in CustomUserMessage bubbles;
 *     assistant messages are rendered as Markdown with safe link targets.
 *     Internal role=system messages are silently dropped.
 *   - ActionExecutionMessage: displayed via the chatComponentsCache render
 *     function (if registered) or a fallback notice; shows "executing",
 *     "inProgress", or "complete" status with error styling on failure.
 *   - ResultMessage: matched to its ActionExecutionMessage by ID to decode
 *     and display the action's outcome.
 *
 * Auto-scrolls to the bottom when new messages arrive, but only if the user
 * is already near the bottom (within 80px). Tracks content version changes
 * from streaming to catch in-place mutations.
 *
 * When to use: As the Messages slot of CopilotPopup in the TodoChat feature.
 *
 * @param messages - The ordered array of chat messages from CopilotKit to render.
 * @param inProgress - Whether the assistant is currently processing; shows the typing indicator.
 * @param children - Additional UI elements injected by the parent (error banners, response controls).
 */
export function CustomMessages({ messages, inProgress, children }: MessagesProps) {
  const { labels } = useChatContext();
  const { chatComponentsCache } = useCopilotContext();
  const scrollArea = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const initial = Array.isArray(labels.initial) ? labels.initial : [labels.initial];
  const results = new Map(messages.filter((message): message is ResultMessage =>
    message instanceof ResultMessage).map((message) => [message.actionExecutionId, message]));
  // Streaming can mutate message content without replacing the array.
  const contentVersion = messages.map((message) =>
    message instanceof TextMessage ? message.content : message.status.code).join("\n");
  useEffect(() => {
    const element = scrollArea.current;
    if (element && nearBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages, contentVersion, inProgress]);

  return (
    <div className="copilotKitMessages todo-chat-messages" ref={scrollArea}
      onScroll={() => {
        const element = scrollArea.current;
        if (element) nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }}>
      <div role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
        {initial.filter(Boolean).map((message, index) =>
          <CustomSystemMessage key={`welcome-${index}`}>{message}</CustomSystemMessage>)}
        {messages.map((message) => {
          if (message instanceof TextMessage) {
            if (message.role === "user") return <CustomUserMessage key={message.id} content={message.content} />;
            // Internal role=system messages are never rendered as user-facing notices.
            if (message.role !== "assistant" || !message.content) return null;
            return <div key={message.id} className="todo-chat-assistant">
              <span className="todo-chat-caption">Copilot</span>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} skipHtml
                components={{
                  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                  img: ({ alt }) => <span>{alt || "Image"}</span>,
                }}>{message.content}</ReactMarkdown>
            </div>;
          }
          if (!(message instanceof ActionExecutionMessage)) return null;
          const resultMessage = results.get(message.id);
          const result: unknown = resultMessage ? ResultMessage.decodeResult(resultMessage.result) : undefined;
          const render = chatComponentsCache.current?.[message.name];
          if (!resultMessage && !inProgress) {
            return <CustomSystemMessage key={message.id}>Task action did not finish. Check the list before retrying.</CustomSystemMessage>;
          }
          const status = resultMessage ? "complete"
            : message.status.code === MessageStatusCode.Pending ? "inProgress" : "executing";
          const content = typeof render === "function"
            ? status === "complete"
              ? render({ status, args: message.arguments, result })
              : render({ status, args: message.arguments, result: undefined })
            : resultMessage ? "Task action finished." : render || "Updating tasks…";
          if (!content) return null;
          const failed = typeof result === "object" && result !== null && "ok" in result && result.ok === false;
          return <CustomSystemMessage key={message.id} tone={failed ? "error" : "info"}>{content}</CustomSystemMessage>;
        })}
      </div>
      {inProgress && <CustomTypingIndicator />}
      <div className="todo-chat-response">{children}</div>
    </div>
  );
}
