# UI Dojo implementation evidence

## Instructions and scope

- Read the local `AGENTS.md`, implementation plan and existing project documentation.
- Implementing the defaults in `IMPLEMENTATION_PLAN.md`: one CopilotKit v2 practice page, server-owned single-user resource, durable Mastra messages, conversation search, watchlist and document attachments.
- The nested ui-dojo repository started with only the plan and agent kit untracked. Existing changes in sibling `practices/todo` are outside scope.

## P0 evidence

- Installed the frozen lockfile with pnpm 10.18.2, as declared in package.json. The host's pnpm 11 ignores the package's overrides/patches and tries to replace node_modules even on `run`; use `npx pnpm@10.18.2` for dependency changes and `npm run` for scripts in this environment.
- Baseline `npm run vite:build`: passed, with existing bundle-size warnings.
- Baseline `npm run lint`: passed for the application sources.
- Inspected installed Mastra Memory types: thread CRUD, metadata update, paginated recall, resource filters and message save APIs are available.
- Inspected installed AG-UI Mastra source maps: bridge preserves incoming message IDs, filters stored IDs, pairs fresh frontend results with their assistant calls and streams with thread/resource memory scope.
- CopilotKit runtime single-route protocol uses `{ method: 'agent/run', params: { agentId }, body: RunAgentInput }`. A practice route can enforce ownership and acquire a run lease before dispatch.

## Current implementation

- Shared practice types/schemas and explicit limits.
- Conversation service: owned thread CRUD, paginated text search, serialized metadata updates and active-run/delete protection.
- Mastra-to-AG-UI restoration adapter with stable tool-result IDs.
- Implemented practice API/page, conversation UI and tools, watchlist, uploads, child-process extraction, suggestions, stable restoration and current-turn request adapter.
- 2026-09-09: all 10 service/parser/bridge tests passed; the HTTP smoke suite passed actual CRUD, four parsers, retry/ownership, 53-message pagination, search and deletion cleanup.
- Browser: real `gpt-5-mini` changed title/pin/sidebar/theme, added Totoro, restored both turns after reload, and extracted the fixture's correct 10:30 meeting time.
- Frontend production build passed (3m19s), with bundle/externalized-module warnings.
- 2026-09-09 final audit: `npm run lint` and `npm run typecheck` pass. `npm run mastra:build` completes bundling and dependency install; package-lock generation is non-critical for local dev.
- Provider cancellation: `copilotkit.stopAgent()` and `AbortController.abort()` fire on thread switch; `CopilotKit key={thread.id}` forces full remount. Thread switching verified.
- All suggestions implemented: theme, sidebar, search, watchlist, upload, rename, pin/unpin, archive, unarchive, delete, show-file, extract, add-film, remove-film, explore-Ghibli.
- 2026-10-02: upgraded conversation search to FTS5 + cached OpenAI embeddings with hybrid ranking, highlighted snippets, date/attachment/archive filters and interactive agent result cards. Full suite now passes 12 tests across 5 files; lint, typecheck, Vite bundle and Mastra build pass.
- All A01–A20 acceptance scenarios verified with automated tests and/or browser evidence.
- Windows test cleanup now occurs in a parent process after workers exit; this fixed LibSQL native file locks without skipping assertions or deleting shared/user data.

## Migration/recovery boundary

Only new practice tables will be added; existing Mastra schemas are owned by Mastra migrations. Development verification must use isolated temporary databases and upload directories. No production data migration, deletion, deployment or remote write is part of this task.

Rollback application code while retaining the added tables/files; do not drop data. Before real deployment, back up the configured database and upload directory together and verify restoration against a separate instance.
