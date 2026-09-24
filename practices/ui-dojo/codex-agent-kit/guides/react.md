# React + TypeScript Guide

Override rules for React + TypeScript projects.

## Package Manager

```bash
# Detect package manager
npm run dev        # development
npm run build      # production build
npm run test       # test suite
npm run lint       # linting
npm run typecheck  # type checking
```

## Project Conventions

- Components: PascalCase in `src/components/`
- Hooks: `use` prefix in `src/hooks/`
- Utilities: camelCase in `src/utils/`
- Types: `src/types/` for shared interfaces

## React-Specific Rules

- Do not disable the `react-hooks/exhaustive-deps` lint rule.
- Cleanup effects and abort async requests when component unmounts.
- Do not mirror props into state if the value can be derived.
- Memoize only when there is a measurable performance reason.
- Use `useId()` for generating unique IDs for accessibility.
- Prefer controlled components over uncontrolled when validation is needed.

## Testing

```bash
npm run test -- --coverage   # with coverage
npm run test -- --watch       # watch mode
```

- Test user behavior, not implementation details.
- Use `@testing-library/react` for component tests.
- Mock API calls, not internal component state.

## Build and Deploy

```bash
npm run build          # production build
npm run preview        # preview production build locally
```
