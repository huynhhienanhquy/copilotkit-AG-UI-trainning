---
name: performance-optimization
description: Proactively optimize performance before problems occur. Use for improving latency, throughput, memory usage, bundle size, rendering speed, query performance, or startup time. Measure before and after to validate improvements.
---

# Performance Optimization

## Goal
Improve performance measurably without sacrificing correctness, maintainability, or reliability.

## Trigger conditions
- User requests performance improvement
- Bundle size reduction needed
- API response time targets not met
- Database query optimization needed
- Frontend rendering or load time issues
- Memory usage optimization required

## Workflow
1. Define the target metric and acceptable trade-offs (latency, throughput, memory, bundle size).
2. Measure baseline under representative conditions; record environment, dataset, and load.
3. Identify the optimization layer: frontend bundle, rendering, API, database, network, or infrastructure.
4. Choose the smallest change with highest expected impact.
5. Implement the optimization while preserving correctness and edge-case handling.
6. Re-measure under the same conditions; compare before/after.
7. Document the trade-off: what improved, what may regress, and acceptance threshold.
8. Add a performance guard (benchmark, budget, or CI check) when the result is stable.

## Guardrails
- Do not optimize without measurement; do not assume the bottleneck.
- Do not sacrifice correctness, readability, or maintainability for micro-optimizations.
- Do not add caching without invalidation strategy.
- Do not optimize code paths that are not on the critical path.

## Definition of done
- Target metric improved with evidence.
- Correctness tests still pass.
- Trade-offs documented.
- No regression in other measurable dimensions.
