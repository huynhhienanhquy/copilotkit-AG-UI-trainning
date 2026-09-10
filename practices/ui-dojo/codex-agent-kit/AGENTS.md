# AGENTS.md

This file is generated from rules/*/RULE.md.
Run python scripts/build_agents_md.py after changing a rule.

## Quick Reference

| Rule | Purpose |
|------|---------|
| [Accessibility](#rule-accessibility) | Ensure interfaces are usable by people with diverse abilities, meeting WCAG standards and assistive technology requirements. |
| [Backend Engineering](#rule-backend) | Standardize the quality of backend and API deployments. |
| [Code Comments](#rule-code-comments) | Ensure every function has comments that help readers understand what it does, why it exists, and how to use it correctly — without reading the implementation. |
| [Code Quality](#rule-code-quality) | Maintain code that is readable, easy to maintain, and consistent with project conventions. |
| [Code Review](#rule-code-review) | Focus your review on impactful errors instead of formal comments. |
| [Communication](#rule-communication) | Makes Agent results easy to review and reliable. |
| [Context Discovery](#rule-context-discovery) | Make sure the Agent understands the project before editing. |
| [Data and Migrations](#rule-data-migrations) | Reduce the risk of data loss, downtime and incompatibility when making permanent changes to schema or data. |
| [Debugging and Error Investigation](#rule-debugging) | Ensure rigorous, evidence-driven error diagnosis and prevent superficial or symptom-masking fixes. |
| [Error Handling](#rule-error-handling) | Standardize how errors are caught, mapped, logged, and presented to consumers and operators. |
| [Execution Safety](#rule-execution-safety) | Prevent destructive, unrecoverable, or unauthorized actions by the Agent on system environments, databases, repositories, and external services. |
| [Frontend Components and Design System](#rule-frontend-components) | Ensure UI components are reusable, accessible, maintainable, and aligned with shared design systems. |
| [Frontend State Management and React Lifecycle](#rule-frontend-state) | Ensure predictable, performant, and bug-free state management and effect lifecycles. |
| [Frontend Structure and Organization](#rule-frontend-structure) | Standardize directory layout, folder responsibilities, and file placement across frontend applications. |
| [Frontend Testing and Storybook](#rule-frontend-testing) | Standardize unit, component, visual, and integration testing practices for frontend applications. |
| [Git Safety](#rule-git-safety) | Protect users' Git history and uncommitted changes. |
| [Implementation](#rule-implementation) | Specifies how Agents can safely edit code. |
| [LLM and AI Integration](#rule-llm-ai-integration) | Keep model inputs, outputs, tool use, data handling, and operational behavior safe and reliable. |
| [Operating Mode](#rule-operating-mode) | Specify how Agents receive and perform tasks. |
| [Planning](#rule-planning) | Keep complex tasks structured and testable. |
| [Reliability and Observability](#rule-reliability-observability) | Make production behavior resilient, bounded, observable, and diagnosable. |
| [Rule Precedence](#rule-rule-precedence) | Resolve conflicting instructions consistently without weakening safety or exceeding user authority. |
| [Scope and Authority](#rule-scope-and-authority) | Ensures the Agent only performs actions that the user's request actually allows. |
| [Security](#rule-security) | Prevent security errors and malicious behavior in code or Agent workflows. |
| [Verification](#rule-verification) | Any changes must be verified with appropriate evidence. |

## Project Adaptation

- Discover and use the repository actual package manager and commands.
- Follow existing architecture, naming, formatting, and testing conventions.
- More specific AGENTS.override.md or nested AGENTS.md files may override these defaults.
- Resolve instruction conflicts using rules/rule-precedence/RULE.md.
- Apply definition-of-done.md before reporting implementation work as complete.

---

<!-- source: rules/accessibility/RULE.md -->
<a id="rule-accessibility"></a>

# Accessibility

## Purpose
Ensure interfaces are usable by people with diverse abilities, meeting WCAG standards and assistive technology requirements.

## Rules
- Use semantic HTML: correct heading hierarchy, landmarks, lists, tables, and form elements.
- All interactive elements must be keyboard accessible with logical tab order.
- Provide visible focus indicators that meet color contrast requirements.
- Associate labels with form inputs using `htmlFor`/`for` or `aria-label`.
- Link error messages to inputs via `aria-describedby`.
- Indicate required fields both visually and programmatically (`required`, `aria-required`).
- Provide alt text for informative images; use empty alt for decorative images.
- Do not rely solely on color to convey meaning; use text, icons, or patterns.
- Use ARIA attributes only when native HTML semantics are insufficient.
- Return focus to the triggering element after modal/dialog close.
- Use live regions (`aria-live`) for dynamic content updates.
- Test with actual assistive technology (VoiceOver, NVDA, or similar).

## Safe path
When uncertain about WCAG compliance, prefer semantic HTML over ARIA, and test with a screen reader before shipping.

## Exceptions
- Data visualization may require alternative text strategies.
- Complex interactive widgets (date pickers, comboboxes) may need ARIA patterns beyond basic semantics.

---

<!-- source: rules/backend/RULE.md -->
<a id="rule-backend"></a>

# Backend Engineering

## Purpose
Standardize the quality of backend and API deployments.

## Rules
- Separate transport, business logic and data access when the project architecture allows.
- Validate request at boundary; Do not trust input from the client.
- Returns consistent status code and error payload.
- Operation that needs idempotent must have a mechanism to prevent repeated execution.
- Logging is structured but does not log secrets or unnecessary PII.
- Consider timeout, retry with backoff and circuit-breaking for external services.
- Migration must have a compatible deployment and rollback strategy.

---

<!-- source: rules/code-comments/RULE.md -->
<a id="rule-code-comments"></a>

# Code Comments

## Purpose
Ensure every function has comments that help readers understand what it does, why it exists, and how to use it correctly — without reading the implementation.

## Rules

### Comment Structure
Every function must have a comment that answers these questions:
1. **What** does this function do?
2. **Why** does this function exist? (business context or problem it solves)
3. **When** should I use this function?
4. **How** do I call it correctly?

### Required Elements
- **Summary line**: One sentence describing the function's purpose.
- **Detailed description** (if needed): Explain the logic, algorithm, or business rule.
- **Parameters**: Name, type, and what each parameter means — not just "the items" but "the list of items to process, must not be empty".
- **Return value**: What the caller gets back and what it represents.
- **Exceptions/Errors**: When and why the function throws, so callers know what to handle.
- **Side effects**: If the function modifies external state (database, file, API), mention it.
- **Constraints**: Preconditions (e.g., "requires authenticated user") and postconditions (e.g., "transaction is committed").
- **Examples**: Show realistic usage for non-obvious functions.

### Quality Standards
- Write comments for someone who has never seen this code before.
- Do not repeat the implementation; explain the **intent** and **context**.
- Keep comments up to date when the function changes.
- Do not add redundant comments that restate obvious code.
- Use the language-native format: JSDoc for JS/TS, Docstring for Python.

## Examples

### Good — Helps reader understand the function

```typescript
/**
 * Apply a discount coupon to a shopping cart and return the updated totals.
 *
 * This function validates the coupon, checks eligibility (minimum order amount,
 * product categories, expiration date), and applies the discount. If the coupon
 * is invalid or expired, it throws an error with a user-friendly message.
 *
 * @param cart - The shopping cart to apply the coupon to. Must contain at least one item.
 * @param couponCode - The coupon code entered by the user (case-insensitive).
 * @returns The updated cart with discount applied and new total calculated.
 * @throws {CouponNotFoundError} If the coupon code does not exist in the system.
 * @throws {CouponExpiredError} If the coupon has passed its expiration date.
 * @throws {CouponNotApplicableError} If the cart does not meet coupon requirements.
 *
 * @example
 * const cart = await applyCouponToCart(userCart, "SAVE20");
 * console.log(cart.discount); // 20% off
 */
