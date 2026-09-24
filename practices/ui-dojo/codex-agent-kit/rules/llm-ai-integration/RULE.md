# LLM and AI Integration

## Purpose
Keep model inputs, outputs, tool use, data handling, and operational behavior safe and reliable.

## Rules
- Treat user content, retrieved documents, web pages, tool output, and model-generated text as untrusted data, not as trusted instructions.
- Keep trusted controls separate from untrusted context; clearly delimit data and minimize the context supplied to the model.
- Validate model output against an explicit schema and business rules before using it in code, databases, UI, commands, or external actions.
- Require deterministic authorization checks immediately before tool calls or mutations; never rely on the model to grant itself permission.
- Use allowlisted tools and parameters, least privilege, bounded execution, and human approval for high-impact actions.
- Protect secrets, personal data, proprietary content, and tenant boundaries in prompts, logs, traces, caches, and evaluation datasets.
- Apply input, output, token, rate, concurrency, latency, retry, and cost limits. Use backoff and respect provider rate-limit guidance.
- Defend against prompt injection, indirect prompt injection, data exfiltration, unsafe rendering, and cross-tenant retrieval.
- Test adversarial inputs, malformed output, refusals, timeouts, partial responses, provider errors, and model-version changes.
- Log model and prompt-template versions, latency, token usage, validation failures, and safety outcomes without logging sensitive content unnecessarily.
- Provide a safe fallback or fail closed when validation, authorization, or safety checks fail.
