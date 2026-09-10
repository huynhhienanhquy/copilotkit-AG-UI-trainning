# Frontend Testing and Storybook

## Purpose
Standardize unit, component, visual, and integration testing practices for frontend applications.

## Rules
- Co-locate UI implementation, tests, and Storybook stories inside each `components/` or `pages/` feature folder (e.g., `AiChatWidget/AiChatWidget.tsx`, `AiChatWidget/AiChatWidget.test.tsx`, `AiChatWidget/AiChatWidget.stories.tsx`).
- When creating or modifying a component or page, create or update its adjacent `*.test.tsx` file and, when the project uses Storybook, its adjacent `*.stories.tsx` file in the same change.
- For non-UI logic folders such as `hooks/`, `utils/`, `services/`, and `stores/`, place unit tests in a `__tests__/` child directory of the relevant logic folder (e.g., `hooks/useAuth.ts` and `hooks/__tests__/useAuth.test.ts`).
- Follow the repository's established test extension (`.test.ts` or `.test.tsx`) based on whether the test contains JSX.
- Test user-visible behavior and accessible roles rather than internal component implementation details.
- Avoid testing third-party libraries directly; mock external API calls and browser globals at the boundary.

## Safe Path
Match the repository's established test runner (Vitest, Jest, React Testing Library) and keep tests deterministic without relying on real network connections.