function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // ...
}
```

### Bad — Does not help reader understand

```typescript
// Bad: Too vague, reader still needs to read the code
/**
 * Applies a coupon.
 */
function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // ...
}

// Bad: Repeats the implementation
/**
 * Loops through the items, finds the coupon, checks if valid,
 * calculates discount, updates the total, and returns the cart.
 */
function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // ...
}

// Bad: Missing context about when to use or edge cases
/**
 * @param cart - Cart
 * @param couponCode - Coupon code
 * @returns Cart
 */
function applyCouponToCart(cart: Cart, couponCode: string): Cart {
  // ...
}
```

### Python Example

```python
def apply_coupon_to_cart(cart: Cart, coupon_code: str) -> Cart:
    """Apply a discount coupon to a shopping cart and return the updated totals.

    This function validates the coupon, checks eligibility (minimum order amount,
    product categories, expiration date), and applies the discount. If the coupon
    is invalid or expired, it raises an error with a user-friendly message.

    Args:
        cart: The shopping cart to apply the coupon to. Must contain at least one item.
        coupon_code: The coupon code entered by the user (case-insensitive).

    Returns:
        The updated cart with discount applied and new total calculated.

    Raises:
        CouponNotFoundError: If the coupon code does not exist in the system.
        CouponExpiredError: If the coupon has passed its expiration date.
        CouponNotApplicableError: If the cart does not meet coupon requirements.

    Example:
        >>> cart = apply_coupon_to_cart(user_cart, "SAVE20")
        >>> print(cart.discount)  # 20% off
    """
    # ...
