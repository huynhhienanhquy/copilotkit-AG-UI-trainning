# Code Review Workflow

## Use when
Reviewing a diff, branch, commit, pull request, or proposed implementation without being asked to modify it.

## Workflow
1. Establish the correct base, head, requested scope, and intended behavior.
2. Inspect repository instructions and read the entire diff before forming conclusions.
3. Trace changed paths through callers, contracts, persistence, side effects, and tests.
4. Evaluate correctness, security, authorization, data integrity, concurrency, compatibility, performance, and operability.
5. Confirm that tests cover new behavior, failure paths, boundaries, and meaningful regressions.
6. Validate each suspected defect against surrounding code; use targeted read-only checks when useful.
7. Rank confirmed findings P0 through P3 and provide location, trigger, evidence, impact, and a safe fix.
8. Separate findings from questions, suggestions, and verification gaps.
9. State clearly when no blocking findings were found and summarize residual risk.

## Decision gates
- Do not mutate reviewed code unless the user explicitly asks for fixes.
- Do not report formatter preferences, unsupported speculation, or unreachable scenarios as defects.
- Raise severity based on realistic impact and exploitability, not on how unusual the code looks.

## Done when
Every finding is actionable and evidence-backed, the relevant changed paths were inspected, and verification gaps are explicit.
