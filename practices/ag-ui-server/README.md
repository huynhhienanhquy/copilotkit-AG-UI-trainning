# AG-UI Server-Based Integration

This practice demonstrates an agent that runs entirely on the server and a React interface that observes the AG-UI stream in real time.

## Architecture

```text
React UI (Vite)
  └─ POST /api/agent (RunAgentInput)
       └─ Fastify server
            ├─ OpenAI streaming chat completion
            ├─ Workspace tools: upsert_task, set_focus, clear_completed
            ├─ Utility tools: get_weather, calculate
            ├─ In-memory state scoped by threadId
            └─ SSE: RUN_* / TEXT_MESSAGE_* / TOOL_CALL_* / STATE_SNAPSHOT
```

## Development

```bash
pnpm install
copy .env.example .env
pnpm dev
```

Open <http://localhost:5173>. Vite serves the React app and proxies `/api` to Fastify on port `8000`.

- Without `OPENAI_API_KEY`, the server automatically uses **demo mode**. It still streams protocol events, executes tools, and updates state.
- With `OPENAI_API_KEY`, the server calls the model configured by `OPENAI_MODEL` (`gpt-4.1-mini` by default).
- Set `DEMO_MODE=true` to force deterministic demo mode.
- `get_weather` uses Open-Meteo and does not require a weather API key.

## Production-style build

```bash
pnpm build
pnpm start
```

Open <http://localhost:8000>. Fastify serves the compiled React application from `dist/ui`.

## Suggested prompts

- `Weather in Bangkok`
- `Weather in London in Fahrenheit`
- `Calculate (12 + 8) * 3`
- `Create task Design the interface`
- `Focus is completing the AG-UI practice`
- `Complete Design the interface`
- `Clear completed tasks`

## Scripts

```bash
pnpm dev        # run the Fastify API and Vite together
pnpm start      # serve the API and the compiled React UI
pnpm typecheck  # check server and React TypeScript
pnpm test       # test the state/tool layer
pnpm build      # build React and server TypeScript into dist/
```

State is intentionally stored in memory and is reset when the server restarts. A production implementation should replace `WorkspaceStore` with a database and add authentication, rate limiting, persistence, and observability.
