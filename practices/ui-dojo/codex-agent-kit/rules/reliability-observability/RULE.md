# Reliability and Observability

## Purpose
Make production behavior resilient, bounded, observable, and diagnosable.

## Rules
- Set explicit timeouts for external calls. Retry only transient failures, use bounded backoff and jitter, and protect non-idempotent operations from duplicate effects.
- Bound concurrency, queues, payload sizes, memory, and other resource usage; apply backpressure or load shedding instead of allowing unbounded growth.
- Propagate cancellation and deadlines when the stack supports them; do not orphan background work or swallow errors.
- Emit structured logs with useful correlation context without exposing secrets, tokens, or unnecessary personal data.
- Add appropriate signals for important behavior, such as error reporting, metrics, traces, health checks, or audit events, following project conventions.
- Tie alerts to actionable user or system impact; avoid uncontrolled log volume and high-cardinality dimensions.
- Define rollout, rollback, abort thresholds, and observable post-release checks for high-risk changes.
