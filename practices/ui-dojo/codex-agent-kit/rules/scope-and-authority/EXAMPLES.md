# Scope and Authority Examples

Examples demonstrating strict adherence to task authorization boundaries and preventing scope creep.

---

## 1. Distinguishing Read / Diagnostic from Write Requests

### Diagnostic Request (Read-Only)
- **User Prompt**: *"Can you investigate why the user profile query is slow?"*
- **Allowed Actions**:
  - Search codebase for queries related to user profile.
  - Inspect indexes and EXPLAIN plans.
  - Review network logs and query construction.
  - Deliver analysis report and propose optimizations.
- **Prohibited Without Confirmation**:
  - Automatically running migrations to add indexes.
  - Rewriting production service code.
  - Deploying schema changes.

---

## 2. Preventing Scope Creep & Formatting Churn

### Good: Keeping Changes Confined to Requested Files
```text
Task: "Fix typo in email confirmation template text in src/templates/email.html"

Good Action:
- Edit only `src/templates/email.html` line 12 to fix the typo.
- Verify template rendering.
- Diff contains exactly 1 file and 2 lines modified.
```

### Bad: Unnecessary Mass Formatting
```text
Bad Action:
- Running Prettier across all 50 template files in `src/templates/`.
- Reorganizing imports in 15 unrelated TypeScript files.
- Creates an unreviewable 1,000-line diff for a 1-word typo fix.
```

---

## 3. Operations Requiring Explicit User Authority

| Operation | Requires Explicit User Approval? |
|---|---|
| Creating or modifying local code files within task scope | No (Covered by task intent) |
| Running local test runner or linter | No (Standard verification) |
| Force-pushing to remote git branches | **Yes** |
| Deploying code to staging or production servers | **Yes** |
| Deleting remote branches or database tables | **Yes** |
| Publishing packages to public registries (npm, PyPI) | **Yes** |
