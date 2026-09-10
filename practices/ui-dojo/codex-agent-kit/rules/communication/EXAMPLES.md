# Communication Examples

Examples demonstrating concise, informative progress updates, structured final reports, and trade-off presentations.

---

## 1. Milestone & Blocker Updates

### Good: Concise Milestone Notification
```markdown
Completed database migration and unit tests for `UserPreferences`. Moving on to frontend form integration in `src/pages/Settings/`.
```

### Good: Clear Blocker with Actionable Question
```markdown
**Blocker**: The endpoint `/api/v1/payments/refund` requires an `apiKey` that is missing in `.env.example`.
- Option A: Mock the payment gateway locally using `MockPaymentClient`.
- Option B: Provide a test sandbox key to test against live staging.
- *Default recommended*: Option A (unblocks unit and integration testing without external credentials).
```

### Bad: Raw Unfiltered Log Dump
```markdown
[Huge 500-line npm install and build log containing irrelevant warnings and node_modules notices...]
Done!
```

---

## 2. Final Task Report Structure

### Good: Comprehensive & Verifiable Final Report
```markdown
## Task Completion: Add OAuth2 Refresh Token Rotation

### Changes Made
- `src/services/tokenService.ts`: Implemented `rotateRefreshToken` with reuse detection and database invalidation.
- `src/controllers/authController.ts`: Updated `/api/auth/refresh` endpoint to exchange token pairs.
- `src/services/__tests__/tokenService.test.ts`: Added unit tests covering successful rotation, expired tokens, and revoked family tokens.

### Verification Performed
- Ran unit tests: `npm test -- tokenService.test.ts` (All 8 tests passed).
- Ran TypeScript compilation: `npm run typecheck` (0 errors).
- Ran linter: `npm run lint` (Clean).

### Residual Risks & Assumptions
- Assumes Redis cache cluster is configured with TTL support in production.
- Existing active sessions will need to re-authenticate on next token expiry.
```

---

## 3. Presenting Architectural Options

### Good: Clear Comparison with Default Recommendation
```markdown
We need to handle caching for high-traffic product listings.

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Option 1: In-memory LRU Cache** | Zero external dependencies, fast setup | Not shared across multiple container replicas | Good for dev/testing |
| **Option 2: Redis Distributed Cache** | Shared across all replicas, persistence, TTL support | Requires Redis instance | **(Recommended)** Matches production architecture |

Proceeding with **Option 2** using the existing `redisClient` module.
```
