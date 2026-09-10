---
name: agent-orchestration
description: Orchestrate multiple Codex subagents for work that can be safely parallelized. Use for independent research, multi-dimensional review, repository-wide analysis, or separate implementation workstreams. Do not parallelize tightly coupled edits to the same files.
---


# Agent Orchestration

## Workflow
1. Divide tasks into independent workstreams, with clear input/output.
2. Select the narrowest matching role from `agents/<role>/AGENT.md`; a role constrains behavior but never expands task authority.
3. Only spawn a subagent when parallelism reduces time or increases coverage.
4. Assign one owner to each workstream and avoid overlapping edits to the same file.
5. Provide minimal but sufficient context: objective, scope, constraints, role, and deliverable.
6. Require the agent to return the evidence and handoff defined by its role, plus inspected files and unresolved questions.
7. Wait for all results, resolve conflicts, and synthesize them into one decision.
8. The main agent remains responsible for integration, authorization boundaries, and final verification.

## Role routing
- Use `planner` for decomposition and implementation plans.
- Use `developer` for scoped production changes.
- Use `reviewer` for findings-first correctness review.
- Use `tester` for test strategy, execution, and flake analysis.
- Use `security-reviewer` for threat-focused review.
- Use `documentation` for verified documentation changes.
- Use `release` for readiness, rollout, and rollback handoff.

## Recommended workstreams
- Architecture/context mapping
- Security review
- Test/coverage review
- Performance/concurrency review
- Implementation alternatives

## Guardrails
Do not delegate destruction, Git history rewrites, or dangerous migrations to a subagent without clear control.

## Definition of done
All workstreams have returned evidence, conflicting results are resolved, the integrated outcome is verified, and unresolved risks or authorization boundaries are explicit.
