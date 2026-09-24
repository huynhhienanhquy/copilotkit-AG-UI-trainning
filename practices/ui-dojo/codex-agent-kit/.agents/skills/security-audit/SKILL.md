---
name: security-audit
description: Audit application code and configuration for security vulnerabilities. Use for authentication, authorization, secrets, input handling, dependencies, web security, data exposure, or threat-focused review.
---


# Security Audit

## Workflow
1. Identify assets, actors, trust boundaries and entry points.
2. Test authentication and authorization separately.
3. Trace untrusted input to database, shell, HTML, URL, file system and deserialization.
4. Check secret handling, logging, CORS, cookies, sessions, CSRF and rate limits if relevant.
5. Check dependency/config for unsafe defaults.
6. Verify exploitability; Avoid reporting false positives based on patterns alone.
7. Recommended minimal remediation and protection testing.

## Finding format
- Severity
- Evidence
- Attack scenario
- Impact
- Remediation
- Verification

## Guardrails
- Do not access secrets, production data, or external systems beyond the authorized audit scope.
- Do not perform destructive exploitation or persistence; use the least-impactful proof that establishes exploitability.
- Do not report pattern-only findings without tracing a reachable source, sink, and missing control.

## Definition of done
The scoped trust boundaries and attack surfaces are reviewed, findings are evidence-backed and prioritized, remediation and verification steps are actionable, and coverage gaps and residual risks are explicit.
