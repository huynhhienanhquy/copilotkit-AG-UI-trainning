# Middleware-Based Integration (CLI)

This practice runs an AG-UI agent in the same Node.js process as the CLI. The
agent extends `AbstractAgent`, calls the OpenAI streaming API directly, and
translates provider chunks into this AG-UI lifecycle:

```text
RUN_STARTED
  -> TEXT_MESSAGE_START
  -> TEXT_MESSAGE_CONTENT (one or more)
  -> TEXT_MESSAGE_END
  -> RUN_FINISHED
```

Failures terminate with `RUN_ERROR`. The `AbstractAgent` base class consumes
these events and maintains the conversation message history for the next turn.

## Run

Requirements: Node.js 20+ and pnpm.

```powershell
cd practices/middleware-based
pnpm install
Copy-Item .env.example .env
# Edit .env and set OPENAI_API_KEY
pnpm dev
```

Useful CLI modes:

```powershell
# Show the exact AG-UI events on stderr
pnpm dev -- --events

# Run one prompt and exit
pnpm dev -- -m "Explain AG-UI in one sentence" --events

# Compile, then run the JavaScript output
pnpm build
pnpm start

# Run the local streaming integration test (no API key/network required)
pnpm test
```

Environment variables:

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)
- `OPENAI_BASE_URL` (optional, for an OpenAI-compatible endpoint)

## Files

- `src/agent.ts`: in-process LLM call and OpenAI-to-AG-UI event translation.
- `src/index.ts`: interactive/one-shot CLI and AG-UI event subscriber.
