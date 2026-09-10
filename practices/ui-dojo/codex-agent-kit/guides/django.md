# Django + Python Guide

Override rules for Django and Django REST Framework projects.

## Package Manager and Commands

```bash
python manage.py runserver
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
python -m pytest
python -m ruff check .
python -m mypy .
```

Use the repository's configured environment manager (`uv`, Poetry, pip-tools, or pip) and test runner when they differ.

## Project Conventions

- Keep settings split by environment without committing secrets.
- Put domain behavior in the owning app; keep views and serializers thin.
- Use services only when they clarify a multi-model or external-system operation.
- Treat model, serializer, permission, URL, admin, task, and migration changes as one compatibility surface.

## Django-Specific Rules

- Use the ORM and parameterized APIs; avoid raw SQL unless measured and reviewed.
- Prevent N+1 queries with deliberate `select_related`/`prefetch_related` and query-count tests where important.
- Validate authorization with DRF permission classes and object-level checks, not only serializer validation.
- Wrap multi-write invariants in `transaction.atomic`; keep external calls outside long database transactions.
- Review middleware order, CSRF, CORS, cookie, host, and proxy settings for the deployment topology.
- Make Celery or background tasks idempotent, retry only transient failures, and pass stable identifiers instead of serialized model objects.

## Migrations

- Inspect generated migrations; never assume `makemigrations` produced an operationally safe plan.
- Use `workflows/data-migration.md` for production schema changes, backfills, constraints, indexes, renames, and removals.
- Separate state and database operations only with a documented compatibility reason.
- Avoid large data migrations in a single transaction; use resumable management commands or jobs for substantial backfills.

## Testing and Deployment

- Test permissions, validation, transactions, signals, tasks, and query behavior at the narrowest useful level.
- Run `check --deploy` against production-like settings before release.
- Collect static assets and verify health checks, migrations, workers, and rollback order in the release plan.
