import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { EventType, type BaseEvent, type RunAgentInput } from "@ag-ui/core";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { WorkspaceStore, type TaskStatus, type ToolRequest } from "./state.js";
import { calculateExpression, getCurrentWeather, type WeatherUnits } from "./tools.js";

export interface AgentConfig {
  apiKey?: string;
  demoMode: boolean;
  model: string;
}

interface PendingToolCall {
  id: string;
  name: string;
  arguments: string;
}

type AgentToolRequest =
  | ToolRequest
  | { name: "get_weather"; arguments: { location: string; units?: WeatherUnits } }
  | { name: "calculate"; arguments: { expression: string } };

interface ToolExecutionResult {
  message: string;
  data?: unknown;
  state: ReturnType<WorkspaceStore["get"]>;
  stateChanged: boolean;
}

const SYSTEM_PROMPT = `You are Workspace Copilot, a concise and proactive task-management assistant.
Reply in the user's language and use tools to update the workspace.
- Use upsert_task when the user wants to create, update, or complete a task.
- Use set_focus when the user wants to select the primary objective.
- Use clear_completed when the user wants to remove completed tasks.
- Use get_weather for current weather conditions in a named location.
- Use calculate for arithmetic. Never calculate an expression mentally when the tool can do it.
After using a tool, briefly summarize the change. Never invent state; server state is the source of truth.`;

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "upsert_task",
      description: "Create a task or update an existing task in the shared workspace.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing task id, when known." },
          title: { type: "string" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_focus",
      description: "Set the workspace's current focus.",
      parameters: {
        type: "object",
        properties: { focus: { type: "string" } },
        required: ["focus"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_completed",
      description: "Remove every completed task from the workspace.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather conditions for a city or named location.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City or location, optionally followed by a country or region.",
          },
          units: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "Temperature unit. Defaults to celsius.",
          },
        },
        required: ["location"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Safely evaluate arithmetic with +, -, *, /, %, decimals, and parentheses.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The arithmetic expression to evaluate, for example (12 + 8) * 3.",
          },
        },
        required: ["expression"],
        additionalProperties: false,
      },
    },
  },
];

export class WorkspaceAgent {
  private readonly client?: OpenAI;

