---
name: refactoring
description: Refactor existing code without intentionally changing external behavior. Use for duplication removal, modularization, naming, complexity reduction, dependency cleanup, or architecture improvement.
---


# Refactoring

## Workflow
1. Specify the behavior that must be maintained.
2. Run/read existing tests; Add characterization test when missing.
3. Break the refactor into small, reversible steps.
4. Do not mix feature change with structural change if it can be avoided.
5. Reduce duplication/complexity but do not create premature abstraction.
6. Run tests after each reasonable milestone.
7. Compare public API, output and side effects before/after.

## Guardrails
- Do not mix unrelated behavior changes into a structural refactor.
- Do not introduce an abstraction without a concrete reuse or complexity benefit.
- Do not claim behavior preservation without characterization or regression evidence.

## Definition of done
Code is clearer, behavior remains unchanged, tests pass and diff contain no hidden functional changes.
