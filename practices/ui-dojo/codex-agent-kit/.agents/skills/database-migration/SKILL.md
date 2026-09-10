---
name: database-migration
description: Design, implement, or review database schema changes and data migrations. Use for DDL, backfills, index changes, data transformations, compatibility rollouts, and migration rollback planning.
---

# Database Migration

## Workflow
1. Determine the current schema, data volume, access patterns, and application version that will run together.
2. Classify the change as additive, backfill, constraint/index, destructive, or semantic.
3. Choose a safe rollout; Use expand-and-contract when backward compatibility is needed.
4. Design backfills that are idempotent, resumable, and batched when data can be large.
5. Evaluate locks, transaction duration, replication lag, disk usage and mid-process failures.
6. Write executable pre-check, post-check and rollback/recovery procedures.
7. Run migration on representative test data; Verify both old and new applications if the rollout overlaps versions.
8. Perform destructive cleanup only after proving that no dependent readers or writers remain.

## Deliverable
- Rollout order
- Compatibility assumptions
- Verification queries
- Rollback or forward-fix path
- Remaining operational risks

## Guardrails
Do not treat “a backup exists” as a substitute for a proven recovery plan. Do not combine DDL, a large backfill, and cleanup when they require different failure boundaries.

## Definition of done
The migration has passed the applicable gates in `workflows/data-migration.md`, compatibility and operational risks are measured, verification and recovery procedures are executable, and destructive cleanup remains separately authorized.
