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
- 2026-10-05: completed semantic-only highlighting by caching exact-range passage embeddings alongside each title/message vector. Results without lexical overlap now anchor and highlight the most relevant passage instead of defaulting to the start of the message; legacy vector-only cache rows upgrade lazily.
- 2026-10-05: attachment extraction now returns page-aware citation chunks with attachment/page/character provenance. Agent citations and tool-result passages open the owned file, navigate to the PDF page when applicable and highlight the exact extracted range.
- 2026-10-05: the first persisted message now generates a short conversation title with a configurable small model. Atomic compare-and-set preserves any title renamed by the user while generation is in flight; provider failure does not fail message submission.
- 2026-10-05: archive, pin and watchlist mutations now update React Query caches optimistically, restore exact snapshots on API failure and offer persistent inverse mutations through a seven-second Undo toast.
- 2026-10-05: auto-title now uses the recommended OpenAI Responses API with bounded, non-stored requests; retry, pre-existing rename and provider-failure behavior have explicit regression coverage.
- 2026-10-05: runtime diagnosis found that the original 64-token Responses budget could be consumed by `gpt-5-mini` reasoning and produce empty `output_text`. The title request now uses low reasoning and a 256-token cap, verified against the configured provider.
- 2026-10-05: the suite passes 23 tests across 7 files, including citation validation/page boundaries, auto-title idempotency/manual-rename races/failure isolation and deterministic optimistic cache transformations; typecheck, scoped lint and the Vite production build pass.
- 2026-10-05: added durable message actions for edit/resend, regenerate, copy, retry failed tools and persisted `Interrupted` responses. Timeline revisions are serialized per thread, discard stale descendants, preserve attachment references and rehydrate canonical history before rerunning the agent.
- 2026-10-06: centralized tool risk policy for Ghibli Workspace. Harmless UI/read tools run immediately, conversation/watchlist mutations run through frontend-controlled Undo, and conversation/file deletion only opens explicit confirmation. Unknown mutation-shaped tools fail closed.
- All A01–A25 acceptance scenarios verified with automated tests and/or browser evidence.
- Windows test cleanup now occurs in a parent process after workers exit; this fixed LibSQL native file locks without skipping assertions or deleting shared/user data.

## Migration/recovery boundary

Only new practice tables will be added; existing Mastra schemas are owned by Mastra migrations. Development verification must use isolated temporary databases and upload directories. No production data migration, deletion, deployment or remote write is part of this task.

Rollback application code while retaining the added tables/files; do not drop data. Before real deployment, back up the configured database and upload directory together and verify restoration against a separate instance.
