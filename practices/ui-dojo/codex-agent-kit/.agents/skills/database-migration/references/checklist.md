# Database migration checklist

- [ ] Data volume and compatibility window defined.
- [ ] Evaluated lock, transaction and resource impact.
- [ ] Backfill can be resumed and run again safely.
- [ ] There are pre-check, post-check and progress signal.
- [ ] Has the actual rollback or forward-fix path.
- [ ] Destructive cleanup is separated and has clear conditions.