  constructor(
    private readonly store: WorkspaceStore,
    private readonly config: AgentConfig,
  ) {
    if (!config.demoMode && config.apiKey) this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async *run(input: RunAgentInput): AsyncGenerator<BaseEvent> {
    const threadId = input.threadId || randomUUID();
    const runId = input.runId || randomUUID();
    const state = this.store.get(threadId, input.state);

    yield event(EventType.RUN_STARTED, { threadId, runId });
    yield event(EventType.STATE_SNAPSHOT, { snapshot: state });

    try {
      if (this.config.demoMode || !this.client) {
        yield* this.runDemo(input, threadId);
      } else {
        yield* this.runWithOpenAI(input, threadId);
      }
      yield event(EventType.RUN_FINISHED, {
        threadId,
        runId,
        result: { state: this.store.get(threadId) },
      });
    } catch (error) {
      yield event(EventType.RUN_ERROR, {
        message: error instanceof Error ? error.message : String(error),
        code: "AGENT_RUN_FAILED",
      });
    }
  }

  private async *runWithOpenAI(input: RunAgentInput, threadId: string): AsyncGenerator<BaseEvent> {
    const messages = toOpenAIMessages(input, this.store.get(threadId));

    for (let round = 1; round <= 5; round += 1) {
      const stepName = `model-round-${round}`;
      yield event(EventType.STEP_STARTED, { stepName });

      const stream = await this.client!.chat.completions.create({
        model: this.config.model,
        messages,
        tools,
        tool_choice: "auto",
        stream: true,
      });

      const assistantMessageId = randomUUID();
      let textStarted = false;
      let fullText = "";
      const pending = new Map<number, PendingToolCall>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          if (!textStarted) {
            textStarted = true;
            yield event(EventType.TEXT_MESSAGE_START, {
              messageId: assistantMessageId,
              role: "assistant",
            });
          }
          fullText += delta.content;
          yield event(EventType.TEXT_MESSAGE_CONTENT, {
            messageId: assistantMessageId,
            delta: delta.content,
          });
        }

        for (const fragment of delta.tool_calls ?? []) {
          let current = pending.get(fragment.index);
          if (!current) {
            current = {
              id: fragment.id ?? randomUUID(),
              name: fragment.function?.name ?? "",
              arguments: "",
            };
            pending.set(fragment.index, current);
            yield event(EventType.TOOL_CALL_START, {
              toolCallId: current.id,
              toolCallName: current.name,
              parentMessageId: assistantMessageId,
            });
          } else {
            if (fragment.id) current.id = fragment.id;
            if (fragment.function?.name) current.name += fragment.function.name;
          }

          if (fragment.function?.arguments) {
            current.arguments += fragment.function.arguments;
            yield event(EventType.TOOL_CALL_ARGS, {
              toolCallId: current.id,
              delta: fragment.function.arguments,
            });
          }
        }
      }

      if (textStarted) yield event(EventType.TEXT_MESSAGE_END, { messageId: assistantMessageId });
      for (const call of pending.values()) {
        yield event(EventType.TOOL_CALL_END, { toolCallId: call.id });
      }
      yield event(EventType.STEP_FINISHED, { stepName });

      if (pending.size === 0) return;

      messages.push({
        role: "assistant",
        content: fullText || null,
        tool_calls: [...pending.values()].map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: call.arguments },
        })),
      });

      for (const call of pending.values()) {
        const result = await this.executeTool(threadId, call);
        const content = serializeToolResult(result);
        yield event(EventType.TOOL_CALL_RESULT, {
          messageId: randomUUID(),
          toolCallId: call.id,
          content,
          role: "tool",
        });
        if (result.stateChanged) {
          yield event(EventType.STATE_SNAPSHOT, { snapshot: result.state });
        }
        messages.push({ role: "tool", tool_call_id: call.id, content });
      }
    }

    throw new Error("The agent exceeded the five-round tool-call limit.");
  }

  private async *runDemo(input: RunAgentInput, threadId: string): AsyncGenerator<BaseEvent> {
    const text = getLastUserText(input) || "Hello";
    const action = inferDemoAction(text, this.store.get(threadId));
    yield event(EventType.STEP_STARTED, { stepName: "demo-model" });

    if (action) {
      const toolCallId = randomUUID();
      const serialized = JSON.stringify(action.arguments);
      yield event(EventType.TOOL_CALL_START, {
        toolCallId,
        toolCallName: action.name,
      });
      yield event(EventType.TOOL_CALL_ARGS, { toolCallId, delta: serialized });
      yield event(EventType.TOOL_CALL_END, { toolCallId });

      const result = await this.executeTool(threadId, {
        id: toolCallId,
        name: action.name,
        arguments: serialized,
      });
      yield event(EventType.TOOL_CALL_RESULT, {
        messageId: randomUUID(),
        toolCallId,
        content: serializeToolResult(result),
        role: "tool",
      });
      if (result.stateChanged) {
        yield event(EventType.STATE_SNAPSHOT, { snapshot: result.state });
      }
      yield event(EventType.STEP_FINISHED, { stepName: "demo-model" });
      yield* streamText(
        result.stateChanged
          ? `${result.message} Shared state was synchronized through AG-UI.`
          : result.message,
      );
      return;
    }

    yield event(EventType.STEP_FINISHED, { stepName: "demo-model" });
    const state = this.store.get(threadId);
    const summary = state.tasks.length
      ? `The workspace has ${state.tasks.length} task(s). Current focus is “${state.focus}”.`
      : "The workspace does not have any tasks yet.";
    yield* streamText(
      `${summary}\n\nYou are running in demo mode. Try “Weather in Bangkok”, “Calculate (12 + 8) * 3”, or add OPENAI_API_KEY to chat with a real model.`,
    );
  }

  private async executeTool(threadId: string, call: PendingToolCall): Promise<ToolExecutionResult> {
    let args: unknown;
    try {
      args = JSON.parse(call.arguments || "{}");
    } catch {
      throw new Error(`Tool ${call.name} received invalid JSON.`);
    }

    if (call.name === "upsert_task") {
      const value = args as { id?: string; title?: string; status?: TaskStatus };
      const result = this.store.execute(threadId, {
        name: "upsert_task",
        arguments: { id: value.id, title: value.title ?? "", status: value.status },
      });
      return { ...result, stateChanged: true };
    }
    if (call.name === "set_focus") {
      const result = this.store.execute(threadId, {
        name: "set_focus",
        arguments: { focus: String((args as { focus?: unknown }).focus ?? "") },
      });
      return { ...result, stateChanged: true };
    }
    if (call.name === "clear_completed") {
      const result = this.store.execute(threadId, { name: "clear_completed", arguments: {} });
      return { ...result, stateChanged: true };
    }
    if (call.name === "calculate") {
      const expression = String((args as { expression?: unknown }).expression ?? "");
      const value = calculateExpression(expression);
      return {
        message: `Result: ${expression} = ${value}.`,
        data: { expression, value },
        state: this.store.get(threadId),
        stateChanged: false,
      };
    }
    if (call.name === "get_weather") {
      const value = args as { location?: unknown; units?: unknown };
      const location = String(value.location ?? "");
      const units: WeatherUnits = value.units === "fahrenheit" ? "fahrenheit" : "celsius";
      const weather = await getCurrentWeather(location, units);
      return {
        message: `Current weather in ${weather.location}: ${weather.condition}, ${weather.temperature}${weather.units.temperature} (feels like ${weather.apparentTemperature}${weather.units.temperature}), humidity ${weather.relativeHumidity}%, wind ${weather.windSpeed} ${weather.units.windSpeed}.`,
        data: weather,
        state: this.store.get(threadId),
        stateChanged: false,
      };
    }
    throw new Error(`Unsupported tool: ${call.name}`);
  }
}

