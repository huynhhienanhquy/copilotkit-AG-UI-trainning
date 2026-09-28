# AG-UI CLI Example

A command-line chat interface demonstrating the AG-UI client with a Mastra agent. This example shows how to build an interactive CLI application that streams agent responses and tool calls in real-time.

## Features

- Interactive chat loop with streaming responses
- Real-time tool call visualization (weather and browser tools)
- Message history persistence using LibSQL
- Built with `@ag-ui/client` and `@ag-ui/mastra`

## Prerequisites

- Node.js 22.22.0 or later (recommended by the current dependency tree)
- OpenAI API key

## Setup

1. Install dependencies from this practice directory:

   ```powershell
   cd practices/ag-ui-cli
   npm ci
   ```

2. Set your OpenAI API key:

   ```powershell
   Copy-Item .env.example .env
   # Edit .env and replace the placeholder value.
   ```

## Usage

Run the CLI:

```powershell
npm start
```

Try these example prompts:

- "What's the weather in San Francisco?"
- "Browse https://example.com"

Press `Ctrl+Z` then Enter on Windows, or `Ctrl+D` on macOS/Linux, to quit.

Build verification:

```powershell
npm test
npm run typecheck
npm run build
```

## How It Works

This example uses:

- **MastraAgent**: Wraps a Mastra agent with AG-UI protocol support
- **Event Handlers**: Streams text deltas, tool calls, and results to the console
- **Memory**: Persists conversation history in a local SQLite database
