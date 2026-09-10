# Definition of Done

Work is complete only when every applicable required item below is satisfied with evidence. An item that cannot be verified must be reported as not verified with the reason and resulting risk; it must not be silently treated as passing.

## Requirements and scope
- The requested behavior and agreed acceptance criteria are implemented.
- Explicit non-goals and authorization boundaries were respected.
- The final change contains no unrelated edits and preserves existing user work.
- Assumptions that affect behavior, compatibility, or operations are documented.

## Correctness and compatibility
- Relevant success, failure, boundary, empty, cancellation, and concurrency paths are handled.
- Existing behavior is preserved unless an intentional change was requested.
- Public APIs, data formats, configuration, and persisted data remain compatible, or the breaking change and migration path are explicit.
- Security, privacy, accessibility, reliability, and performance implications were considered where applicable.

## Tests and verification
- Tests were added or updated for changed behavior and meaningful regressions.
- Targeted tests pass.
- The repository's applicable unit, integration, contract, or end-to-end tests pass.
- Type checking, linting, formatting checks, and build or packaging checks pass when the repository defines them.
- Migration, generated-file, clean-environment, or platform-specific checks pass when relevant.
- Commands reported as passing were actually run; skipped or unavailable checks are listed explicitly.

## Change quality
- The implementation follows repository architecture, naming, style, and existing patterns.
- No debug logs, temporary instrumentation, dead code, accidental TODOs, exposed secrets, or unnecessary dependencies remain.
- Errors are handled at the correct boundary and operational signals do not expose sensitive data.
- The final diff was reviewed for correctness, scope, generated artifacts, and unintended side effects.

## Documentation and operations
- User, developer, API, runbook, migration, configuration, and release documentation is updated when behavior or operations changed.
- Rollout, rollback or forward-fix, monitoring, and ownership are documented for changes that carry operational risk.
- Required approvals or external actions are identified; they are performed only when separately authorized.

## Final report
- Summarize the outcome and important files changed.
- List verification commands and their results.
- State assumptions, skipped checks, limitations, and remaining risks.
- Do not claim the task is fully complete if a mandatory acceptance criterion remains unmet.
