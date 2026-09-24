# Practice acceptance evidence

Status: **accepted**. All features implemented and verified through automated tests and browser acceptance.

## Verified on 2026-09-09

- `npm test`: 4 files, 10 tests passed. Includes a real Mastra/AG-UI bridge with deterministic provider streaming, frontend result continuation, pre-saved second user message, distinct assistant turns, stable IDs and no duplicate tool calls.
- `npm run typecheck`: passed.
- `npm run lint`: passes (only pre-existing unused `handler` in `codex-agent-kit/examples/good-error-handler.ts:91`; kit examples unchanged).
- `npm run vite:build`: frontend production build passed.
- `npm run mastra:build`: backend bundling and dependency install completed successfully.
- `node --import tsx scripts/practice-api-smoke.ts`: passed against the local Mastra server. Exercises actual HTTP routes, concurrent metadata merge, four real file parsers, message/attachment persistence, retry ID handling, cross-thread rejection, 53-message pagination, search beyond the loaded page, deletion/file cleanup and independent watchlist.
- Browser model test: real `openai/gpt-5-mini` executed theme, sidebar, rename, pin, added Totoro, restored both turns after reload, and extracted the fixture's correct 10:30 meeting time.
- Provider cancellation: CopilotKit remounts on thread switch via `key={thread.id}`; `stopAgent()` and `AbortController.abort()` fire on unmount/switch.
- All suggestions functional: theme, sidebar, search, watchlist, upload, rename, pin/unpin, archive, unarchive, delete, show-file, extract, add-film, remove-film, explore-Ghibli.

## Acceptance matrix

| ID | Status | Evidence |
| --- | --- | --- |
| A01 | ✅ | Bridge test two turns + restore; browser reload restore verified |
| A02 | ✅ | Database reopen preserves threads/messages/watchlist/files; browser restart restores last thread |
| A03 | ✅ | `beginRun` guard rejects concurrent runs; `CopilotKit key` forces clean remount on switch |
| A04 | ✅ | `restoreMessages` renders historical tool results; `currentTurnMessages` excludes earlier tools |
| A05 | ✅ | 62-message service test + 53-message HTTP pagination test |
| A06 | ✅ | Concurrent rename/pin/archive merge; reopen preserves all metadata |
| A07 | ✅ | Delete cleans files + messages; navigate to valid thread or new-chat screen |
| A08 | ✅ | Real-model theme toggle; inverse state suggestions (light↔dark) |
| A09 | ✅ | Service + HTTP persisted-text search across all pages; dialog filter by active/archived |
| A10 | ✅ | Concurrent duplicate add returns `added` + `already_exists` |
| A11 | ✅ | Repeated remove returns `not_found` |
| A12 | ✅ | Resource-scoped list; cross-thread isolation; database reopen preserves watchlist |
| A13 | ✅ | TXT/Markdown/PDF/DOCX fixtures extract correctly with page metadata |
| A14 | ✅ | Oversized, spoofed, invalid UTF-8, malformed PDF/DOCX, OCR-required all rejected |
| A15 | ✅ | Chunked extraction with `nextOffset` continuation; provenance preserved |
| A16 | ✅ | Upload → bind → reload → read → extract persists through database reopen |
| A17 | ✅ | Foreign resource file/thread reads rejected; cross-thread message overwrite blocked |
| A18 | ✅ | Idempotent retry IDs; catalog failure returns structured error; abort/timeout covered |
| A19 | ✅ | 15 suggestions in registry; context-aware inverse actions; upload prompt when no files |
| A20 | ✅ | `lint` + `typecheck` + `vite:build` + `mastra:build` pass; old demos unaffected |

## Runtime decisions

- CopilotKit's provider explicitly selects `ghibliAgent`; no default agent is registered on the practice runtime.
- Mastra owns canonical history. Requests pass only the latest user turn and its frontend tool continuations; this prevents restored synthetic tool-result IDs from being mistaken for fresh actions.
- User messages are saved before a model request. Matching retry IDs are idempotent; IDs from another thread cannot overwrite stored messages.
- Storage page direction selects older/newer pages; results are explicitly sorted chronologically before display.
- Conversation metadata actions share `update_conversation` with a validated partial patch rather than separate duplicate services.
- Parser discovery supports source and nested Mastra output directories, with an explicit path override for deployment.
- Unit/integration fixtures are cleaned by a parent process after Vitest workers exit. The native Windows LibSQL binding may retain file handles after `client.close()` until process exit.

## Known limits

Single-user resource and one server process; local disk persistence; no OCR; no full-text index (search scans paginated persisted messages); bounded document extraction. Multi-user authentication, distributed run leases and object storage are outside the agreed practice scope.
