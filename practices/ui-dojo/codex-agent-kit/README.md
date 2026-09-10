# Codex Agent Kit

Set of skills and rules used for Codex Agent in software projects.

## Structure

```text
codex-agent-kit/
├── AGENTS.md
├── definition-of-done.md
├── agents/<role>/AGENT.md
├── .agents/skills/<skill-name>/
│ ├── SKILL.md
│ ├── references/
│ ├── assets/
│ └── scripts/
├── rules/<rule-name>/RULE.md
├── workflows/<workflow-name>.md
├── examples/
├── templates/
└── scripts/
```

## Install into repository

You can use the installer scripts or copy manually:

### Automated installation

**Linux / macOS (Bash):**
```bash
./scripts/install.sh --target <your-repo> [--sync]
```

**Windows (PowerShell):**
```powershell
.\scripts\install.ps1 -Target <your-repo> [-Sync]
```

Run these commands from the kit directory and choose a different target directory.
Both installers include `scripts/`, framework guides, and generated IDE instruction files.
By default, existing files are preserved, including nested rules, skills, and IDE instructions.
`--sync` / `-Sync` replaces matching files but does not remove extra files.
Installation does not require Python and does not automatically regenerate instructions.
After reviewing or editing the target repository's rules, explicitly run
`python scripts/build_agents_md.py` there; this replaces generated instruction files.

### Git pre-commit hook

To automatically validate and sync rules across IDEs on commit:
```bash
bash scripts/hooks/install_hooks.sh    # Linux / macOS
.\scripts\hooks\install_hooks.ps1      # Windows PowerShell
```

## Useful commands

```bash
python scripts/validate_kit.py
python scripts/build_agents_md.py
python -B -m unittest discover -s scripts/tests -v
```

- `validate_kit.py`: checks metadata, required files, skill names, and validates `AGENTS.md`.
- `build_agents_md.py`: merges all `rules/*/RULE.md` into `AGENTS.md` (with Quick Reference table), syncs cross-IDE files (`.cursorrules`, `.clinerules`, `.github/copilot-instructions.md`), and refreshes `MANIFEST.txt`.
- Tests cover rule navigation, installer preservation and sync, fresh installation, skill validation, and the documented tool authorization gate. Installer tests use Bash and PowerShell; the TypeScript example test uses Node.js 22.6+. Unavailable runtimes are reported as skipped.

## How to use skills

In the Codex CLI or IDE:

```text
$task-planning Let's implement OAuth login functionality.
$bug-investigation Investigate the error of request being called twice.
$code-review Review current branch compared to main.
```

Codex can also select skills based on the `description` field.

## Agent roles

Roles separate responsibilities and provide focused handoff contracts. A role narrows how an agent works; it never grants authority beyond the user's request.

| Role | Primary responsibility | Default mutation scope |
| --- | --- | --- |
| `planner` | Evidence-based implementation plans | Planning artifacts only |
| `developer` | Production implementation | Authorized repository files |
| `reviewer` | Defect and regression review | Read-only |
| `tester` | Test design and execution | Tests and test fixtures |
| `security-reviewer` | Threat-focused security review | Read-only |
| `documentation` | Accurate user and developer documentation | Documentation files |
| `release` | Release-readiness decisions and handoff | Read-only and release artifacts |

Use `agents/<role>/AGENT.md` as the role-specific instruction when assigning a workstream. Every handoff should include evidence, completed checks, remaining risk, and any decision the next role must make.

## Standard workflows

Workflows provide an end-to-end operating sequence. Rules apply globally, skills add task-specific expertise, and roles define ownership and authority.

| Workflow | Typical owner | Use for |
| --- | --- | --- |
| `feature-development.md` | Developer | New or changed product behavior |
| `bug-fix.md` | Developer | Evidence-driven defect correction |
| `code-review.md` | Reviewer | Findings-first change review |
| `release.md` | Release | Readiness, rollout, and recovery |
| `incident-response.md` | Release or designated incident commander | Active production incidents |
| `data-migration.md` | Developer, DBA, or release owner | Schema changes, backfills, cutovers, and destructive cleanup |

Select one primary workflow for the task. Invoke specialized skills at relevant steps and use role handoffs when ownership changes. Workflow steps do not grant permission for external or destructive actions.

## Shared Definition of Done

[`definition-of-done.md`](definition-of-done.md) is the common completion gate for implementation work. Apply every relevant item before reporting a task as complete. Checks that could not be run must be reported as unverified with their reason and risk; they are not implicitly passing.

## Examples and templates

`examples/` contains small reference patterns for components, hooks, API and LLM trust boundaries, behavior-focused tests, commit messages, pull requests, and common anti-patterns. Adapt them to the target repository's framework and conventions; do not copy them blindly.

`templates/` contains reusable structures for implementation plans, bug reports, code reviews, pull requests, architecture decisions, and release checklists. Existing rule and skill scaffolds remain under their nested template directories.

## Skills included

- Survey and coordination: `repository-onboarding`, `task-planning`, `agent-orchestration`.
- Implementation and debugging: `feature-implementation`, `bug-investigation`, `refactoring`.
- Expertise: `frontend-workflow`, `backend-api-workflow`, `database-migration`.
- Quality: `test-engineering`, `code-review`, `security-audit`, `performance-investigation`.
- Operations: `dependency-upgrade`, `ci-troubleshooting`, `release-readiness`.
- AI systems: `llm-integration` for prompt injection, structured output validation, tool authorization, evaluations, quotas, and model observability.

## Quick customization

1. Edit the command in `rules/verification/RULE.md` according to the project's package manager and CI.
2. Edit conventions in `rules/code-quality/RULE.md`.
3. Add a new rule by copying `templates/rule-template/`.
4. Run `python scripts/build_agents_md.py` after each rule edit.
