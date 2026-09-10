# Feature Development Workflow

## Use when
Adding or changing user-visible behavior, API behavior, business logic, or an end-to-end data flow.

## Workflow
1. Understand the request, desired behavior, constraints, and explicit non-goals.
2. Inspect repository instructions, status, architecture, nearby implementations, contracts, and tests.
3. Identify affected files, dependencies, compatibility boundaries, and likely risks.
4. Define measurable acceptance criteria and create a short implementation plan for non-trivial work.
5. Implement the smallest safe vertical slice that satisfies the acceptance criteria.
6. Handle relevant success, loading, empty, failure, cancellation, and boundary paths.
7. Add or update behavior-focused tests, including a regression case when correcting existing behavior.
8. Run targeted tests first, then the repository's relevant lint, typecheck, broader tests, and build commands.
9. Review the final diff for correctness, security, generated files, debug code, and unrelated changes.
10. Report the behavior delivered, files changed, verification evidence, assumptions, and remaining risk.

## Decision gates
- Stop and request direction if a missing product decision materially changes the behavior or data contract.
- Use the database migration workflow and rollout safeguards when persistent data changes.
- Do not add a dependency or breaking API change without a demonstrated need and compatibility review.

## Done when
Acceptance criteria are met, relevant checks pass, and the final diff is scoped, reviewable, and operationally safe.
