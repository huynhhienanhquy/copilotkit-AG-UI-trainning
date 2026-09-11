import { AbstractAgent } from "@ag-ui/client";

import {
  EventType,
  type RunAgentInput,
  type BaseEvent,
} from "@ag-ui/core";

import { Observable } from "rxjs";
import { randomUUID } from "node:crypto";

import {
  calculator,
  getCurrentTime,
  openUrl,
  updateTaskState,
} from "./tools/index.js";

import { initialState } from "./state.js";

export class CustomAgent extends AbstractAgent {
  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      const messageId = randomUUID();

      // =========================
      // RUN STARTED
      // =========================

      subscriber.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      });

      // =========================
      // INITIAL STATE
      // =========================

      subscriber.next({
        type: EventType.STATE_SNAPSHOT,
        snapshot: {
          ...initialState,
          status: "thinking",
          task: "Processing user request",
        },
      });

      // =========================
      // GET USER INPUT
      // =========================

      const lastMessage = input.messages.at(-1);

      let userInput = "";

      if (
        lastMessage &&
        lastMessage.role === "user" &&
        typeof lastMessage.content === "string"
      ) {
        userInput = lastMessage.content.trim();
      }

      // =========================
      // STATE -> WORKING
      // =========================

      subscriber.next({
        type: EventType.STATE_DELTA,
        delta: [
          {
            op: "replace",
            path: "/status",
            value: "working",
          },
          {
            op: "replace",
            path: "/progress",
            value: 25,
          },
        ],
      });

      // =========================
      // TOOL ROUTING
      // =========================

      let response: string;

      try {
        const lowerInput = userInput.toLowerCase();

        // CALCULATOR
        if (
          lowerInput.startsWith("calc") ||
          lowerInput.startsWith("calculator")
        ) {
          const expression = userInput
            .replace(/^calculator\s*/i, "")
            .replace(/^calc\s*/i, "")
            .trim();

          const match = expression.match(
            /^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$/,
          );

          if (!match) {
            response =
              "Invalid calculator format. Example: calculator 4*33";
          } else {
            const a = Number(match[1]);
            const operator = match[2];
            const b = Number(match[3]);

            let operation:
              | "add"
              | "subtract"
              | "multiply"
              | "divide";

            switch (operator) {
              case "+":
                operation = "add";
                break;

              case "-":
                operation = "subtract";
                break;

              case "*":
                operation = "multiply";
                break;

              case "/":
                operation = "divide";
                break;

              default:
                throw new Error("Unsupported operator");
            }

            const result = calculator(
              a,
              b,
              operation,
            );

            response =
              `Calculator result: ${a} ${operator} ${b} = ${result}`;
          }
        }

        // CURRENT TIME
        else if (lowerInput.includes("time")) {
          const time = getCurrentTime();

          response = `Current time: ${time}`;
        }

        // OPEN URL
        else if (lowerInput.startsWith("open ")) {
          const url = userInput
            .slice(5)
            .trim();

          const result = openUrl(url);

          response = result.success
            ? `URL validated: ${result.url}`
            : `Open URL failed: ${result.error}`;
        }

        // TASK
        else if (lowerInput.startsWith("task")) {
          const state = updateTaskState(
            "Learn AG-UI State Sync",
            50,
          );

          response =
            `Task updated: ${state.task}, progress: ${state.progress}%`;
        }

        // DEFAULT
        else {
          response =
            "Available commands: calculator 4*33, calc 10/2, time, open <url>, task";
        }
      } catch (error) {
        response =
          error instanceof Error
            ? `Tool error: ${error.message}`
            : "Unknown tool error.";
      }

      // =========================
      // STATE -> 50%
      // =========================

      subscriber.next({
        type: EventType.STATE_DELTA,
        delta: [
          {
            op: "replace",
            path: "/progress",
            value: 50,
          },
        ],
      });

      // =========================
      // MESSAGE START
      // =========================

      subscriber.next({
        type: EventType.TEXT_MESSAGE_START,
        messageId,
        role: "assistant",
      });

      // =========================
      // MANUAL STREAMING
      // =========================

      const words = response.split(" ");
      let index = 0;

      const timer = setInterval(() => {
        if (index < words.length) {
          subscriber.next({
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: `${words[index]} `,
          });

          const progress =
            50 +
            Math.floor(
              ((index + 1) / words.length) * 40,
            );

          subscriber.next({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "replace",
                path: "/progress",
                value: progress,
              },
            ],
          });

          index++;
          return;
        }

        clearInterval(timer);

        // =========================
        // MESSAGE END
        // =========================

        subscriber.next({
          type: EventType.TEXT_MESSAGE_END,
          messageId,
        });

        // =========================
        // STATE COMPLETED
        // =========================

        subscriber.next({
          type: EventType.STATE_DELTA,
          delta: [
            {
              op: "replace",
              path: "/status",
              value: "completed",
            },
            {
              op: "replace",
              path: "/progress",
              value: 100,
            },
            {
              op: "replace",
              path: "/result",
              value: response,
            },
          ],
        });

        // =========================
        // RUN FINISHED
        // =========================

        subscriber.next({
          type: EventType.RUN_FINISHED,
          threadId: input.threadId,
          runId: input.runId,
        });

        subscriber.complete();
      }, 150);

      return () => {
        clearInterval(timer);
      };
    });
  }
}

export const agent = new CustomAgent({
  agentId: "practice-agent",
  description:
    "AG-UI custom streaming and state synchronization practice agent",
  initialState,
});