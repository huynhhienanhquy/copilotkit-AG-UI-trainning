# Add bounded retry for profile lookups

## Why
Transient profile-service failures currently surface as immediate 500 responses, creating avoidable user-visible errors.

## What changed
- Retry only network errors and HTTP 503 responses, up to two attempts with capped backoff.
- Preserve the existing timeout across all attempts.
- Add metrics for retry attempts and exhausted retries.

## Verification
- `pnpm test profile-client` — passed
- `pnpm typecheck` — passed
- `pnpm lint` — passed

## Risk and rollout
The change can increase downstream traffic during partial outages. Retries are bounded and observable. Roll back this change if retry volume or profile-service saturation crosses the existing alert threshold.

## Screenshots
Not applicable; no UI changes.
