import OpenAI from "openai";
import { Observable, type Subscriber } from "rxjs";

import { AbstractAgent, type AgentConfig } from "@ag-ui/client";
import {
  EventType,
  type BaseEvent,
  type RunAgentInput,
  type TokenUsage,
} from "@ag-ui/core";

export interface OpenAIAgentConfig extends AgentConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class OpenAIAgent extends AbstractAgent {
  readonly model: string;

  private readonly client: OpenAI;
  private activeRequest?: AbortController;

  constructor({ apiKey, model, baseURL, ...agentConfig }: OpenAIAgentConfig) {
    super(agentConfig);

    if (!apiKey.trim()) {
      throw new Error("OPENAI_API_KEY is required.");
    }

    this.model = model ?? "gpt-4.1-mini";
    this.client = new OpenAI({ apiKey, baseURL });
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      const controller = new AbortController();
      this.activeRequest = controller;

      void this.execute(input, subscriber, controller).finally(() => {
        if (this.activeRequest === controller) {
          this.activeRequest = undefined;
        }
      });

      return () => controller.abort();
    });
  }

  override abortRun(): void {
    this.activeRequest?.abort();
    super.abortRun();
  }

  private async execute(
    input: RunAgentInput,
    subscriber: Subscriber<BaseEvent>,
    controller: AbortController,
  ): Promise<void> {
    try {
      subscriber.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      });

      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          stream: true,
          stream_options: { include_usage: true },
          messages: toOpenAIMessages(input),
        },
        { signal: controller.signal },
      );

      const messageId = crypto.randomUUID();
      let usage: TokenUsage | undefined;

      subscriber.next({
        type: EventType.TEXT_MESSAGE_START,
        messageId,
        role: "assistant",
      });

      for await (const chunk of stream) {
        if (subscriber.closed) {
          return;
        }

        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          subscriber.next({
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: content,
          });
        }

        if (chunk.usage) {
          usage = {
            provider: "openai",
            model: this.model,
            inputTokens: chunk.usage.prompt_tokens,
            outputTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
            cachedInputTokens:
              chunk.usage.prompt_tokens_details?.cached_tokens ?? undefined,
            reasoningTokens:
              chunk.usage.completion_tokens_details?.reasoning_tokens ?? undefined,
          };
        }
      }

      subscriber.next({
        type: EventType.TEXT_MESSAGE_END,
        messageId,
      });
      subscriber.next({
        type: EventType.RUN_FINISHED,
        threadId: input.threadId,
        runId: input.runId,
        outcome: { type: "success" },
        usage: usage ? [usage] : undefined,
      });
      subscriber.complete();
    } catch (error) {
      if (subscriber.closed) {
        return;
      }

      subscriber.next({
        type: EventType.RUN_ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      subscriber.complete();
    }
  }
}

function toOpenAIMessages(
  input: RunAgentInput,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return input.messages.flatMap((message) => {
    if (
      message.role !== "developer" &&
      message.role !== "system" &&
      message.role !== "user" &&
      message.role !== "assistant"
    ) {
      return [];
    }

    return [
      {
        role: message.role,
        content: String(message.content ?? ""),
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
    ];
  });
}
