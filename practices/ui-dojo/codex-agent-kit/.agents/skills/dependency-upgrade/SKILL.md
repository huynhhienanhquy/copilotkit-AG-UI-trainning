---
name: dependency-upgrade
description: Upgrade a library, framework, runtime, or toolchain safely. Use when changing dependency versions, lockfiles, build tools, or resolving deprecations and security advisories.
---


# Dependency Upgrade

## Workflow
1. Determine current version, target version and reason.
2. Read the changelog/migration guide from the official source if available.
3. Check breaking changes, peer dependencies and runtime support.
4. Smallest range upgrade; Avoid gathering many unrelated major upgrades.
5. Update code/config according to migration guide.
6. Check the lockfile contains only expected changes.
7. Run install, typecheck, lint, tests and build.
8. Report breaking changes or manual follow-up.

## Guardrails
Do not ignore install script/security warnings without explanation.

## Definition of done
The target version and breaking changes are documented, dependency and lockfile changes are scoped, required code migrations are complete, and install, lint, type, test, and build checks pass as applicable.
