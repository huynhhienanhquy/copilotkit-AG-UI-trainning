import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Fastify from "fastify";
import { EventEncoder } from "@ag-ui/encoder";
import type { BaseEvent, RunAgentInput } from "@ag-ui/core";
import "dotenv/config";
import { WorkspaceAgent } from "./agent.js";
import { WorkspaceStore } from "./state.js";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 8000);
const demoMode = process.env.DEMO_MODE === "true" || !process.env.OPENAI_API_KEY;
const uiDirectory = resolve(process.cwd(), "dist/ui");
const store = new WorkspaceStore();
const agent = new WorkspaceAgent(store, {
  apiKey: process.env.OPENAI_API_KEY,
  demoMode,
  model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
});

app.get("/api/health", async () => ({
  status: "ok",
  mode: demoMode ? "demo" : "openai",
  model: demoMode ? "deterministic-demo" : process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
}));

app.post<{ Body: RunAgentInput }>("/api/agent", async (request, reply) => {
  const input = request.body;
  if (!input || !Array.isArray(input.messages)) {
    return reply.code(400).send({ error: "The request body must be a valid RunAgentInput." });
  }

  const encoder = new EventEncoder({ accept: request.headers.accept ?? "text/event-stream" });
  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": encoder.getContentType(),
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  try {
    for await (const item of agent.run(input)) {
      reply.raw.write(encoder.encode(item as BaseEvent));
    }
  } finally {
    reply.raw.end();
  }
});

const assets: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/assets/app.css": { file: "assets/app.css", type: "text/css; charset=utf-8" },
  "/assets/app.js": { file: "assets/app.js", type: "text/javascript; charset=utf-8" },
  "/favicon.svg": { file: "favicon.svg", type: "image/svg+xml" },
};

for (const [route, asset] of Object.entries(assets)) {
  app.get(route, async (_request, reply) => {
    try {
      const content = await readFile(resolve(uiDirectory, asset.file));
      return reply.type(asset.type).send(content);
    } catch {
      return reply.code(503).send({
        error: "The React UI has not been built. Run `pnpm build` or use `pnpm dev`.",
      });
    }
  });
}

await app.listen({ host: "0.0.0.0", port });
app.log.info(`AG-UI practice: http://localhost:${port} (${demoMode ? "demo" : "OpenAI"} mode)`);
