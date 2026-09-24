# LLM integration checklist

- [ ] Trusted instructions and untrusted context are separated.
- [ ] Prompt-injection, exfiltration, and retrieval-poisoning paths were reviewed.
- [ ] Outputs and tool arguments have deterministic schema and business validation.
- [ ] Tool permissions are least-privilege and high-impact actions require approval.
- [ ] Token, rate, concurrency, latency, retry, and cost budgets are bounded.
- [ ] Sensitive data handling, retention, logging, and tenant isolation are reviewed.
- [ ] Adversarial, malformed-output, refusal, timeout, and provider-failure cases are tested.
- [ ] Model and prompt versions, quality signals, and safe fallback behavior are observable.
