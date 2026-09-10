---
name: test-engineering
description: Design, add, repair, or improve automated tests. Use for unit, integration, end-to-end tests, flaky tests, coverage gaps, or regression protection. Focus on behavior rather than implementation details.
---


# Test Engineering

## Workflow
1. Identify behaviors and risks that need to be protected.
2. Choose the lowest test level but still demonstrate behavior.
3. Use existing test utilities and conventions.
4. Write deterministic tests that are independent and easy to understand.
5. Mock at system boundary; Avoid excessive internal mocking.
6. Covers important success, failure, boundary and regression cases.
7. Run the test multiple times if dealing with flaky/race behavior.
8. Check coverage as a signal, not optimization just to increase percentage.

## Avoid
- Large snapshots have no value.
- Fixed Sleep to wait for async.
- Assert implementation detail.
- Test depends on order or shared mutable state.

## Guardrails
- Do not weaken assertions, delete valid coverage, or mock the behavior under test merely to make the suite pass.
- Do not run destructive or stateful tests against production services or data.
- Keep fixtures isolated and deterministic; redact secrets and unnecessary personal data from test output.

## Definition of done
Tests demonstrate the intended behavior and important failure boundaries, reproduce the fixed regression when applicable, run deterministically with project conventions, and any remaining coverage gaps are documented.
