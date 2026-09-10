# Data Migration Workflow

## Use when
Designing, implementing, reviewing, or operating schema changes, backfills, data transformations, index or constraint changes, and destructive cleanup.

## Workflow
1. Establish the owner, target environment, authorization boundary, maintenance constraints, and business impact of failure.
2. Inventory the current schema, data volume and growth, access patterns, dependencies, readers and writers, replicas, and application versions that may overlap.
3. Classify each operation as additive schema, backfill, constraint or index, semantic conversion, cutover, or destructive cleanup; split operations with different failure boundaries.
4. Measure lock behavior, transaction duration, replication lag, disk and log growth, resource load, and expected runtime on representative data.
5. Choose a compatibility strategy, preferring expand-and-contract when old and new application versions may run concurrently.
6. Define executable pre-checks, invariants, verification queries, progress metrics, abort thresholds, and a tested restore, rollback, or forward-fix procedure.
7. Implement backfills as idempotent, resumable, observable batches with checkpoints, bounded retries, throttling, and safe restart behavior.
8. Rehearse the migration and recovery procedure on representative non-production data; verify both old and new application versions when rollout overlaps.
9. Roll out in stages under explicit authorization, monitor the defined signals, and stop or recover when an abort threshold is crossed.
10. Verify counts, constraints, application behavior, replication health, and business invariants before declaring cutover complete.
11. Remove old columns, data, compatibility code, or indexes only after proving all readers and writers have migrated and the cleanup has separate approval.

## Decision gates
- **Gate 1 — Scope:** Do not implement until owners, affected data, dependencies, volume, and concurrent application versions are known.
- **Gate 2 — Safety design:** Do not approve execution without compatibility analysis, measurable invariants, abort thresholds, and a recovery path whose restore steps are understood.
- **Gate 3 — Rehearsal:** Do not run against production until representative rehearsal demonstrates acceptable locks, runtime, resource use, restart behavior, and recovery.
- **Gate 4 — Production authorization:** A reviewed plan does not authorize execution. Production writes, cutovers, and destructive operations require explicit environment-specific approval.
- **Gate 5 — Cutover:** Do not switch readers or writers until pre-checks pass and mixed-version behavior is verified where applicable.
- **Gate 6 — Cleanup:** Do not delete or rename data or schema until telemetry and dependency checks prove the legacy path is unused and the recovery window has passed.
- If evidence is missing or an abort threshold is reached, stop; preserve diagnostics and choose rollback or forward-fix according to the approved plan.

## Done when
The migration is staged and recoverable, all decision gates have evidence, data and application invariants pass, operational outcomes are recorded, and any destructive cleanup is either safely completed under separate approval or tracked as explicit follow-up.
