# Data and Migrations

## Purpose
Reduce the risk of data loss, downtime and incompatibility when making permanent changes to schema or data.

## Rules
- Determine volume, lock behavior, transaction boundaries, and rollback capabilities before migrations with write or schema changes.
- Prioritize expand-and-contract when old and new applications can run concurrently.
- Separate schema changes, backfills and cleanups as combining them increases lock time or makes rollback difficult.
- Backfill must be resumable, idempotent, have batching/checkpoint when the data is large and have a way to measure progress.
- Do not delete or rename columns/data before verifying all readers and writers have converted.
- Verify relevant constraints, indexes, default values, timezone, encoding and precision.
- There are pre-check, post-check and recovery plans; Backup is not considered valid if you do not know how to restore.
