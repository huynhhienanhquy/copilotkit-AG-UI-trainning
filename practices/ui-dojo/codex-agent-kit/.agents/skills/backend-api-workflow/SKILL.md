---
name: backend-api-workflow
description: Implement or modify backend APIs and services. Use for routes, controllers, business logic, persistence, external integrations, jobs, and server-side tests.
---


# Backend API Workflow

## Workflow
1. Determine contract: request, response, status, errors and authorization.
2. Trace from transport to domain and persistence.
3. Validate input at boundary.
4. Keep business rules in the appropriate layer, don't stuff them all into the controller.
5. Handles transactions, idempotency and concurrency if written.
6. External calls must have appropriate timeout and error mapping.
7. Log is structured, does not reveal secrets/PII.
8. Add unit/integration tests and run migration checks if there are schema changes.

## Guardrails
- Do not expose internal errors, secrets, or unnecessary PII in responses or logs.
- Do not weaken authorization, validation, transaction safety, or idempotency to make a test pass.
- Do not ship a schema-affecting change without a compatible migration and recovery plan.

## Definition of done
The API contract and authorization behavior are preserved or documented, success and failure paths are tested, external calls are bounded, and relevant lint, type, test, and migration checks pass.
