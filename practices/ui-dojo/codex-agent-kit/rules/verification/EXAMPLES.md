# Verification Examples

Examples demonstrating multi-tiered verification workflows, test discovery, and diff auditing.

---

## 1. Multi-Tier Verification Workflow

### Good: Tiered Execution from Focused to Broad
```text
Task: "Add discount calculation logic to checkoutService.ts"

Step 1 (Focused Unit Test):
$ npm test -- src/services/__tests__/checkoutService.test.ts
-> PASS: 6 passed, 6 total

Step 2 (Typecheck & Lint):
$ npm run type-check
-> Found 0 errors.
$ npm run lint
-> Clean.

Step 3 (Integration / Full Suite if feasible):
$ npm test -- src/integration/checkoutFlow.test.ts
-> PASS: 3 passed, 3 total

Step 4 (Final Diff Inspection):
$ git diff
-> Verified: Only checkoutService.ts and checkoutService.test.ts are modified. No console.log or temporary debug code.
```

---

## 2. Test Command Discovery by Tech Stack

| Ecosystem | Discovery Source | Example Verification Command |
|---|---|---|
| **Node / TypeScript** | `package.json` | `npm test -- <path-to-test>`, `npm run type-check`, `npm run lint` |
| **Python (pytest)** | `pyproject.toml` / `setup.cfg` | `pytest tests/unit/test_checkout.py -v`, `mypy src/` |
| **Rust** | `Cargo.toml` | `cargo test checkout::tests`, `cargo clippy` |
| **Go** | `go.mod` | `go test -v ./services/checkout/...`, `golangci-lint run` |
| **Make / Monorepo** | `Makefile` | `make test`, `make lint` |

---

## 3. Reporting When Tests Cannot Be Run Locally

### Good: Transparent Reporting of Verification Constraints
```markdown
### Verification Summary
- **Focused Unit Tests**: Executed `npm test -- src/utils/formatters.test.ts` (10/10 tests passed).
- **Static Analysis**: Executed `npm run typecheck` (0 errors).
- **End-to-End Tests**: Skipped `npm run test:e2e` because the local environment lacks Docker credentials for the live payment mock container. Recommended running in CI pipeline.
```

### Bad: False Claims of Verification
```markdown
All tests passed and verified! (When no command was actually executed)
```
