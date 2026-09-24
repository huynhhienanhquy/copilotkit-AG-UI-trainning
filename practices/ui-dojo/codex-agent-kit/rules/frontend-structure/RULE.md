# Frontend Structure and Organization

## Purpose
Standardize directory layout, folder responsibilities, and file placement across frontend applications.

## Rules
- Use the standard frontend source structure under `src/`: `assets/`, `components/`, `config/`, `constants/`, `contexts/`, `data/`, `helpers/`, `hooks/`, `layouts/`, `pages/`, `services/`, `stores/`, `styles/`, `types/`, and `utils/`.
- When scaffolding a new frontend application, create every standard source folder. When standardizing an existing application, preserve behavior and imports while adding missing folders or moving files; do not perform an unrelated mass migration during a smaller feature task.
- Place code according to folder responsibility:
  - `assets/`: Static files (fonts, images, icons, logos, artwork).
  - `components/`: Reusable UI shared across pages (primitives in `common/`, features in `<FeatureName>/`).
  - `config/`: Declarative application and runtime configuration grouped by concern (forms, routes, validation).
  - `constants/`: Immutable shared values, routes, regexes, and fixed limits.
  - `contexts/`: React contexts, providers, and context-specific hooks.
  - `data/`: Static datasets, mock content, fixtures, and seed-like data.
  - `helpers/`: Small presentation- or domain-oriented transformation functions.
  - `hooks/`: Reusable custom React hooks starting with `use`.
  - `layouts/`: Reusable page shells, headers, footers, and structural navigation.
  - `pages/`: Route-level screens (`pages/<PageName>/`) with page-only `sections/` and `actions/`.
  - `services/`: API clients, external integrations, and request/response normalization.
  - `stores/`: Global or cross-feature client state slices, actions, and selectors.
  - `styles/`: Global CSS, design tokens, themes, typography, and third-party style overrides.
  - `types/`: Shared TypeScript domain models, interfaces, and API types.
  - `utils/`: Generic, domain-neutral pure utility functions.
- Keep `App.tsx`, `main.tsx`, and framework declarations (`vite-env.d.ts`) at the `src/` root.
- Do not create duplicate catch-all folders (`misc/`, `common2/`) or place files arbitrarily.
- Keep page-only components and logic inside the page folder; promote to shared `components/` or `hooks/` only after they have proven consumers elsewhere.

## Safe Path
When standardizing existing applications, preserve working imports and existing architecture. Add missing standard folders incrementally without breaking existing features.
