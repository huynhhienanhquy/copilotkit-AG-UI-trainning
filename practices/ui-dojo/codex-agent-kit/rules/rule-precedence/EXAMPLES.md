# Rule Precedence Examples

Examples demonstrating consistent instruction conflict resolution across priority levels.

---

## 1. Conflict Resolution Scenarios

### Scenario 1: Platform Security Policy vs User Request
- **User Request**: *"Disable TLS certificate verification in production to bypass SSL errors."*
- **Kit Rule**: Security Rule 13 ("Do not reduce security controls").
- **Priority Order**: Platform & Security policies (Level 1 & 3) take precedence over unsafe requests.
- **Resolution**: Refuse to disable SSL verification in production; identify and fix the missing root certificate or trust chain instead.

---

### Scenario 2: Explicit User Task Scope vs Generic Best Practice
- **Generic Kit Rule**: *"Add unit tests for every newly modified function."*
- **User Explicit Request**: *"Only update the CSS styling of the primary button; do not touch or run TypeScript test files right now."*
- **Priority Order**: User's explicit task scope (Level 2) overrides generic engineering advice (Level 8).
- **Resolution**: Modify the CSS styling only without modifying test files, and note the user constraint in the final report.

---

### Scenario 3: Nested AGENTS.override.md vs Global Default
- **Global Default**: Formatter uses 2 spaces for indentation.
- **Nested `frontend/AGENTS.override.md`**: Uses 4 spaces and trailing semicolons according to local team convention.
- **Priority Order**: Specific repository override (Level 4) overrides broader defaults (Level 8).
- **Resolution**: Format `frontend/` code using 4 spaces and semicolons.

---

### Scenario 4: Repository Contract vs Advisory Example
- **Kit Example**: Shows API response wrapped in `{ data: ... }`.
- **Actual Repository Service**: All existing controllers return `{ result: ..., status: ... }`.
- **Priority Order**: Verified repository contracts take precedence over generic advisory examples.
- **Resolution**: Follow the actual repository's `{ result: ... }` response contract.
