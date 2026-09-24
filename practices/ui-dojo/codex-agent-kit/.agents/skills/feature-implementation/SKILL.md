---
name: feature-implementation
description: Implement a production-quality feature end to end. Use when adding or changing user-visible behavior, API behavior, business logic, or data flow. Includes planning, implementation, tests, and final diff review.
---


# Feature Implementation

## Workflow
1. Clarify behavior from request, existing code and tests.
2. Determine acceptance criteria and backward-compatibility constraints.
3. Find the closest pattern in the codebase.
4. Smallest fully working vertical slice implementation.
5. Handle success, loading, empty, error and related edge cases.
6. Add/update tests according to behavior.
7. Run targeted tests, typecheck, lint and build accordingly.
8. Review diff and remove out of scope changes.

## Required checks
- API/type contracts remain consistent.
- Don't add dependencies if you don't need them.
- Do not debug code.
- Error path has handling.
- Test proves acceptance criteria.

## Guardrails
- Do not broaden scope, break public contracts, or add production dependencies without a demonstrated need.
- Do not bypass validation, authorization, error handling, lint, types, or tests to complete the feature.
- Treat migrations and external state changes as separate risk and authorization boundaries.

## Definition of done
Acceptance criteria and edge cases are implemented, relevant tests prove the behavior, required quality commands pass, documentation or operational notes are updated when needed, and the final diff contains no unrelated changes.
