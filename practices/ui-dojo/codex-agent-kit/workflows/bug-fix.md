# Bug Fix Workflow

## Use when
Correcting reproducible incorrect behavior, crashes, regressions, race conditions, flaky behavior, or unexplained test failures.

## Workflow
1. Record expected behavior, actual behavior, reproduction steps, environment, and impact.
2. Inspect repository instructions, current changes, recent history, logs, tests, and the complete execution path.
3. Reproduce the failure or obtain equivalent evidence before changing code.
4. Form a falsifiable hypothesis and narrow the cause with a focused test, trace, log, or minimal reproduction.
5. Identify the root cause, affected surface, and why existing protections did not catch it.
6. Add a regression test that fails for the observed cause when feasible.
7. Implement the smallest fix at the correct layer without masking the symptom or weakening safeguards.
8. Run the regression test, nearby tests, and relevant lint, typecheck, build, or stress checks.
9. Review the diff and test adjacent failure paths for unintended behavior changes.
10. Report root cause, fix, evidence, commands run, and residual risk.

## Decision gates
- Do not patch based only on correlation or a plausible-looking code pattern.
- If the issue cannot be reproduced, state confidence and evidence; prefer instrumentation or a guarded diagnostic change over a speculative fix.
- Escalate when the fix requires data repair, a breaking contract, or production access outside the granted scope.

## Done when
The root cause is supported by evidence, the fix addresses it directly, and a regression check demonstrates the corrected behavior.
