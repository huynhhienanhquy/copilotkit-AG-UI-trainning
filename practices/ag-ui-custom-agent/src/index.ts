import * as readline from "node:readline";
import { randomUUID } from "@ag-ui/client";
import { agent } from "./agent.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function chat(): void {
  rl.question("You: ", async (input: string) => {
    if (!input.trim()) {
      chat();
      return;
    }

    agent.messages.push({
      id: randomUUID(),
      role: "user",
      content: input.trim(),
    });

    try {
      await agent.runAgent(
        {},
        {
          onRunStartedEvent() {
            console.log("\n[RUN STARTED]");
          },

          onTextMessageStartEvent() {
            process.stdout.write("Agent: ");
          },

          onTextMessageContentEvent({ event }) {
            process.stdout.write(event.delta);
          },

          onTextMessageEndEvent() {
            console.log("\n[MESSAGE END]");
          },

          onRunFinishedEvent() {
            console.log("[RUN FINISHED]\n");
          },
        },
      );
    } catch (error) {
      console.error("Agent error:", error);
    }

    chat();
  });
}

chat();