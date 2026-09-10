# Contributing to Codex Agent Kit

Thank you for contributing to Codex Agent Kit. This guide explains how to add or modify components.

## Structure

```
codex-agent-kit/
├── .agents/skills/     # Skills with SKILL.md + references/
├── agents/             # Agent roles with AGENT.md
├── rules/              # Rules with RULE.md
├── workflows/          # Workflow definitions
├── examples/           # Good and bad code examples
├── templates/          # Reusable templates
├── guides/             # Framework-specific guides
└── scripts/            # Build and validation scripts
```

## Adding a Skill

1. Copy `templates/skill-template/` to `.agents/skills/<skill-name>/`.
2. Edit `SKILL.md` with frontmatter (name, description) and workflow.
3. Edit `references/checklist.md` with pre-flight checks.
4. Run `python scripts/build_agents_md.py` to refresh manifest.
5. Run `python scripts/validate_kit.py` to verify.

## Adding a Rule

1. Copy `templates/rule-template/` to `rules/<rule-name>/`.
2. Edit `RULE.md` with Purpose, Rules, Safe path, and Exceptions.
3. Run `python scripts/build_agents_md.py` to rebuild AGENTS.md.
4. Run `python scripts/validate_kit.py` to verify.

## Adding an Agent Role

1. Create `agents/<role>/AGENT.md`.
2. Define Mission, Owns, Authority, Required handoff, and Done when.
3. Run `python scripts/validate_kit.py` to verify.

## Adding a Workflow

1. Create `workflows/<workflow-name>.md`.
2. Define Use when, Workflow steps, Decision gates, and Done when.
3. Run `python scripts/validate_kit.py` to verify.

## Adding an Example

1. Add to `examples/` with descriptive filename.
2. Good examples: `good-<pattern>.<ext>`
3. Bad examples: add to `examples/bad-examples.md` or create `bad-<pattern>.<ext>`

## Code Style

- Markdown: use ATX headings, list items with `-`, fenced code blocks with language.
- Frontmatter: use YAML with `name` and `description` fields.
- Checklists: use `- [ ]` format.
- Keep files focused; one concept per file.

## Validation

Always run before committing:

```bash
python scripts/build_agents_md.py   # rebuild AGENTS.md + MANIFEST.txt
python scripts/validate_kit.py      # validate all components
```

## Pull Requests

1. Create a feature branch from main.
2. Make changes following the guidelines above.
3. Run validation scripts.
4. Write a clear commit message describing the change.
5. Open a PR with description of what was added/changed and why.
