# Git Safety

## Purpose
Protect users' Git history and uncommitted changes.

## Rules
- Always check `git status` before major operations.
- Do not use `git reset --hard`, `git clean -fd`, force push, or delete branches unless the user explicitly requests it.
- Do not overwrite unrelated user changes.
- Do not amend commits or rebase public history without being requested.
- Commit must have a clear scope and a message describing the purpose.
- When there is a conflict, resolve it based on the intent of both sides and rerun the test.
