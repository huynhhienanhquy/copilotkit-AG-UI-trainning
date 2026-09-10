# Verification

## Purpose
Any changes must be verified with appropriate evidence.

## Rules
- Run focused tests on the newly edited code first, then run a broader suite if feasible.
- Run typecheck, lint and build according to the repository's scripts.
- Add or update tests when behavior changes.
- Do not declare "passed" without running the corresponding command.
- If the test cannot be run, state clearly the command has not been run and the reason.
- Review the final diff to find redundant files, debug code, incorrect formatting, and out-of-scope changes.

## Suggested command discovery
Read `package.json`, `pyproject.toml`, `Makefile`, CI workflow or project documentation to find the exact command.
