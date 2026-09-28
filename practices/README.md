# Practices

Run each practice from its own directory so its lockfile and local environment
file are used. `ui-dojo` is intentionally excluded from this guide.

| Practice | Package manager | API key | Development command |
| --- | --- | --- | --- |
| `ag-ui-cli` | npm | `OPENAI_API_KEY` required | `npm start` |
| `ag-ui-custom-agent` | pnpm | Not required | `pnpm dev` |
| `ag-ui-server` | pnpm | Optional; demo mode works without it | `pnpm dev` |
| `interactive-agent` | npm | Required for live chat | `npm run dev` |
| `middleware-based` | pnpm | `OPENAI_API_KEY` required | `pnpm dev` |
| `todo` | npm | Required for live chat | `npm run dev` |

## Commands

### AG-UI CLI

```powershell
cd practices/ag-ui-cli
npm ci
Copy-Item .env.example .env
# Set OPENAI_API_KEY in .env
npm start
```

### AG-UI custom agent

```powershell
cd practices/ag-ui-custom-agent
pnpm install
pnpm dev
```

### AG-UI server and React UI

```powershell
cd practices/ag-ui-server
pnpm install
pnpm dev
```

Open <http://localhost:5173>. The server uses deterministic demo mode when no
`OPENAI_API_KEY` is configured.

### Interactive agent

```powershell
cd practices/interactive-agent
npm ci
Copy-Item .env.example .env
# Set OPENAI_API_KEY in .env
npm run dev
```

Open <http://localhost:3000>.

### Middleware-based CLI

```powershell
cd practices/middleware-based
pnpm install
Copy-Item .env.example .env
# Set OPENAI_API_KEY in .env
pnpm dev
```

### Todo Copilot

```powershell
cd practices/todo
npm ci
Copy-Item .env.example .env.local
# Set OPENAI_API_KEY in .env.local
npm run dev
```

Open <http://localhost:3000>.

## Verification

```powershell
cd practices/ag-ui-cli; npm test; npm run typecheck; npm run build
cd ../ag-ui-custom-agent; pnpm test; pnpm typecheck; pnpm build
cd ../ag-ui-server; pnpm test; pnpm typecheck; pnpm build
cd ../interactive-agent; npm run typecheck; npm run typecheck:channel; npm run build
cd ../middleware-based; pnpm test; pnpm typecheck; pnpm build
cd ../todo; npm test; npm run typecheck; npm run lint; npm run build
```
