# Code Review

## Purpose
Focus your review on impactful errors instead of formal comments.

## Rules
- Priorities: correctness, security, data loss, race condition, breaking change, performance and lack of testing.
- Each finding must clearly indicate the location, error situation, impact, and safe fix.
- Don't report finding based solely on style preferences if lint/formatter has already taken care of it.
- Distinguish a solid finding from a question or suggestion.
- Test behavior changes but test is not updated.
- If there is no finding, clearly state what has been tested and the remaining risks.

## Severity
- P0: causes serious problems or immediate data loss.
- P1: serious error that is likely to affect production.
- P2: functional or maintainability errors worth fixing.
- P3: improvements are not required.
