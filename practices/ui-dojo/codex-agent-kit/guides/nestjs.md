# NestJS + TypeScript Guide

Override rules for NestJS services and APIs.

## Package Manager and Commands

```bash
npm run start:dev
npm run lint
npm run test
npm run test:e2e
npm run build
```

Use the lockfile-selected package manager and scripts from `package.json` rather than assuming npm.

## Project Conventions

- Organize modules around business capabilities, with explicit public providers and minimal cross-module coupling.
- Keep controllers focused on transport, services on application behavior, and repositories or adapters on persistence and integrations.
- Define DTOs for input and output; keep domain models separate from transport and ORM entities where boundaries matter.
- Centralize configuration with typed validation at startup.

## NestJS-Specific Rules

- Enable a global `ValidationPipe` with explicit transform and whitelist behavior appropriate to the contract.
- Apply guards for authentication and authorization; do not rely on decorators that lack an enforcing guard.
- Use exception filters or shared error mapping for stable, consumer-safe error responses.
- Avoid circular dependencies and broad global modules; use tokens and interfaces at integration boundaries.
- Bound external calls with timeouts, cancellation where available, and retry only for safe transient failures.
- Make queue consumers and command handlers idempotent when delivery can repeat.

## Persistence and Migrations

- Keep ORM transactions scoped to the invariant and avoid network calls while holding them open.
- Review generated SQL and use `workflows/data-migration.md` for production migrations and backfills.
- Do not enable automatic schema synchronization in production.

## Testing and Deployment

- Unit-test providers with narrow substitutes; use module and e2e tests for guards, pipes, filters, interceptors, and persistence wiring.
- Verify graceful shutdown, health endpoints, configuration validation, migrations, and worker processes.
- Run lint, unit tests, e2e tests, and build using CI-equivalent commands.
