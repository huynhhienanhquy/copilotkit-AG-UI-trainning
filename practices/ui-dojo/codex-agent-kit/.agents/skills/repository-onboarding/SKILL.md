---
name: repository-onboarding
description: Understand an unfamiliar software repository and produce a reliable architecture map. Use when asked to inspect, explain, onboard to, or modify a codebase whose structure is not yet known.
---


# Repository Onboarding

## Workflow
1. Check root files, workspace config, package manager and Git status.
2. Identify runtime, framework, entry points, modules and scripts.
3. Find the main data flow from UI/API to domain/data layer.
4. Define test strategy, CI, lint, build and deployment config.
5. Find conventions by reading representative modules.
6. Document risk areas: generated code, migrations, shared contracts, auth, caching.

## Deliverable
Create a short map including:
- Tech stack
- Folder responsibilities
- Main execution/data flows
- Common commands
- Conventions
- Risks and unknowns

## Guardrails
Don't infer architecture from folder names alone; Verify with code and config.

## Definition of done
The architecture map identifies verified entry points, data flows, commands, conventions, and risk areas, while unknowns and assumptions remain clearly labeled.
