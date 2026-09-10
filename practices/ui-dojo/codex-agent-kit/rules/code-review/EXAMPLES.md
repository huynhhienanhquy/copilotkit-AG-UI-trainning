# Code Review Examples

Examples demonstrating high-signal, actionable code review findings categorized by severity.

---

## 1. Finding Severity Categorization

### P0 Finding Example (Data Loss / Critical Security Risk)
```markdown
### [P0] Critical: SQL Injection in User Search Endpoint
- **Location**: `src/services/userService.ts:42`
- **Situation**: User input `req.query.q` is concatenated directly into the raw SQL query string:
  ```ts
  const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`;
  ```
- **Impact**: Allows attackers to execute arbitrary SQL statements, bypass authentication, and exfiltrate customer databases.
- **Safe Fix**: Use parameterized queries:
  ```ts
  const query = 'SELECT * FROM users WHERE name ILIKE $1';
  return db.query(query, [`%${searchTerm}%`]);
  ```
```

### P1 Finding Example (Production Bug / Race Condition)
```markdown
### [P1] High: Missing Transaction / Race Condition on Inventory Deduction
- **Location**: `src/services/checkoutService.ts:88`
- **Situation**: Checking stock availability and decrementing inventory are two separate, non-atomic database queries.
- **Impact**: Concurrent requests can oversell inventory below zero.
- **Safe Fix**: Wrap the operations inside an isolated database transaction with row-level locking (`SELECT FOR UPDATE`) or an atomic update:
  ```sql
  UPDATE inventory SET stock = stock - :qty WHERE id = :id AND stock >= :qty;
  ```
```

### P2 Finding Example (Functional Edge Case / Maintainability Bug)
```markdown
### [P2] Medium: Unhandled Promise Rejection on Async Analytics Ping
- **Location**: `src/controllers/authController.ts:114`
- **Situation**: `analyticsClient.trackLogin(user.id)` is called asynchronously without a `.catch()` block or `await`.
- **Impact**: If the analytics service is unreachable or responds with a 500 error, Node.js will trigger an unhandled rejection and potentially crash the process.
- **Safe Fix**: Add safe error swallowing or background task error handler:
  ```ts
  analyticsClient.trackLogin(user.id).catch((err) => logger.warn("Failed to record login analytics", { err }));
  ```
```

### P3 Finding Example (Non-blocking Improvement / Suggestion)
```markdown
### [P3] Low / Nit: Typo in Internal Metric Name
- **Location**: `src/metrics/counters.ts:15`
- **Situation**: Metric name is spelled `user_subscripton_count`.
- **Impact**: Minor typo in dashboard visualization.
- **Safe Fix**: Rename to `user_subscription_count` before shipping to avoid breaking telemetry dashboards later.
```

---

## 2. Review Summary When No Issues Are Found

### Good: Explicit Testing Scope and Residual Risk
```markdown
## Code Review Summary: Clean Pass

### Scope Reviewed
- Reviewed diff in `src/utils/dateHelpers.ts` and `src/utils/__tests__/dateHelpers.test.ts`.
- Verified timezone boundary handling for leap years and daylight saving time transitions.

### Verification Performed
- Ran `npm test -- src/utils/__tests__/dateHelpers.test.ts` (14/14 tests passing).
- Checked bundle impact and verified no new external dependencies were introduced.

### Residual Risks & Notes
- Relies on standard JavaScript `Intl.DateTimeFormat`; ensure target runtime supports ECMAScript 2022.
```
