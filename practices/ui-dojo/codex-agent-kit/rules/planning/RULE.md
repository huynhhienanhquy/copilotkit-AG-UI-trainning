# Planning

## Purpose
Keep complex tasks structured and testable.

## Rules
- Create a plan when a task touches multiple files, changes architecture, includes a migration, or carries meaningful regression risk.
- Each step must produce a verifiable result.
- Determine the files expected to change, the tests to run, and the rollback path.
- Update the plan if new findings change the scope.
- Don't turn your plan into a long description; Prioritize action steps.

## Plan format
1. Survey.
2. Minimal implementation.
3. Test.
4. Review diff.
5. Report.
