---
name: llm-integration
description: Design, implement, or review production LLM and AI integrations. Use for prompts, retrieval, structured outputs, tool calling, agents, model gateways, evaluations, safety controls, rate limits, and AI-specific tests.
---

# LLM Integration

## Workflow
1. Define the user outcome, unacceptable outcomes, data classification, trust boundaries, and human-approval points.
2. Separate trusted instructions from untrusted user, retrieved, web, and tool content; map prompt-injection and exfiltration paths.
3. Choose the smallest adequate model and a provider boundary that supports timeouts, cancellation, quotas, and version tracking.
4. Define structured output schemas and deterministic validation, authorization, and sanitization before downstream use.
5. Restrict tools with allowlists, least-privilege credentials, explicit parameter validation, bounded execution, and approval gates for high-impact actions.
6. Add token, rate, concurrency, latency, retry, and cost budgets with backpressure and safe fallback behavior.
7. Build evaluations from representative success, failure, adversarial, multilingual, and edge cases; include prompt and model version in results.
8. Test malformed output, refusals, timeouts, partial responses, prompt injection, retrieval poisoning, provider failures, and repeated tool calls.
9. Add privacy-aware observability for latency, tokens, cost, validation failures, safety events, and quality regressions.
10. Review data retention, tenant isolation, rollout, rollback, model-change policy, and residual risks.

## Guardrails
- Never execute model output directly as code, SQL, shell, HTML, URLs, or tool arguments without deterministic validation and authorization.
- Do not place secrets in prompts or logs, and do not send sensitive data to a provider without an approved data-handling basis.
- Do not treat prompt wording alone as a security boundary.

## Definition of done
The integration has explicit trust boundaries, validated outputs, bounded resource use, adversarial tests, observable failure modes, and a safe fallback.
