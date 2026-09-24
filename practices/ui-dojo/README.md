# UI Dojo

## Ghibli Practice

Open `/practice/ghibli` for the extended practice workspace. It supports saved conversations, theme/sidebar/search tools, conversation rename/pin/archive/delete, a shared Ghibli watchlist, and durable TXT/Markdown/PDF/DOCX attachments with text extraction. **All features** shows executable examples; file-specific examples appear after uploading a document.

Use Node 22 and the declared pnpm version to install:

```sh
npx pnpm@10.18.2 install --frozen-lockfile
```

Copy `.env.example` to `.env`, replace `OPENAI_API_KEY`, then run `npm run dev`. The Ghibli model is `openai/gpt-5-mini`. Mastra listens on port 4750; Vite prints its frontend URL. If another app uses port 5173, run Vite separately with `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort` and open `http://127.0.0.1:5187/practice/ghibli`.

Optional server configuration:

| Variable | Default / purpose |
| --- | --- |
| `PRACTICE_RESOURCE_ID` | `ui-dojo-practice`; server-owned single-user identity |
| `TURSO_DATABASE_URL` | `file:./.mastra-demo.db`; used by Mastra and practice tables |
| `TURSO_AUTH_TOKEN` | Required only for an authenticated remote database |
| `PRACTICE_UPLOAD_DIR` | `.practice-uploads`; use an absolute persistent directory outside ephemeral deploy files |
| `PRACTICE_EXTRACTOR_PATH` | Optional absolute path to `scripts/extract-document.mjs` |
| `VITE_MASTRA_BASE_URL` | `http://localhost:4750`; frontend API URL |

Start commands should run from the project directory. Keep the database and upload directory together when backing up or moving the application. An absolute database URL and upload directory avoid differences between dev and deployed working directories. A standalone server distribution must include the extractor script and its `mammoth`/`pdfjs-dist` dependencies. The additive practice migration is applied lazily and does not modify existing Mastra schemas.

This practice is a local, single-user demo. Before a multi-user deployment, replace its fixed resource with authenticated server identity and use persistent/shared file storage. The process-local run lock is intended for one server process.

Files are limited to 10 MiB each and three per message. Extraction runs in a child process with a 20-second deadline, two concurrent jobs, a 256 MiB JS heap, a 2-million-character text limit, and 20,000-character result chunks. PDFs without readable text require OCR, which is not included. Draft uploads expire after 24 hours and are cleaned during subsequent upload activity; attached files remain until their conversation is deleted.

Archived conversations are readable; restore them before sending another message. Pin state survives archive/restore. Deleting a conversation removes its messages and files, while the watchlist remains. A delete prompt opens a confirmation dialog and waits for the current response to finish.

Validation commands:

```sh
npm test
npm run typecheck
npm run lint
npm run vite:build
npm run mastra:build
# Requires the local Mastra server, uses only synthetic threads/files and cleans them:
npm run test:api
```

The test wrapper removes isolated database fixtures after test workers exit, avoiding Windows native SQLite file locks. In this workspace, use `npm run` for scripts: the globally installed pnpm 11 does not honor this repository's pnpm 10 patches. See [implementation plan](IMPLEMENTATION_PLAN.md), [progress](docs/practice-progress.md), and [acceptance evidence](docs/practice-acceptance.md).

A Mastra showcase demonstrating how to integrate Mastra with popular AI UI frameworks. Compare implementations side-by-side and choose the best approach for your project.

This project provides working examples of Mastra integrated with three major AI UI frameworks, plus demonstrations of advanced patterns like generative UIs, workflows, and agent networks. Use this as a reference to understand how Mastra works with different UI approaches and pick the one that fits your needs.

In addition to this project, also consult the official Mastra documentation:

