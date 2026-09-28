# AG-UI Custom Agent

This practice implements a deterministic `AbstractAgent` without an LLM or API
key. It streams AG-UI lifecycle events, emits state snapshots and JSON Patch
deltas, and routes a small set of local commands.

## Run

Requirements: Node.js 20+ and pnpm.

```powershell
cd practices/ag-ui-custom-agent
pnpm install
pnpm dev
```

Try these commands:

- `calculator 4*33`
- `calc 10/2`
- `time`
- `open https://example.com`
- `task`

Press `Ctrl+C`, `Ctrl+Z` then Enter on Windows, or `Ctrl+D` on macOS/Linux to
stop the CLI.

## Production-style run

```powershell
pnpm build
pnpm start
```

## Verification

```powershell
pnpm test
pnpm typecheck
pnpm build
```
