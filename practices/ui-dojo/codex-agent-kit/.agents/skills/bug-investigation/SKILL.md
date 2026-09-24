---
name: bug-investigation
description: Investigate and fix a reproducible software bug using evidence. Use for crashes, incorrect behavior, regressions, race conditions, flaky behavior, or unexplained test failures. Avoid speculative fixes before identifying the cause.
---


# Bug Investigation

## Principle
Do not edit based on guesswork. Collect evidence, reproduce, determine the root cause and then patch.

## Workflow
1. Record expected vs actual behavior and reproduction path.
2. Check recent diffs, logs, tests and related code paths.
3. Create a refutable hypothesis.
4. Narrow by targeted logging, testing or minimal reproduction.
5. Determine root cause and scope of influence.
6. Write regression tests that fail before fixing them when feasible.
7. Make the smallest fix on the correct layer.
8. Run regression tests and related suites.
9. Checking the fix doesn't just cover the symptoms.

## Final report
- Root cause
- Fix
- Tests run
- Residual risk

## Guardrails
- Do not mask symptoms by swallowing errors, returning dummy data, or weakening assertions.
- Do not remove or skip a failing test without proving that the test is invalid.
- Keep diagnostic logging targeted and do not expose secrets or unnecessary personal data.

## Definition of done
The root cause is supported by evidence, a regression test protects the failing behavior when feasible, the smallest correct fix is verified, and residual risks are reported.
