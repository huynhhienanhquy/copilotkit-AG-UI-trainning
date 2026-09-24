import * as readline from "node:readline";

import { randomUUID } from "@ag-ui/client";

import type {
  StateSnapshotEvent,
  StateDeltaEvent,
  TextMessageContentEvent,
} from "@ag-ui/core";

import { agent } from "../agent.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function chat(): void {
  rl.question("You: ", async (input: string) => {
    const userInput = input.trim();

    if (!userInput) {
      chat();
      return;
    }

    agent.messages.push({
      id: randomUUID(),
      role: "user",
      content: userInput,
    });

    try {
      await agent.runAgent(
        {},
        {
          onRunStartedEvent() {
            console.log("\n[RUN STARTED]");
          },

          onStateSnapshotEvent(
            { event }: { event: StateSnapshotEvent },
          ) {
            console.log("\n[STATE SNAPSHOT]");
            console.log(JSON.stringify(event.snapshot, null, 2));
          },

          onStateDeltaEvent(
            { event }: { event: StateDeltaEvent },
          ) {
            console.log("\n[STATE DELTA]");
            console.log(JSON.stringify(event.delta, null, 2));
          },

          onTextMessageStartEvent() {
            process.stdout.write("\nAgent: ");
          },

          onTextMessageContentEvent(
            { event }: { event: TextMessageContentEvent },
          ) {
            process.stdout.write(event.delta);
          },

          onTextMessageEndEvent() {
            console.log("\n[MESSAGE END]");
          },

          onRunFinishedEvent() {
            console.log("\n[RUN FINISHED]");

            console.log("\n[FINAL AGENT STATE]");
            console.log(JSON.stringify(agent.state, null, 2));

            console.log("");
          },
        },
      );
    } catch (error) {
      console.error(
        "\nAgent error:",
        error instanceof Error
          ? error.message
          : error,
      );
    }

    chat();
  });
}

chat();