```

### Simple Function

```typescript
/**
 * Get the currently authenticated user's ID.
 *
 * Returns the user ID from the JWT token stored in the auth context.
 * Must be called after authentication middleware has run.
 *
 * @returns The user ID string, or throws if no user is authenticated.
 */
function getCurrentUserId(): string {
  return context.userId;
}
```

## Exceptions
- Test files may omit comments when the test name already describes the scenario.
- Auto-generated code may follow the generator's documentation convention.
- Trivial one-liners (e.g., getters) may use a one-line comment if the name is self-explanatory.

---

<!-- source: rules/code-quality/RULE.md -->
<a id="rule-code-quality"></a>

# Code Quality

## Purpose
Maintain code that is readable, easy to maintain, and consistent with project conventions.

## Rules
- Prioritize code that makes sense over code that is smart but difficult to read.
- Keep the function/component small and have one main responsibility.
- Reuse existing abstractions before creating new abstractions.
- Don't add dependency production if you don't really need it.
- Do not leave `console.log`, debug code, commented-out code or TODO without context.
- Do not disable lint/type checks to hide errors; Fix the root cause or log a specific exception.
- Keep the public API compatible unless a breaking change is required.
- No hardcoding secrets, tokens, credentials or sensitive data.

---

<!-- source: rules/code-review/RULE.md -->
<a id="rule-code-review"></a>

# Code Review

## Purpose
Focus your review on impactful errors instead of formal comments.

## Rules
- Priorities: correctness, security, data loss, race condition, breaking change, performance and lack of testing.
- Each finding must clearly indicate the location, error situation, impact, and safe fix.
- Don't report finding based solely on style preferences if lint/formatter has already taken care of it.
- Distinguish a solid finding from a question or suggestion.
- Test behavior changes but test is not updated.
- If there is no finding, clearly state what has been tested and the remaining risks.

## Severity
- P0: causes serious problems or immediate data loss.
- P1: serious error that is likely to affect production.
- P2: functional or maintainability errors worth fixing.
- P3: improvements are not required.

---

<!-- source: rules/communication/RULE.md -->
<a id="rule-communication"></a>

# Communication

## Purpose
Makes Agent results easy to review and reliable.

## Rules
- Short updates when completing a milestone or detecting a blocker.
- The final result must state: what has changed, main files, tests run and remaining risks.
- Do not exaggerate the level of completion.
- Extract commands and errors that are important enough for users to reproduce.
- Do not pour the entire long log; keep only the relevant part.
- When suggesting multiple options, state trade-off and choose a default.

---

<!-- source: rules/context-discovery/RULE.md -->
<a id="rule-context-discovery"></a>

# Context Discovery

## Purpose
Make sure the Agent understands the project before editing.

## Rules
- Define package manager, framework, scripts, test runner, lint and build command from configuration file.
- Find a similar implementation in the repository before creating a new pattern.
- Read the type, interface, API contract and related tests before modifying the logic.
- Check current `git status` and diff to avoid overwriting user changes.
- Do not speculate on file names, commands or architecture when you can check directly.

## Required output
Before major changes, Agents must have a mental model of entry points, data flow, dependencies and testing locations.

---

<!-- source: rules/data-migrations/RULE.md -->
<a id="rule-data-migrations"></a>

# Data and Migrations

## Purpose
Reduce the risk of data loss, downtime and incompatibility when making permanent changes to schema or data.

## Rules
- Determine volume, lock behavior, transaction boundaries, and rollback capabilities before migrations with write or schema changes.
- Prioritize expand-and-contract when old and new applications can run concurrently.
- Separate schema changes, backfills and cleanups as combining them increases lock time or makes rollback difficult.
- Backfill must be resumable, idempotent, have batching/checkpoint when the data is large and have a way to measure progress.
- Do not delete or rename columns/data before verifying all readers and writers have converted.
- Verify relevant constraints, indexes, default values, timezone, encoding and precision.
- There are pre-check, post-check and recovery plans; Backup is not considered valid if you do not know how to restore.

---

<!-- source: rules/debugging/RULE.md -->
<a id="rule-debugging"></a>

# Debugging and Error Investigation

## Purpose
Ensure rigorous, evidence-driven error diagnosis and prevent superficial or symptom-masking fixes.

## Rules
- **Inspect Full Tracebacks & Logs First**: Never form a diagnostic hypothesis for a runtime failure or test breakage without reading the full, un-truncated error log and traceback.
- **No Superficial Symptom Patches**: Never resolve errors by masking symptoms (e.g., swallowing exceptions silently, returning dummy fallback data, commenting out broken assertions, or deleting failing unit tests).
- **Trace Upstream Causes**: If an API or function receives null or missing data, trace the upstream data provider instead of wrapping the caller in a silent try/except or default fallback.
- **Empirical Verification**: Every code fix must be justified by empirical log evidence or verified root cause analysis. Run the test suite or reproduction command after editing code to confirm resolution.

## Safe Path
If the root cause of an error cannot be identified from existing logs, add targeted logging or diagnostic probes to capture empirical evidence rather than guessing.

---

<!-- source: rules/error-handling/RULE.md -->
<a id="rule-error-handling"></a>

# Error Handling

## Purpose
Standardize how errors are caught, mapped, logged, and presented to consumers and operators.

## Rules
- Catch errors at the appropriate boundary; do not swallow exceptions silently.
- Map internal errors to consumer-safe error responses with a stable error code, message, and actionable detail.
- Never expose stack traces, internal paths, SQL errors, or secrets in error responses to external consumers.
- Return consistent error shape across all endpoints: `{ code, message, details?, requestId? }`.
- Use domain-specific error codes rather than generic HTTP status codes when possible.
- Distinguish between client errors (4xx) and server errors (5xx); do not return 500 for validation failures.
- Log errors at the point of failure with structured context: timestamp, requestId, userId, operation, and error type.
- Retries and fallbacks should not mask the root cause; log both the original and the recovery attempt.
- Validate input at the boundary and return clear validation errors before executing business logic.
- Errors in async flows must propagate or be caught; do not leave unhandled promise rejections.

## Safe path
When uncertain about error mapping, prefer returning a generic 500 with a correlation ID over exposing internal details. Log the full error server-side for debugging.

## Exceptions
- Development environments may expose detailed errors when explicitly configured.
- Internal microservice-to-service communication may include technical detail if both sides agree.

---

<!-- source: rules/execution-safety/RULE.md -->
<a id="rule-execution-safety"></a>

# Execution Safety

## Purpose
Prevent destructive, unrecoverable, or unauthorized actions by the Agent on system environments, databases, repositories, and external services.

## Rules
- Never execute a destructive or difficult-to-recover action without confirming that it is explicitly authorized and correctly scoped.
- Treat these as high-risk examples, not as an exhaustive command blacklist:
  - Repository and Git: `git push --force`, `git reset --hard`, rewriting shared history, or deleting remote branches.
  - Filesystem: `rm -rf /`, recursive deletion of home or repository roots, or mass deletion outside verified workspace bounds.
  - Database: `DROP DATABASE`, `TRUNCATE TABLE`, destructive production migrations, or data repair without a recovery path.
  - Package and release: `npm publish`, `pip upload`, pushing images, or releasing artifacts to public registries.
- Before a high-risk action, resolve the exact targets, estimate the blast radius, identify a recovery path, and obtain any required approval.
- Perform destructive or state-altering tests in isolated temporary environments or fixtures, never against active production configuration by default.
- Use explicit targets and literal paths. Avoid unresolved variables, broad wildcards, and recursive mass operations unless their expansion has been reviewed.
- Prefer reversible operations and staged changes when they achieve the same outcome.

## Safe Path
When an action may cause irreversible state loss or external impact, stop and ask for confirmation with the exact operation, targets, impact, and recovery plan.

---

<!-- source: rules/frontend-components/RULE.md -->
<a id="rule-frontend-components"></a>

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

---

<!-- source: rules/frontend-state/RULE.md -->
<a id="rule-frontend-state"></a>

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

---

<!-- source: rules/frontend-structure/RULE.md -->
<a id="rule-frontend-structure"></a>

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

---

<!-- source: rules/frontend-testing/RULE.md -->
<a id="rule-frontend-testing"></a>

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

---

<!-- source: rules/git-safety/RULE.md -->
<a id="rule-git-safety"></a>

# Git Safety

## Purpose
Protect users' Git history and uncommitted changes.

## Rules
- Always check `git status` before major operations.
- Do not use `git reset --hard`, `git clean -fd`, force push, or delete branches unless the user explicitly requests it.
- Do not overwrite unrelated user changes.
- Do not amend commits or rebase public history without being requested.
- Commit must have a clear scope and a message describing the purpose.
- When there is a conflict, resolve it based on the intent of both sides and rerun the test.

---

<!-- source: rules/implementation/RULE.md -->
<a id="rule-implementation"></a>

# Implementation

## Purpose
Specifies how Agents can safely edit code.

## Rules
- Make minimal changes that meet requirements.
- Keep the existing style, naming and folder structure intact.
- Handle loading, empty, error and retry states when related to UI or async flow.
- With async code, consider cancellation, stale response, timeout and race condition.
- With APIs, validate input at the boundary and return structured errors.
- For databases, consider transactions, migration rollback and backward compatibility.
- Do not change generated files manually if they have a source generator.

---

<!-- source: rules/llm-ai-integration/RULE.md -->
<a id="rule-llm-ai-integration"></a>

# LLM and AI Integration

## Purpose
Keep model inputs, outputs, tool use, data handling, and operational behavior safe and reliable.

## Rules
- Treat user content, retrieved documents, web pages, tool output, and model-generated text as untrusted data, not as trusted instructions.
- Keep trusted controls separate from untrusted context; clearly delimit data and minimize the context supplied to the model.
- Validate model output against an explicit schema and business rules before using it in code, databases, UI, commands, or external actions.
- Require deterministic authorization checks immediately before tool calls or mutations; never rely on the model to grant itself permission.
- Use allowlisted tools and parameters, least privilege, bounded execution, and human approval for high-impact actions.
- Protect secrets, personal data, proprietary content, and tenant boundaries in prompts, logs, traces, caches, and evaluation datasets.
- Apply input, output, token, rate, concurrency, latency, retry, and cost limits. Use backoff and respect provider rate-limit guidance.
- Defend against prompt injection, indirect prompt injection, data exfiltration, unsafe rendering, and cross-tenant retrieval.
- Test adversarial inputs, malformed output, refusals, timeouts, partial responses, provider errors, and model-version changes.
- Log model and prompt-template versions, latency, token usage, validation failures, and safety outcomes without logging sensitive content unnecessarily.
- Provide a safe fallback or fail closed when validation, authorization, or safety checks fail.

---

<!-- source: rules/operating-mode/RULE.md -->
<a id="rule-operating-mode"></a>

# Operating Mode

## Purpose
Specify how Agents receive and perform tasks.

## Rules
- Read `AGENTS.md`, the repository structure and related documentation before changing the code.
- For complex tasks, create a short plan that includes goals, scope, risks, and validation steps.
- Keep working until you reach Definition of Done or encounter the actual blocker.
- Do not ask for information that can be determined by reading code, config, tests, or Git history.
- Prioritize changes that are small, reviewable, and easy to undo.
- Do not edit files outside the scope if not necessary.
- When assumptions must be made, clearly state the assumptions in the final result.

## Safe path
When the requirement is vague but can still be done safely, choose the least disruptive option and state the assumption.

---

<!-- source: rules/planning/RULE.md -->
<a id="rule-planning"></a>

# Planning

## Purpose
Keep complex tasks structured and testable.

## Rules
- Create a plan when a task touches multiple files, changes architecture, includes a migration, or carries meaningful regression risk.
- Each step must produce a verifiable result.
- Determine the files expected to change, the tests to run, and the rollback path.
- Update the plan if new findings change the scope.
- Don't turn your plan into a long description; Prioritize action steps.

## Plan format
1. Survey.
2. Minimal implementation.
3. Test.
4. Review diff.
5. Report.

---

<!-- source: rules/reliability-observability/RULE.md -->
<a id="rule-reliability-observability"></a>

# Reliability and Observability

## Purpose
Make production behavior resilient, bounded, observable, and diagnosable.

## Rules
- Set explicit timeouts for external calls. Retry only transient failures, use bounded backoff and jitter, and protect non-idempotent operations from duplicate effects.
- Bound concurrency, queues, payload sizes, memory, and other resource usage; apply backpressure or load shedding instead of allowing unbounded growth.
- Propagate cancellation and deadlines when the stack supports them; do not orphan background work or swallow errors.
- Emit structured logs with useful correlation context without exposing secrets, tokens, or unnecessary personal data.
- Add appropriate signals for important behavior, such as error reporting, metrics, traces, health checks, or audit events, following project conventions.
- Tie alerts to actionable user or system impact; avoid uncontrolled log volume and high-cardinality dimensions.
- Define rollout, rollback, abort thresholds, and observable post-release checks for high-risk changes.

---

<!-- source: rules/rule-precedence/RULE.md -->
<a id="rule-rule-precedence"></a>

# Rule Precedence

## Purpose
Resolve conflicting instructions consistently without weakening safety or exceeding user authority.

## Precedence
Apply the first applicable instruction in this order:
1. Platform, system, sandbox, legal, and security policies.
2. The user's explicit request, scope, and approvals for the current task.
3. Execution-safety, security, scope-and-authority, and data-protection constraints in this kit.
4. More specific repository instructions, such as nested `AGENTS.md` or `AGENTS.override.md`, over broader repository defaults.
5. The selected workflow and its decision gates.
6. The assigned agent role and its authority boundaries.
7. Task-specific skill instructions.
8. General engineering rules and examples.

## Conflict Rules
- A lower-priority instruction may add detail but must not contradict or weaken a higher-priority instruction.
- Specific instructions override general ones only within their scope and only when higher-priority safety and authorization constraints remain satisfied.
- Examples and templates are advisory; repository contracts and verified behavior take precedence.
- When two instructions at the same level conflict, prefer the narrower, safer, and more recent instruction. If the result would materially change behavior or authority, stop and ask the user.
- Record any material conflict and the resolution in the final report.

---

<!-- source: rules/scope-and-authority/RULE.md -->
<a id="rule-scope-and-authority"></a>

# Scope and Authority

## Purpose
Ensures the Agent only performs actions that the user's request actually allows.

## Rules
- Distinguish requests to read, diagnose, or review from requests to edit or implement; do not automatically expand observation into mutation.
- Permission to edit code does not imply permission to deploy, send messages, create a PR, modify external services, or operate on production.
- Before an action that is difficult to undo, determine the exact target, blast radius, recovery path, and existing authority.
- When missing an option could significantly change the outcome, stop and ask; For low-risk details, choose conservative assumptions and state them clearly.
- Respect existing user changes; Do not edit or format the file outside the scope just to make a "clean" diff.
- Do not declare completion when there are mandatory steps left undone or dependent on external systems.

## Safe path
Prioritize read-only inspection and small, reversible, verified changes before expanding the scope.

---

<!-- source: rules/security/RULE.md -->
<a id="rule-security"></a>

# Security

## Purpose
Prevent security errors and malicious behavior in code or Agent workflows.

## Rules
- Do not read, print, commit or send secrets outside the necessary scope.
- Do not include `.env`, private key, access token or credential in the output.
- Validate and sanitize data at the trust boundary.
- Check authorization, not just authentication.
- Avoid command injection, SQL injection, XSS, SSRF, path traversal and insecure deserialization.
- Use prepared statements or safe APIs instead of concatenating query strings.
- Do not reduce security controls just to test passes.
- New dependencies must have a reason and be checked for source, license, maintenance and risk.

---

<!-- source: rules/verification/RULE.md -->
<a id="rule-verification"></a>

# Verification

## Purpose
Any changes must be verified with appropriate evidence.

## Rules
- Run focused tests on the newly edited code first, then run a broader suite if feasible.
- Run typecheck, lint and build according to the repository's scripts.
- Add or update tests when behavior changes.
- Do not declare "passed" without running the corresponding command.
- If the test cannot be run, state clearly the command has not been run and the reason.
- Review the final diff to find redundant files, debug code, incorrect formatting, and out-of-scope changes.

## Suggested command discovery
Read `package.json`, `pyproject.toml`, `Makefile`, CI workflow or project documentation to find the exact command.
