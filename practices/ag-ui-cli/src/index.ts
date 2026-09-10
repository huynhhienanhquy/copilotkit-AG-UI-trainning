import "dotenv/config";
import * as readline from "readline";
import { randomUUID } from "@ag-ui/client";
import { agent } from "./agent";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chatLoop() {
  console.log(
    "🤖 AG-UI chat started! Type your messages and press Enter. Press Ctrl+D to quit.\n",
  );

  return new Promise<void>((resolve) => {
    const promptUser = () => {
      rl.question("> ", async (input) => {
        const message = input.trim();

        if (!message) {
          promptUser();
          return;
        }

        console.log("");
        rl.pause();

        // Add user's message to AG-UI message history
        agent.messages.push({
          id: randomUUID(),
          role: "user",
          content: message,
        });

        try {
          await agent.runAgent(
            {},
            {
              // Assistant starts responding
              onTextMessageStartEvent() {
                process.stdout.write("🤖 AG-UI assistant: ");
              },

              // Streaming text from assistant
              onTextMessageContentEvent({ event }) {
                process.stdout.write(event.delta);
              },

              // Assistant finishes responding
              onTextMessageEndEvent() {
                console.log("\n");
              },

              // Agent decides to call a tool
              onToolCallStartEvent({ event }) {
                console.log(`\n🔧 Tool call: ${event.toolCallName}`);
              },

              // Tool arguments are streamed
              onToolCallArgsEvent({ event }) {
                process.stdout.write(event.delta);
              },

              // Tool call arguments finished
              onToolCallEndEvent() {
                console.log("");
              },

              // Tool returns a result
              onToolCallResultEvent({ event }) {
                if (event.content) {
                  console.log("🔍 Tool call result:", event.content);
                }
              },
            },
          );
        } catch (error) {
          console.error("❌ Error running agent:", error);
        } finally {
          rl.resume();
          promptUser();
        }
      });
    };

    rl.on("close", () => {
      console.log("\n👋 Goodbye!");
      resolve();
    });

    promptUser();
  });
}

async function main() {
  await chatLoop();
}

main().catch((error) => {
  console.error("❌ Application error:", error);
});