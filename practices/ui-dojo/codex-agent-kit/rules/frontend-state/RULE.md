# Frontend State Management and React Lifecycle

## Purpose
Ensure predictable, performant, and bug-free state management and effect lifecycles.

## Rules
- Derive state during render; never store redundant state that can be computed from existing props or state.
- Avoid unnecessary `useEffect` hooks; keep effect dependency arrays accurate, stable, and exhaustive.
- Clean up asynchronous effects using `AbortController` to prevent race conditions, memory leaks, and state updates from stale responses.
- Never use array index as a `key` for lists that can be reordered, inserted, or filtered; always use stable, unique entity identifiers (`id`).
- Scope state appropriately:
  - Local state (`useState`, `useReducer`) for UI-only transient states.
  - Context (`contexts/`) for values crossing multiple component levels (theme, auth session).
  - Global stores (`stores/`) for complex cross-feature domain state.
- In global stores, write narrow selectors to avoid unnecessary subscriptions and re-renders.
- Keep custom hook logic reusable, prefix names with `use`, and never return raw rendered JSX from custom hooks.

## Safe Path
When considering adding a `useEffect` to synchronize two state values, check first if the target value can be derived directly during render or memoized with `useMemo`.
