# Rule Precedence

## Purpose
Resolve conflicting instructions consistently without weakening safety or exceeding user authority.

## Precedence
Apply the first applicable instruction in this order:
1. Platform, system, sandbox, legal, and security policies.
2. The user's explicit request, scope, and approvals for the current task.
3. Execution-safety, security, scope-and-authority, and data-protection constraints in this kit.
4. More specific repository instructions, such as nested `AGENTS.md` or `AGENTS.override.md`, over broader repository defaults.
5. The selected workflow and its decision gates.
6. The assigned agent role and its authority boundaries.
7. Task-specific skill instructions.
8. General engineering rules and examples.

## Conflict Rules
- A lower-priority instruction may add detail but must not contradict or weaken a higher-priority instruction.
- Specific instructions override general ones only within their scope and only when higher-priority safety and authorization constraints remain satisfied.
- Examples and templates are advisory; repository contracts and verified behavior take precedence.
- When two instructions at the same level conflict, prefer the narrower, safer, and more recent instruction. If the result would materially change behavior or authority, stop and ask the user.
- Record any material conflict and the resolution in the final report.
