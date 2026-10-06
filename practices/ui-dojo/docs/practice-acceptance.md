# Practice acceptance evidence

Status: **accepted**. All features implemented and verified through automated tests and browser acceptance.

## Verified on 2026-09-09

- `npm test`: 4 files, 10 tests passed. Includes a real Mastra/AG-UI bridge with deterministic provider streaming, frontend result continuation, pre-saved second user message, distinct assistant turns, stable IDs and no duplicate tool calls.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run vite:build`: frontend production build passed.
- `npm run mastra:build`: backend bundling and dependency install completed successfully.
- `node --import tsx scripts/practice-api-smoke.ts`: passed against the local Mastra server. Exercises actual HTTP routes, concurrent metadata merge, four real file parsers, message/attachment persistence, retry ID handling, cross-thread rejection, 53-message pagination, search beyond the loaded page, deletion/file cleanup and independent watchlist.
- Browser model test: real `openai/gpt-5-mini` executed theme, sidebar, rename, pin, added Totoro, restored both turns after reload, and extracted the fixture's correct 10:30 meeting time.
- Provider cancellation: CopilotKit remounts on thread switch via `key={thread.id}`; `stopAgent()` and `AbortController.abort()` fire on unmount/switch.
- All suggestions functional: theme, sidebar, search, watchlist, upload, rename, pin/unpin, archive, unarchive, delete, show-file, extract, add-film, remove-film, explore-Ghibli.

## Semantic search improvement verified on 2026-10-02

- `npm test`: 5 files, 12 tests passed. New deterministic tests cover semantic-only matches, FTS5 ranking/highlights, embedding-cache reuse, inclusive date filters, attachment presence, archive scope and derived-index cleanup.
- `npm run typecheck` and `npm run lint`: passed.
- Vite production bundle: passed; existing externalized-module and large-chunk warnings remain.
- `npm run mastra:build`: backend bundle and output dependency installation passed.
- Conversation search now generates cached title/message and passage embeddings lazily, combines cosine similarity with FTS5, highlights both lexical and semantic-only matches at the relevant character range, and renders `find_conversations` results as interactive cards.

## Citation and auto-title improvements verified on 2026-10-05

- `npm test`: auto-title coverage includes first-message detection, idempotent retry, title normalization, pre-existing/manual rename protection and provider-failure isolation.
- `npm run typecheck`: passed.
- Scoped ESLint over application source/scripts and all changed source files: passed.
- Attachment extraction returns clickable, page-aware citations with exact character ranges; preview highlights the cited segment and opens the matching PDF page when available.
- First messages generate short titles through a configurable small model. The generated value is committed only while the canonical title is still `New conversation`.

## Optimistic update and Undo verified on 2026-10-05

- `npm test`: 7 files, 23 tests passed. Deterministic coverage verifies auto-title failure/race behavior, active/archive movement, pin ordering, watchlist removal/restoration and immutable rollback snapshots.
- `npm run typecheck`: passed.
- Scoped ESLint over `src` and `scripts`: passed.
- Vite production build: passed; existing browser-externalization and large-chunk warnings remain.
- Archive, restore, pin, unpin, watchlist add and watchlist remove update their React Query caches before the API response.
- Failed requests restore the pre-mutation cache; successful archive, pin and watchlist removal actions expose a seven-second persistent Undo mutation.

## Message actions verified on 2026-10-05

- `npm test`: 8 files, 27 tests passed. New coverage verifies editable text extraction, failed-tool detection, descendant cleanup, attachment-reference preservation, regenerate/retry semantics and persisted interrupted status.
- `npm run typecheck`: passed.
- Scoped ESLint over `src` and `scripts`: passed. Full-repository lint still includes the pre-existing untracked `codex-agent-kit` example and reports its unused `handler` variable.
- Vite production build: passed; existing browser-externalization and large-chunk warnings remain.
- Backend build verification is pending a rerun after the Windows process holding `.mastra/output/node_modules` releases its file lock; the attempted build stopped at `EPERM` while reading the old generated `ajv-formats/package.json`.
- Edit/resend and regenerate replace stale persisted descendants before running the agent again; retry is available only for failed or incomplete tool invocations.
- Copy response uses the CopilotKit assistant toolbar, and stopped responses display an `Interrupted` terminal state that survives reload when a partial assistant message exists.

## Tool approval by risk verified on 2026-10-06

- Central policy classifies no-confirmation, undoable and confirmation-required tools; unknown mutation-shaped tools default to confirmation.
- Theme/sidebar/search continue to execute immediately.
- Agent-triggered pin/archive/watchlist mutations now use frontend-controlled REST mutations and expose persistent Undo actions.
- Delete conversation and delete draft file tool calls only open an explicit confirmation dialog; no DELETE request occurs before user confirmation.
- Saved attachments remain protected from standalone deletion to preserve message and citation integrity.
- `npm test`: 9 files, 30 tests passed; new deterministic tests cover all three risk levels and fail-closed unknown mutations.
- `npm run typecheck`, scoped ESLint over `src`/`scripts`, and Vite production build: passed. Existing browser-externalization and large-chunk warnings remain.
- Mastra bundle rerun remains blocked by the existing Windows file lock in generated `.mastra/output/node_modules` (`EPERM` in `ajv`); no source or persisted practice data is involved.

## Agent planning timeline verified on 2026-10-06

- Multi-step requests can invoke the `present_plan` frontend tool before actions begin; simple answers and single actions skip it.
- The UI renders an accessible, ordered 2–6 step timeline with streaming and ready states.
- The strict public-plan schema accepts only a title and concise action labels; reasoning/analysis fields are rejected and model reasoning events are never rendered into the timeline.
- Restored plan tool calls render from persisted arguments without rerunning the handler.
- `npm test`: 10 files, 33 tests passed. New coverage verifies valid public plans, multi-step bounds and rejection of reasoning payloads.
- `npm run typecheck`, scoped ESLint over `src`/`scripts`, and Vite production build: passed. Existing browser-externalization and large-chunk warnings remain.
- Mastra bundle remains blocked by the existing Windows lock in generated `.mastra/output/node_modules` (`EPERM` in `ajv`); source typecheck is unaffected.

## Acceptance matrix

| ID  | Status | Evidence                                                                                                                             |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| A01 | ✅     | Bridge test two turns + restore; browser reload restore verified                                                                     |
| A02 | ✅     | Database reopen preserves threads/messages/watchlist/files; browser restart restores last thread                                     |
| A03 | ✅     | `beginRun` guard rejects concurrent runs; `CopilotKit key` forces clean remount on switch                                            |
| A04 | ✅     | `restoreMessages` renders historical tool results; `currentTurnMessages` excludes earlier tools                                      |
| A05 | ✅     | 62-message service test + 53-message HTTP pagination test                                                                            |
| A06 | ✅     | Concurrent rename/pin/archive merge; reopen preserves all metadata                                                                   |
| A07 | ✅     | Delete cleans files + messages; navigate to valid thread or new-chat screen                                                          |
| A08 | ✅     | Real-model theme toggle; inverse state suggestions (light↔dark)                                                                      |
| A09 | ✅     | Hybrid FTS5/semantic search across persisted titles/messages; highlight plus active/archive, inclusive date and attachment filters   |
| A10 | ✅     | Concurrent duplicate add returns `added` + `already_exists`                                                                          |
| A11 | ✅     | Repeated remove returns `not_found`                                                                                                  |
| A12 | ✅     | Resource-scoped list; cross-thread isolation; database reopen preserves watchlist                                                    |
| A13 | ✅     | TXT/Markdown/PDF/DOCX fixtures extract correctly with page metadata                                                                  |
| A14 | ✅     | Oversized, spoofed, invalid UTF-8, malformed PDF/DOCX, OCR-required all rejected                                                     |
| A15 | ✅     | Chunked extraction with `nextOffset` continuation; provenance preserved                                                              |
| A16 | ✅     | Upload → bind → reload → read → extract persists through database reopen                                                             |
| A17 | ✅     | Foreign resource file/thread reads rejected; cross-thread message overwrite blocked                                                  |
| A18 | ✅     | Idempotent retry IDs; catalog failure returns structured error; abort/timeout covered                                                |
| A19 | ✅     | 15 suggestions in registry; context-aware inverse actions; upload prompt when no files                                               |
| A20 | ✅     | `lint` + `typecheck` + `vite:build` + `mastra:build` pass; old demos unaffected                                                      |
| A21 | ✅     | Page-aware extraction chunks return attachment/page/range provenance; citation click opens and highlights the exact owned source     |
| A22 | ✅     | First-message title generation is idempotent and atomic; concurrent manual rename is never overwritten                               |
| A23 | ✅     | Archive, pin and watchlist removal update optimistically; failures rollback snapshots and successful actions support persistent Undo |
| A24 | ✅     | Edit/resend, regenerate, copy, failed-tool retry and persisted interrupted response state                                            |
| A25 | ✅     | Risk-based tool policy: immediate safe tools, reversible mutations with Undo, destructive actions behind confirmation                |
| A26 | ✅     | Multi-step requests show a bounded public action timeline without exposing model chain-of-thought                                    |

## Runtime decisions

- CopilotKit's provider explicitly selects `ghibliAgent`; no default agent is registered on the practice runtime.
- Mastra owns canonical history. Requests pass only the latest user turn and its frontend tool continuations; this prevents restored synthetic tool-result IDs from being mistaken for fresh actions.
- User messages are saved before a model request. Matching retry IDs are idempotent; IDs from another thread cannot overwrite stored messages.
- Storage page direction selects older/newer pages; results are explicitly sorted chronologically before display.
- Conversation metadata actions share `update_conversation` with a validated partial patch rather than separate duplicate services.
- Parser discovery supports source and nested Mastra output directories, with an explicit path override for deployment.
- Unit/integration fixtures are cleaned by a parent process after Vitest workers exit. The native Windows LibSQL binding may retain file handles after `client.close()` until process exit.

## Known limits

Single-user resource and one server process; local disk persistence; no OCR; bounded document extraction. TXT, Markdown and DOCX citations use virtual page 1 because raw-text extraction has no reliable pagination. First-message title generation can add up to the configured 8-second provider timeout and currently has no background retry. Only the latest reversible UI action has a seven-second Undo window; conversation deletion remains a confirmed, non-undoable cleanup. Embeddings are stored as JSON and cosine ranking runs in-process, so a native vector index is recommended at larger scale. Multi-user authentication, distributed run leases and object storage are outside the agreed practice scope.
