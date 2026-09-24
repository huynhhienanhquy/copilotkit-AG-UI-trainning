---
name: api-design
description: Design or review API contracts, endpoints, schemas, and versioning. Use when creating new APIs, refactoring existing endpoints, defining request/response formats, or reviewing API design for consistency and usability.
---

# API Design

## Goal
Design APIs that are consistent, predictable, backward-compatible, and easy for consumers to use correctly.

## Trigger conditions
- Designing new endpoints or resources
- Refactoring existing API structure
- Defining request/response schemas
- Reviewing API contracts for consistency
- Planning API versioning strategy

## Workflow
1. Identify the resource, actors, and intended use cases.
2. Define the contract: HTTP method, path, request schema, response schema, status codes, and error format.
3. Choose a naming convention that matches the existing API style (REST, RPC, or GraphQL patterns).
4. Design error responses with consistent structure: code, message, and actionable detail.
5. Determine versioning strategy: URL path, header, or content negotiation.
6. Consider pagination, filtering, sorting, and field selection for list endpoints.
7. Define authorization boundaries per endpoint and field-level access if needed.
8. Document the contract with examples for success, validation error, and authorization error paths.
9. Review for backward compatibility, breaking changes, and migration path if needed.

## Guardrails
- Do not break existing consumers without a documented migration path.
- Do not expose internal implementation details in response shapes.
- Do not use ambiguous resource names; prefer noun-based plural paths.
- Do not return undocumented status codes or error shapes.
- Validate input at the boundary; do not trust client data.

## Definition of done
- Contract is defined with path, method, request/response schemas, status codes, and error format.
- Naming follows existing API conventions or a documented standard.
- Backward compatibility is assessed and breaking changes have a migration plan.
- Examples cover success, validation error, and authorization error paths.
- Consumer impact is documented.
