# API Design Workflow

## Use when
Designing new endpoints, refactoring API structure, defining request/response schemas, or reviewing API contracts for consistency and usability.

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
10. Write or update schema definitions, OpenAPI spec, or type definitions.

## Decision gates
- Do not break existing consumers without a documented migration path.
- Do not expose internal implementation details in response shapes.
- If the contract conflicts with an existing API convention, stop and align first.
- Escalate when the design requires cross-team coordination or external partner review.

## Done when
The contract is defined, documented, consistent with existing APIs, and consumer impact is assessed.
