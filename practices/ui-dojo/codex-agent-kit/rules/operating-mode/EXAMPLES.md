# Operating Mode Examples

Examples demonstrating autonomous task execution, scoping discipline, and conservative assumption handling.

---

## 1. Autonomous Task Workflow

### Good: End-to-End Execution Flow
```text
Task: "Add pagination to the GET /api/v1/products endpoint"

Execution:
1. Discovery: Read `src/controllers/productController.ts` and `src/services/productService.ts`. Check existing pagination patterns in `orderController.ts`.
2. Plan:
   - Accept `page` and `limit` query parameters with defaults (page=1, limit=20, maxLimit=100).
   - Update repository to execute `LIMIT` and `OFFSET` queries alongside total count.
   - Return `{ data: Product[], pagination: { page, limit, totalItems, totalPages } }`.
3. Implementation: Apply minimal changes to schema, controller, service, and repository.
4. Testing: Add unit tests in `productService.test.ts` for boundary values (limit > 100, page 0, negative values).
5. Verification: Run `npm test -- productService.test.ts` and `npm run typecheck`.
6. Report: Summarize changes and verified test results without unnecessary prompts.
```

---

## 2. Asking vs Making Documented Assumptions

### Safe Assumption (Proceed & Document)
- **Scenario**: The user asked for a new `formatPhoneNumber` helper function but did not specify formatting for international numbers.
- **Action**: Implement standard E.164 parsing with local fallback, and document the assumption clearly in the final report:
  > *Assumption: Implemented standard E.164 format for international country codes and US (XXX) XXX-XXXX format as default.*

### High-Risk Ambiguity (Stop and Ask)
- **Scenario**: The user asked to "Clean up old user accounts".
- **Action**: Do **not** guess whether to soft-delete, hard-delete, or what the inactive age cutoff is.
  > *Question: Should accounts be soft-deleted (marked `is_active: false`) or permanently deleted? What is the inactivity threshold (e.g., 90 days, 1 year)?*
