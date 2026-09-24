# Code Quality

## Purpose
Maintain code that is readable, easy to maintain, and consistent with project conventions.

## Rules
- Prioritize code that makes sense over code that is smart but difficult to read.
- Keep the function/component small and have one main responsibility.
- Reuse existing abstractions before creating new abstractions.
- Don't add dependency production if you don't really need it.
- Do not leave `console.log`, debug code, commented-out code or TODO without context.
- Do not disable lint/type checks to hide errors; Fix the root cause or log a specific exception.
- Keep the public API compatible unless a breaking change is required.
- No hardcoding secrets, tokens, credentials or sensitive data.
