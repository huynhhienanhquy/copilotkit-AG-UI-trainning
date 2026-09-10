# Frontend Components and Design System

## Purpose
Ensure UI components are reusable, accessible, maintainable, and aligned with shared design systems.

## Rules
- Keep each component focused on a single responsibility; extract business logic into hooks or utilities.
- Before creating a new component or page section, inspect the existing component library, design-system exports, and similar screens. Reuse the component that owns the required behavior instead of recreating it with raw HTML.
- When an existing component is missing a required reusable capability, extend its public API with typed, semantic props and implement the behavior inside that component. Keep existing usages backward compatible, then consume the new props from the page.
- Do not bypass an available design-system component with raw interactive HTML such as `<button>`, `<input>`, `<select>`, `<textarea>`, or `<a>` merely to achieve page-specific styling. Use the shared component's variants, slots, composition API, or a reusable prop extension.
- Keep shared component props domain-neutral. Prefer APIs such as `variant`, `size`, `loading`, `disabled`, `leadingIcon`, and `onClick` over page-specific props such as `isCheckoutButton` or `dashboardStyle`.
- Raw HTML elements are acceptable only when no matching shared abstraction exists or when native semantics are intentionally required. In that case, verify the repository first and briefly document the reason.
- Organize `components/` by reusable domain group. Put application-wide primitives in `components/common/<ComponentName>/`; put larger reusable features in `components/<FeatureName>/`, with nested component folders when the feature contains independently testable parts.
- The UI must handle all standard states: loading, empty, error, and responsive layouts.
- Handle accessibility: semantic HTML, keyboard navigation, labels, visible focus, and ARIA where native HTML is insufficient.

## Safe Path
When extending shared components, verify existing usages across the repository to ensure no regressions or breaking interface changes are introduced.
