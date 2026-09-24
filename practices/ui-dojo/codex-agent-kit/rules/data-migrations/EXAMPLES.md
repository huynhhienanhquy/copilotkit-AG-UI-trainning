# Data and Migrations Examples

Examples demonstrating zero-downtime schema evolution, idempotent backfills, and safe database operations.

---

## 1. Zero-Downtime Expand-and-Contract Migration (Renaming / Changing a Column)

### Good: Multi-Step Phased Rollout
1. **Phase 1 (Expand)**: Add the new column as nullable, do not drop old column yet.
   ```sql
   ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
   ```
2. **Phase 2 (Dual-Write / Read Old)**: Update application code to write to both `first_name + last_name` AND `full_name`. Read from old column with fallback.
3. **Phase 3 (Backfill)**: Run an idempotent batch script to populate `full_name` for historical rows.
4. **Phase 4 (Switch Reads)**: Update application code to read exclusively from `full_name`.
5. **Phase 5 (Contract / Cleanup)**: Remove dual-writes, mark old columns deprecated, and eventually drop them:
   ```sql
   ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
   ```

### Bad: Immediate Breaking Column Rename
```sql
-- Bad: Renaming active column directly causes immediate downtime for running application instances
ALTER TABLE users RENAME COLUMN first_name TO full_name;
```

---

## 2. Resumable Batch Backfill Script

### Good: Batched, Resumable, and Rate-Limited Backfill
```typescript
export async function backfillUserFullName(db: Database, batchSize = 500) {
  let lastProcessedId = 0;
  let totalProcessed = 0;

  while (true) {
    // 1. Fetch chunk using indexed primary key
    const users = await db.query(
      `SELECT id, first_name, last_name FROM users
       WHERE id > $1 AND full_name IS NULL
       ORDER BY id ASC LIMIT $2`,
      [lastProcessedId, batchSize]
    );

    if (users.length === 0) {
      console.log(`Backfill complete. Total records updated: ${totalProcessed}`);
      break;
    }

    // 2. Perform batched update inside a short transaction
    await db.transaction(async (trx) => {
      for (const user of users) {
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        await trx.query(
          `UPDATE users SET full_name = $1 WHERE id = $2`,
          [fullName, user.id]
        );
      }
    });

    totalProcessed += users.length;
    lastProcessedId = users[users.length - 1].id;
    console.log(`Processed ${totalProcessed} users. Checkpoint ID: ${lastProcessedId}`);

    // 3. Pause briefly to release locks and prevent connection pool starvation
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
```

### Bad: Non-Batched Full Table Update
```sql
-- Bad: Locks entire table of 10 million rows, causing connection timeouts and write blocking
UPDATE users SET full_name = CONCAT(first_name, ' ', last_name);
```

---

## 3. Safe Migration Checks and Rollback Plan

### Good: Pre-check, Short Lock Timeout, and Reversible DDL
```sql
-- migration: 20260908_add_index_users_email.sql

-- Set lock timeout so migration aborts rather than holding long table locks
SET lock_timeout = '5s';

-- Create index concurrently (PostgreSQL) to avoid blocking reads/writes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- Down migration / Rollback plan:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_lower;
```
