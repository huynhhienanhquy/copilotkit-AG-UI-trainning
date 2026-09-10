# Go Service Guide

Override rules for Go HTTP, RPC, worker, and service repositories.

## Toolchain and Commands

```bash
go test ./...
go test -race ./...
go vet ./...
go build ./...
gofmt -w <changed-files>
```

Use the Go version and additional linters pinned by `go.mod`, toolchain directives, CI, or repository configuration.

## Project Conventions

- Follow the existing package layout; do not introduce `pkg/`, `internal/`, or layered directories without a concrete repository need.
- Keep packages cohesive and interfaces owned by consumers.
- Pass `context.Context` explicitly through request and I/O boundaries; do not store it in structs.
- Wrap errors with operation context while preserving identity for `errors.Is` and `errors.As`.

## Go-Specific Rules

- Bound goroutines, queues, I/O, retries, and response sizes; propagate cancellation and deadlines.
- Make goroutine ownership and shutdown explicit; prevent leaks and blocked sends.
- Protect shared state with clear synchronization and verify concurrency-sensitive code with the race detector.
- Use parameterized database APIs and close rows, bodies, files, and other resources on every path.
- Avoid `panic` for expected errors; recover only at deliberate process or request boundaries with safe reporting.
- Keep configuration typed and validated at startup; never log secret values.

## Data and APIs

- Define stable request, response, and error contracts; validate input at the boundary.
- Use `workflows/data-migration.md` for schema changes, backfills, cutovers, and destructive cleanup.
- Keep transactions short and make retryable write operations idempotent.

## Testing and Deployment

- Prefer table-driven tests where cases share behavior, and integration tests for database and protocol boundaries.
- Run focused tests first, then `go test ./...`, `go test -race ./...`, vet, and build as applicable.
- Verify graceful shutdown, health signals, resource limits, migration order, and rollback behavior before release.
