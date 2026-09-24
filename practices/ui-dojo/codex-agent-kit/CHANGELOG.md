# Changelog

All notable changes to Codex Agent Kit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Separate frontend component, state, structure, and testing rules, plus the code-comments rule.
- Per-rule `EXAMPLES.md` files and regression tests for installers and generated navigation.
- `llm-integration` skill, `llm-ai-integration` rule, and validated example for production AI boundaries.
- `rule-precedence` rule for deterministic conflict resolution.
- `api-design` skill for designing and reviewing API contracts.
- `performance-optimization` skill for proactive performance improvement.
- `logging-monitoring` skill for structured logging, metrics, and alerting.
- `accessibility` skill for WCAG compliance and assistive technology support.
- `error-handling` rule for consistent error mapping, logging, and response format.
- `accessibility` rule for semantic HTML, keyboard navigation, and ARIA usage.
- `devops` agent role for CI/CD, deployment, and infrastructure.
- `api-design.md` workflow for API contract design.
- `performance-optimization.md` workflow for performance improvements.
- `good-error-handler.ts` example for error handling patterns.
- `bad-examples.md` with anti-patterns for error handling, API design, performance, logging, and testing.
- Framework-specific guides for React, Next.js, Express, and FastAPI.
- `CONTRIBUTING.md` with guidelines for adding components.
- `CHANGELOG.md` (this file).

### Changed
- Corrected destructive-command examples and bounded resource guidance in generated safety rules.
- Validation now requires the DevOps role and detects known safety-rule regressions.
- Rebuilt `AGENTS.md` with 25 rules and explicit navigation anchors independent of rule titles.
- Installers now preserve existing files by default, ship scripts and IDE instructions, and leave regeneration explicit.
- Corrected Bash option parsing and removed the unsafe overwrite fallback.
- Tool-call examples now require validation and resource authorization for every allowlisted tool, rejecting unknown tools by default.
- Removed raw model-output logging from the validation example.
- Updated `MANIFEST.txt` with all new components.

## [0.1.0] - Initial Release

### Added
- Initial kit with 16 skills, 15 rules, 7 agent roles, 5 workflows.
- Shared Definition of Done.
- Examples and templates.
- Build and validation scripts.
