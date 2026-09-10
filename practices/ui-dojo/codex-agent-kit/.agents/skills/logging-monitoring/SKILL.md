---
name: logging-monitoring
description: Set up structured logging, metrics, health checks, and alerting. Use when adding observability to new features, diagnosing production issues, configuring alerts, or improving operational visibility.
---

# Logging and Monitoring

## Goal
Ensure production systems are observable: errors are visible, performance is measurable, and issues can be diagnosed without code changes.

## Trigger conditions
- Adding observability to new features
- Diagnosing production issues
- Configuring alerts or health checks
- Improving operational visibility
- Setting up dashboards or SLOs

## Workflow
1. Identify what needs to be observed: errors, performance, business metrics, or system health.
2. Define log levels and structured fields for the feature or service.
3. Add structured logs at key decision points: entry, error, boundary, and completion.
4. Define metrics: counters for events, histograms for latency, gauges for state.
5. Set up health checks that verify critical dependencies.
6. Configure alerts tied to user-impact signals, not vanity metrics.
7. Verify logs, metrics, and alerts work in staging before production.
8. Document what is logged, what is measured, and how to query it.

## Guardrails
- Do not log secrets, tokens, passwords, or unnecessary PII.
- Do not log at debug level in production without a toggle.
- Do not create alerts that fire frequently without actionable response.
- Do not use high-cardinality values as metric labels.

## Definition of done
- Structured logs are present at key decision points with correlation IDs.
- Metrics cover latency, error rate, and throughput for the feature.
- Health checks verify critical dependencies.
- Alerts are tied to user-impact and have runbooks.
