# Git Safety Examples

Examples demonstrating safe git workflows, atomic commits, and safe merge conflict resolution.

---

## 1. Pre-Operation Checks and Safe Staging

### Good: Always Inspect Status and Diffs
```bash
# 1. Inspect current branch and uncommitted modifications
git status

# 2. Check exact diff before staging
git diff

# 3. Stage only files related to the specific task/fix
git add src/services/authService.ts src/services/__tests__/authService.test.ts

# 4. Verify staged changes
git diff --cached
```

### Bad: Indiscriminate Staging
```bash
# Bad: Stages unrelated modified files, temp files, and accidental secret files
git add .
git commit -m "update"
```

---

## 2. Commit Message Standards (Conventional Commits)

### Good: Purposeful, Scoped Commit Messages
```text
feat(auth): add rate limiting to password reset endpoint

- Limit password reset requests to 5 per hour per IP.
- Return 429 Too Many Requests with retry-after header.
- Add unit tests for rate limiter middleware.
```

```text
fix(checkout): resolve race condition in coupon code deduction

Wrap inventory check and discount application in database transaction.
Fixes #142.
```

### Bad: Vague or Meaningless Messages
```text
fixed stuff
wip
asdf
changes
```

---

## 3. Resolving Merge Conflicts

### Good: Understanding Both Intentions and Re-Verifying
1. **Inspect Conflict Markers**:
   ```typescript
   <<<<<<< HEAD
   const timeoutMs = 5000; // Local branch updated timeout to 5s
   =======
   const timeoutMs = config.apiTimeoutMs; // Main branch moved timeout to config
   >>>>>>> main
   ```
2. **Combine Intent Safely**:
   ```typescript
   // Respect both intents: use config with default fallback to 5000ms
   const timeoutMs = config.apiTimeoutMs ?? 5000;
   ```
3. **Run Test Suite to Verify**:
   ```bash
   npm test
   ```

### Bad: Blindly Accepting One Side Without Testing
```bash
# Bad: Forcing ours/theirs without understanding context or running tests
git checkout --ours src/config.ts
```
