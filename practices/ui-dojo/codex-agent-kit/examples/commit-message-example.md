# Commit Message Examples

Use the repository's existing convention when one exists. Otherwise prefer an imperative subject that explains intent.

```text
fix(auth): reject expired refresh tokens before rotation

Prevent an expired token from creating a new session. Add a regression test
covering the boundary at the exact expiration timestamp.
```

Avoid vague subjects such as `fix stuff`, implementation diaries, issue IDs without intent, or claims not supported by the diff.