- [AI SDK](https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk)
- [Assistant UI](https://mastra.ai/docs/frameworks/agentic-uis/assistant-ui)
- [CopilotKit](https://mastra.ai/docs/frameworks/agentic-uis/copilotkit)

## Features

- **Framework Comparisons**: See Mastra working with AI SDK, Assistant UI, and CopilotKit
- **Generative UIs**: Build custom UI components for tool responses
- **Workflows**: Implement multi-step AI workflows with streaming and suspend/resume steps (including "Human in the Loop")
- **Agent Networks**: Coordinate multiple AI agents for complex tasks
- **Client SDK Integration**: Use Mastra's Client SDK with different frameworks

## Prerequisites

- Node.js 20 or later
- OpenAI API key

## Setup

1. **Clone and install dependencies:**

   ```bash
   git clone git@github.com:mastra-ai/ui-dojo.git
   cd ui-dojo
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

3. **Start the development server:**

   ```bash
   pnpm run dev
   ```

   This runs both the Mastra server and Vite dev server concurrently.

## What's Inside

### Chat Examples

Compare three different approaches to building chat interfaces with Mastra:

- **AI SDK** (`src/pages/ai-sdk/index.tsx`) - Built with Vercel's AI SDK and `@mastra/ai-sdk`
- **Assistant UI** (`src/pages/assistant-ui/index.tsx`) - Built with Assistant UI's Thread components and `useExternalStoreRuntime()` to connect Assistant UI to Mastra's memory
- **CopilotKit** (`src/pages/copilot-kit/index.tsx`) - Built with CopilotKit's Chat component

These examples showcase similar chat functionality implemented with different UI frameworks, allowing you to compare their approaches and capabilities.

### AI SDK UI

Explore advanced AI SDK UI capabilities:

- **Generative UIs** (`src/pages/ai-sdk/generative-user-interfaces.tsx`) - Custom UI components for tool responses
- **Workflows** (`src/pages/ai-sdk/workflow.tsx`) - Multi-step workflows with the activities workflow
- **Agent Networks** (`src/pages/ai-sdk/network.tsx`) - Multiple agents coordinating through a routing agent

### Custom Events

- **Generative UIs** (`src/pages/ai-sdk/generative-user-interfaces-with-custom-events.tsx`) - Custom UI for custom events
- **Agent Networks** (`src/pages/ai-sdk/agent-network-custom-events.tsx`) - Agent networks with custom event handling
- **Sub-agents and Workflows** (`src/pages/ai-sdk/sub-agents-and-workflows-custom-events.tsx`) - Sub-agents and workflows with custom events

### Workflow Patterns

- **Suspend/Resume** (`src/pages/ai-sdk/workflow-suspend-resume.tsx`) - Workflow with
  suspend and resume capabilities (Human in the Loop)

### Client Tools

See how to use client tools with each framework:

- **AI SDK + Client SDK** (`src/pages/client-tools/ai-sdk.tsx`)
- **Assistant UI + Client SDK** (`src/pages/client-tools/assistant-ui.tsx`)
- **CopilotKit + Client SDK** (`src/pages/client-tools/copilot-kit.tsx`)

## Common Issues

### "OPENAI_API_KEY is not set"

- Make sure you've created a `.env` file from `.env.example`
- Verify your API key is valid and properly formatted
- Restart the dev server after setting environment variables

### "Port already in use"

- Check if another Mastra or Vite process is running
- Kill the process or change the port in `vite.config.ts`

### "Agent not responding"

- Check the browser console and terminal for errors
- Verify your OpenAI API key has sufficient credits
- Ensure the Mastra server is running (check `http://localhost:4750`)

## Development

### Commands

- `pnpm run dev` - Start both Mastra and Vite servers
- `pnpm run mastra:dev` - Start only Mastra server
- `pnpm run vite:dev` - Start only Vite dev server
- `pnpm run vite:build` - Build for production
- `pnpm run lint` - Lint code
- `pnpm run format` - Format code with Prettier

### Customization

Modify the agents, tools, and workflows in `src/mastra/` to experiment with different capabilities. Each demo can be found in `src/pages/` and uses components from `src/components/`.

## Learn More

- [Mastra Documentation](https://mastra.ai/docs)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Assistant UI Documentation](https://assistant-ui.com)
- [CopilotKit Documentation](https://copilotkit.ai)
