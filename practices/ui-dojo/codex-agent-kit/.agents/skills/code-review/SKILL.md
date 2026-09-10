---
name: code-review
description: Review code changes or a pull request for correctness, security, regressions, race conditions, maintainability, and missing tests. Use when asked to review a diff, branch, commit, or PR. Findings-first output.
---


# Code Review

## Workflow
1. Identify base and head; Read the entire diff before concluding.
2. Understand intent from requests, commits, tests and surrounding code.
3. Check correctness, security, data integrity, async/race, API compatibility and performance.
4. Check that the tests cover the new behavior and failure paths.
5. Each finding must have severity, file/line, impact, reproduction and safe fix.
6. Do not list style issues that are part of formatter/linter.

## Output
### Findings
Arrange P0 → P3. If there is no finding, clearly state "No blocking findings".

### Verification gaps
Commands or environments have not been tested.

### Summary
A short paragraph on the safety of change.

## Guardrails
- Do not report speculative findings without a concrete failure mode and evidence in the reviewed change.
- Do not expand a read-only review into edits, merges, or external actions without explicit authorization.
- Prioritize correctness, security, data integrity, compatibility, and missing tests over style preferences.

## Definition of done
The complete scoped diff is reviewed, actionable findings include severity and evidence, verification gaps and residual risks are explicit, and the conclusion does not overstate confidence.
