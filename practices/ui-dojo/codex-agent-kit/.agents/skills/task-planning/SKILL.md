---
name: task-planning
description: Plan complex software tasks before implementation. Use when a request spans multiple files, has architectural impact, migrations, unclear dependencies, or meaningful regression risk. Do not use for trivial one-file edits.
---


# Task Planning

## Goal
Convert complex requirements into short execution plans, with dependencies and completion criteria.

## Workflow
1. Read instructions, repository structure and main configuration files.
2. Identify goals, non-goals, assumptions and constraints.
3. Find similar implementations and related dependencies.
4. Divide into small steps; Each step has verifiable output.
5. List files expected to be edited and tests expected to run.
6. State risk, migration or backward-compatibility concerns.
7. Start implementation if the user requests it, don't stop at the plan.

## Output format
- Objective
- Scope / non-scope
- Implementation steps
- Verification
- Risks / assumptions

## Guardrails
- Do not let planning expand the user's authority or silently add out-of-scope deliverables.
- Do not invent architecture, commands, dependencies, or file paths that can be verified from the repository.
- Include explicit decision gates and recovery steps for migrations or other high-risk changes.

## Definition of done
The plan is specific enough that another Agent can implement it without having to guess the underlying architecture.
