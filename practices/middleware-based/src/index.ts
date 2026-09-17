import "dotenv/config";

import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { OpenAIAgent } from "./agent.js";

type CliOptions = {
  message?: string;
  showEvents: boolean;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.",
    );
  }

  const agent = new OpenAIAgent({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    model: process.env.OPENAI_MODEL?.trim() || undefined,
    threadId: randomUUID(),
    description: "In-process OpenAI agent that emits AG-UI events",
  });

  const stop = () => agent.abortRun();
  process.once("SIGINT", stop);

  try {
    if (options.message) {
      await runTurn(agent, options.message, options.showEvents);
      return;
    }

    console.log(
      `AG-UI middleware-based CLI\nModel: ${agent.model}\nType /exit to quit.\n`,
    );

    const rl = createInterface({ input: stdin, output: stdout });
    try {
      while (true) {
        const answer = (await rl.question("You: ")).trim();
        if (!answer) {
          continue;
        }
        if (answer === "/exit" || answer === "/quit") {
          break;
        }

        await runTurn(agent, answer, options.showEvents);
      }
    } finally {
      rl.close();
    }
  } finally {
    process.off("SIGINT", stop);
  }
}

async function runTurn(
  agent: OpenAIAgent,
  content: string,
  showEvents: boolean,
): Promise<void> {
  agent.addMessage({ id: randomUUID(), role: "user", content });

  let hasStartedText = false;
  let runFailed = false;

  await agent.runAgent(
    { runId: randomUUID() },
    {
      onRunStartedEvent({ event }) {
        logEvent(showEvents, event);
      },
      onTextMessageStartEvent({ event }) {
        logEvent(showEvents, event);
        hasStartedText = true;
        stdout.write("Agent: ");
      },
      onTextMessageContentEvent({ event }) {
        logEvent(showEvents, event);
        stdout.write(event.delta);
      },
      onTextMessageEndEvent({ event }) {
        logEvent(showEvents, event);
        stdout.write("\n");
      },
      onRunFinishedEvent({ event }) {
        logEvent(showEvents, event);
        if (!hasStartedText) {
          stdout.write("Agent: (empty response)\n");
        }
      },
      onRunErrorEvent({ event }) {
        logEvent(showEvents, event);
        runFailed = true;
        console.error(`Agent error: ${event.message}`);
      },
    },
  );

  if (runFailed) {
    process.exitCode = 1;
  }
}

function logEvent(showEvents: boolean, event: object): void {
  if (showEvents) {
    console.error(`[AG-UI] ${JSON.stringify(event)}`);
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { showEvents: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--events") {
      options.showEvents = true;
      continue;
    }
    if (arg === "--message" || arg === "-m") {
      const message = args[index + 1];
      if (!message) {
        throw new Error(`${arg} requires a value.`);
      }
      options.message = message;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  pnpm dev                         Interactive chat
  pnpm dev -- --events            Show every AG-UI event
  pnpm dev -- -m "Hello"          Run one turn and exit
  pnpm dev -- -m "Hello" --events Run one turn and show events`);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
