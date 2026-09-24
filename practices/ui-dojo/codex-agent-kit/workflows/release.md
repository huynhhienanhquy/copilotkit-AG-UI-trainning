# Release Workflow

## Use when
Assessing or preparing a branch, version, package, or deployment candidate for release.

## Workflow
1. Establish release scope, target environment, version, owner, and authorization boundary.
2. Inspect the complete release diff, dependency changes, CI results, configuration, feature flags, and generated artifacts.
3. Run or verify required tests, lint, typecheck, build, packaging, and security gates in a clean environment.
4. Validate migration order, mixed-version compatibility, backfills, rollback or forward-fix paths, and data recovery checks.
5. Confirm required secrets references, permissions, resource limits, observability, alerts, and health checks without exposing sensitive values.
6. Prepare release notes, breaking-change guidance, operator steps, and user-facing migration instructions.
7. Define staged rollout, abort thresholds, rollback steps, and post-release verification signals with owners.
8. Issue a go, go-with-conditions, or no-go recommendation supported by evidence and explicit blockers.
9. Perform publish, tag, merge, deploy, or external communication only when separately authorized.
10. After an authorized release, verify health signals and record outcomes, deviations, and follow-up work.

## Decision gates
- Missing required evidence is not a passing result.
- Do not bypass a failed gate without an identified owner, documented risk acceptance, and explicit authority.
- Prefer stopping or rolling back when abort thresholds are met and continued rollout increases impact.

## Done when
The release decision is evidence-based, operational ownership is explicit, and rollout, observation, and recovery paths are actionable.
