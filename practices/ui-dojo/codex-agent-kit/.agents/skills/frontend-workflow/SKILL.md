---
name: frontend-workflow
description: Implement or improve frontend features in React or similar component-based web apps. Use for components, hooks, state, accessibility, responsive UI, async data, forms, and frontend tests.
---


# Frontend Workflow

## Workflow
1. Determine the component tree, state owner and data source.
2. Use existing design system/component before creating new one.
3. Separate server state, form state and derived state clearly.
4. Handle loading, empty, error, retry and cancellation.
5. Ensure semantic HTML, keyboard navigation, focus and labels.
6. Test responsive behavior and avoid unnecessary layout shifts.
7. Write component/hook tests according to user behavior.
8. Run lint, typecheck, test and build.

## Guardrails
- Do not disable the lint hook to avoid dependencies.
- Cleanup effect and abort async request when needed.
- Do not mirror props into state if it can be derived.
- Memoization only when there is a measurable reason or identity requirement.

## Definition of done
The UI handles required states and responsive behavior, uses accessible semantics and project components, async work is safely cleaned up, user-visible behavior is tested, and lint, typecheck, tests, and build pass as applicable.
