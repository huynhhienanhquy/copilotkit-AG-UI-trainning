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
