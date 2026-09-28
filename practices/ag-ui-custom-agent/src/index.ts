import * as readline from "node:readline";
import { randomUUID } from "@ag-ui/client";

import { agent } from "./agent.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chat(): Promise<void> {
  console.log(
    "AG-UI custom agent started. Press Ctrl+C (or send EOF) to quit.\n",
  );
  rl.setPrompt("You: ");
  rl.prompt();

  for await (const input of rl) {
    const userInput = input.trim();

    if (!userInput) {
      rl.prompt();
      continue;
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

          onStateSnapshotEvent({ event }) {
            console.log("\n[STATE SNAPSHOT]");
            console.log(JSON.stringify(event.snapshot, null, 2));
          },

          onStateDeltaEvent({ event }) {
            console.log("\n[STATE DELTA]");
            console.log(JSON.stringify(event.delta, null, 2));
          },

          onTextMessageStartEvent() {
            process.stdout.write("\nAgent: ");
          },

          onTextMessageContentEvent({ event }) {
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
        error instanceof Error ? error.message : error,
      );
    }

    rl.prompt();
  }

  console.log("\nGoodbye!");
}

chat().catch((error) => {
  console.error(
    "Fatal error:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
