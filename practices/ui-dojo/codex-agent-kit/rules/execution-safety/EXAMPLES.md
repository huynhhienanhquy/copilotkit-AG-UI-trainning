# Execution Safety Examples

Examples demonstrating safe execution protocols, explicit scoping, and prevention of destructive commands.

---

## 1. High-Risk Command Safety & Safe Alternatives

### Destructive Filesystem Operations
- **High-Risk (Prohibited without explicit approval)**:
  ```bash
  rm -rf /
  rm -rf *
  Remove-Item -Recurse -Force .
  ```
- **Safe Alternative (Explicit, scoped target)**:
  ```bash
  # Delete only the specific build artifact folder inside verified directory
  rm -rf ./dist/build-cache
  # Or use temporary fixtures that clean themselves up
  ```

### Destructive Git Operations
- **High-Risk (Prohibited without explicit approval)**:
  ```bash
  git reset --hard HEAD~5
  git push --force origin main
  git clean -fxd
  ```
- **Safe Alternative (Non-destructive inspection and staging)**:
  ```bash
  # Inspect differences first
  git status
  git diff
  # Use stash to preserve work safely
  git stash push -m "Pre-experiment backup"
  ```

### Destructive Database Operations
- **High-Risk (Prohibited without explicit approval)**:
  ```sql
  DROP DATABASE production_db;
  TRUNCATE TABLE users;
  ```
- **Safe Alternative (Dry runs, transactions, and backups)**:
  ```sql
  BEGIN;
  DELETE FROM staging_users WHERE is_test_account = true;
  -- Verify affected row count before committing
  SELECT count(*) FROM staging_users WHERE is_test_account = true;
  COMMIT;
  ```

---

## 2. High-Impact Action Confirmation Protocol

### Good: Clear Confirmation Request Before Executing High-Impact Actions
```markdown
**Confirmation Required Before Proceeding**:
- **Operation**: Publishing package to npm registry.
- **Command**: `npm publish --access public`
- **Target Package**: `@myorg/core-utils@2.0.0`
- **Blast Radius**: Immutable public artifact release affecting all downstream consumers.
- **Rollback Plan**: Deprecate version with `npm deprecate` if critical flaws are identified.

Please confirm whether you would like to proceed with publishing.
```

### Bad: Auto-Executing Irreversible Actions Without Prompting
```bash
# Bad: Silently publishing packages or dropping remote database tables without asking
npm publish
```
