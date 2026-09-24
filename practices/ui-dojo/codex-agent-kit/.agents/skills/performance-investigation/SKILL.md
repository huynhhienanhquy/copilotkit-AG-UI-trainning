---
name: performance-investigation
description: Investigate and improve software performance using measurements. Use for latency, throughput, memory, CPU, database query, rendering, startup, or scalability problems. Avoid optimization based only on intuition.
---

# Performance Investigation

## Principle
Measure first, optimize the proven bottleneck, then measure again under the same conditions.

## Workflow
1. Convert complaints to metrics and targets: p50/p95/p99, throughput, CPU, memory or payload size.
2. Create a representative workload and record a baseline with environment, dataset, warmup and variance.
3. Profile end-to-end to find bottlenecks before optimizing a layer.
4. Generate testable hypotheses; change one key variable at a time.
5. Make the smallest fix, keeping correctness and resource bounds.
6. Compare before/after multiple times; Check regression at low load, high load and associated failure path.
7. Add benchmark or performance guard when results are stable enough to automate.

## Output
- Baseline and reproduction command
- Bottleneck with evidence
- Changes and trade-offs
- Before/after results
- Limits of measurement

## Guardrails
Do not use microbenchmarks to extrapolate the entire system if the real bottleneck is in I/O, contention or downstream services.

## Definition of done
The bottleneck is demonstrated with a reproducible baseline, the change improves the target metric under comparable conditions without correctness regressions, and measurement limits and trade-offs are documented.
