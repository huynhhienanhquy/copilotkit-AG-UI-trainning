---
name: release-readiness
description: Assess whether a branch or release candidate is ready to ship. Use before deployment, release, merge, or handoff to verify quality, migrations, configuration, observability, and rollback readiness.
---


# Release Readiness

## Checklist
1. Check diff and release range.
2. Run required CI-equivalent commands.
3. Verify config/env vars, secrets references and feature flags.
4. Check migration order, compatibility and rollback.
5. Verify logging, metrics or error reporting for new behavior.
6. Check release notes and user-facing breaking changes.
7. List blockers, warnings and go/no-go recommendations.

## Output
- Go / Go with conditions / No-go
- Evidence
- Blockers
- Rollback plan
- Post-release checks

## Guardrails
- A readiness assessment does not authorize publish, merge, deploy, tag, or production migration actions.
- Do not mark a failed or missing gate as passing without explicit risk acceptance and an owner.
- Do not recommend rollout without observable abort thresholds and a workable recovery path.

## Definition of done
The go/no-go recommendation is supported by current evidence, blockers and conditions have owners, and rollout, rollback, migration, observability, and post-release checks are actionable.
