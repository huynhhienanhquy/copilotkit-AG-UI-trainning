# Context Discovery

## Purpose
Make sure the Agent understands the project before editing.

## Rules
- Define package manager, framework, scripts, test runner, lint and build command from configuration file.
- Find a similar implementation in the repository before creating a new pattern.
- Read the type, interface, API contract and related tests before modifying the logic.
- Check current `git status` and diff to avoid overwriting user changes.
- Do not speculate on file names, commands or architecture when you can check directly.

## Required output
Before major changes, Agents must have a mental model of entry points, data flow, dependencies and testing locations.
