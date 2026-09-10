# Incident Response Workflow

## Use when
Responding to an active or suspected production incident involving availability, security, data integrity, or severe degradation.

## Workflow
1. Confirm the incident channel, incident commander, authorization boundary, severity, affected users, and current impact.
2. Preserve evidence and establish a timestamped timeline; avoid exposing secrets or sensitive customer data.
3. Stabilize first using the safest reversible mitigation: pause rollout, disable a feature, reduce traffic, fail over, or roll back when authorized.
4. Inspect metrics, logs, traces, recent changes, dependency status, and capacity to narrow the failure domain.
5. Form and test one hypothesis at a time; record commands, observations, decisions, owners, and outcomes.
6. Apply the smallest authorized remediation, verify recovery with user-impact signals, and watch for recurrence.
7. Communicate concise status, impact, mitigation, next action, owner, and next update time through the approved channel.
8. Preserve relevant artifacts and hand off ongoing monitoring before ending active response.
9. After stabilization, document root cause, contributing factors, detection gaps, corrective actions, and prevention work without blame.

## Decision gates
- Do not trade data integrity or security for availability without explicit incident-command approval.
- Do not run destructive commands, modify production, contact customers, or disclose incident details beyond granted authority.
- If evidence conflicts, prefer reversible containment and additional observation over broad speculative changes.

## Done when
Impact is contained, recovery is verified through reliable signals, ownership is handed off, and follow-up actions are recorded.
