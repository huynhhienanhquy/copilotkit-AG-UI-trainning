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
