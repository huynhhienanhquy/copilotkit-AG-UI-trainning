# Planning Examples

Examples demonstrating actionable, verifiable implementation plans for multi-file tasks.

---

## 1. Five-Stage Implementation Plan Format

### Example: Migrating Session Storage from In-Memory to Redis

```markdown
# Implementation Plan: Redis Session Store Migration

## 1. Survey & Context Discovery
- Current session handling resides in `src/middleware/sessionMiddleware.ts`.
- Redis client singleton is already available at `src/lib/redis.ts`.
- Environment variable `REDIS_URL` is configured in `.env.example`.

## 2. Minimal Implementation
- Step 2.1: Update `src/lib/sessionStore.ts` to implement `connect-redis` store adapter.
- Step 2.2: Add fallback to memory store in local test environment when `NODE_ENV === "test"`.
- Step 2.3: Configure TTL (24 hours) and session serialization.

## 3. Test & Verification
- Add integration test in `src/middleware/__tests__/sessionMiddleware.test.ts` using `ioredis-mock`.
- Test session creation, session retrieval across requests, and session invalidation on logout.
- Run `npm test -- sessionMiddleware.test.ts`.
- Run `npm run typecheck` and `npm run lint`.

## 4. Review Diff
- Verify no secrets or test credentials are committed.
- Verify existing session cookie names and flags (`HttpOnly`, `SameSite=Lax`, `Secure`) remain unchanged.

## 5. Report & Rollback Path
- Summarize changes and verified test output.
- Rollback plan: Revert `sessionMiddleware.ts` commit to restore in-memory store if Redis connectivity fails.
```

---

## 2. Updating Plans Dynamically

### Good: Adjusting Plan When New Dependencies Are Discovered
```markdown
> [!NOTE]
> During Step 2.1 survey, discovered that `express-session` types require `@types/connect-redis@^0.0.23`.
> Updated Step 2 to install development types before updating `sessionStore.ts`.
```
