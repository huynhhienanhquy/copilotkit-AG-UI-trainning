# Performance Optimization Workflow

## Use when
Proactively improving latency, throughput, memory, bundle size, rendering speed, query performance, or startup time before problems occur or when targets are not met.

## Workflow
1. Define the target metric and acceptable trade-offs.
2. Measure baseline under representative conditions; record environment, dataset, and load.
3. Profile to identify the bottleneck; do not guess the layer.
4. Choose the smallest change with highest expected impact.
5. Implement the optimization while preserving correctness.
6. Re-measure under the same conditions; compare before/after.
7. Document the trade-off: what improved, what may regress, and acceptance threshold.
8. Add a performance guard when the result is stable.

## Decision gates
- Do not optimize without measurement.
- Do not add caching without invalidation strategy.
- Do not sacrifice correctness or maintainability for micro-optimizations.
- Escalate when optimization requires infrastructure changes or architectural decisions.

## Done when
Target metric improved with evidence, correctness preserved, trade-offs documented, and no unintended regression.
