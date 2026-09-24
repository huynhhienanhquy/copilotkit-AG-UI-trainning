# Anti-Patterns to Avoid

## Code
- Catching every error and returning success.
- Disabling type, lint, authorization, or TLS checks to make a path work.
- Adding shared mutable state without ownership or concurrency controls.
- Logging credentials, tokens, full request bodies, or unnecessary personal data.
- Editing generated output instead of its source.

## Tests
- Asserting internal call order when only user-visible behavior matters.
- Using fixed sleeps for asynchronous synchronization.
- Sharing mutable fixtures across tests or relying on execution order.
- Updating snapshots without reviewing the behavior change.

## Agent behavior
- Editing before reading repository instructions and related code.
- Claiming tests passed without running them.
- Expanding a review or diagnosis into implementation without authorization.
- Hiding skipped checks, assumptions, or residual risks.