function event(type: EventType, payload: Record<string, unknown>): BaseEvent {
  return { type, timestamp: Date.now(), ...payload } as BaseEvent;
}

function serializeToolResult(result: ToolExecutionResult): string {
  return JSON.stringify({
    message: result.message,
    ...(result.data === undefined ? {} : { data: result.data }),
    ...(result.stateChanged ? { state: result.state } : {}),
  });
}

async function* streamText(content: string): AsyncGenerator<BaseEvent> {
  const messageId = randomUUID();
  yield event(EventType.TEXT_MESSAGE_START, { messageId, role: "assistant" });
  const chunks = content.match(/[\s\S]{1,10}/gu) ?? [content];
  for (const chunk of chunks) {
    yield event(EventType.TEXT_MESSAGE_CONTENT, { messageId, delta: chunk });
    await new Promise((resolve) => setTimeout(resolve, 24));
  }
  yield event(EventType.TEXT_MESSAGE_END, { messageId });
}

function toOpenAIMessages(input: RunAgentInput, state: unknown): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nCurrent shared state:\n${JSON.stringify(state)}` },
  ];

  for (const message of input.messages ?? []) {
    if (message.role === "user" || message.role === "system" || message.role === "developer") {
      if (typeof message.content === "string") result.push({ role: message.role, content: message.content });
    } else if (message.role === "assistant") {
      result.push({ role: "assistant", content: typeof message.content === "string" ? message.content : "" });
    }
  }
  return result;
}

function getLastUserText(input: RunAgentInput): string {
  const message = [...(input.messages ?? [])].reverse().find((item) => item.role === "user");
  return message && typeof message.content === "string" ? message.content.trim() : "";
}

function inferDemoAction(text: string, state: { tasks: Array<{ id: string; title: string }> }): AgentToolRequest | null {
  const normalized = text.toLocaleLowerCase();

  const weatherMatch = text.match(/(?:weather|temperature)(?:\s+(?:in|for|at))?\s+(.+?)[?.!]*$/iu);
  if (weatherMatch?.[1]) {
    const location = weatherMatch[1]
      .replace(/\s+(?:in\s+)?(?:celsius|fahrenheit|°c|°f)$/iu, "")
      .trim();
    return {
      name: "get_weather",
      arguments: {
        location,
        units: /(?:fahrenheit|°f)\b/iu.test(text) ? "fahrenheit" : "celsius",
      },
    };
  }

  const calculatorMatch = text.match(/^(?:calculate|compute|what\s+is)\s+(.+?)[?=]*$/iu);
  if (calculatorMatch?.[1]) {
    return {
      name: "calculate",
      arguments: { expression: calculatorMatch[1].trim() },
    };
  }

  if (/(?:clear|remove|delete)/u.test(normalized) && /(?:completed|done)/u.test(normalized)) {
    return { name: "clear_completed", arguments: {} };
  }

  const focusMatch = text.match(/(?:focus|objective)(?:\s+is|\s+on|\s*:)\s*(.+)$/iu);
  if (focusMatch?.[1]) return { name: "set_focus", arguments: { focus: focusMatch[1].trim() } };

  if (/(?:complete|completed|finish|finished|done)/u.test(normalized)) {
    const referenced = state.tasks.find((task) => normalized.includes(task.title.toLocaleLowerCase()));
    const title = referenced?.title ?? text.replace(/complete|completed|finish|finished|done/giu, "").trim();
    if (title) {
      return {
        name: "upsert_task",
        arguments: { id: referenced?.id, title, status: "done" },
      };
    }
  }

  const createMatch = text.match(/(?:create|add)(?:\s+(?:a|new|task))*\s*[:：]?\s*(.+)$/iu);
  if (createMatch?.[1]) {
    return { name: "upsert_task", arguments: { title: createMatch[1].trim(), status: "todo" } };
  }
  return null;
}
