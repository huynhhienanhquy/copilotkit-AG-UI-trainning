# Framework-Specific Guides

This directory contains customization guides for specific frameworks and stacks. Adapt the codex-agent-kit to your project's conventions.

## Available Guides

| Guide | Stack | File |
|-------|-------|------|
| React + TypeScript | Frontend SPA | [react.md](react.md) |
| Next.js | Full-stack React | [nextjs.md](nextjs.md) |
| Express + TypeScript | Node.js backend | [express.md](express.md) |
| FastAPI + Python | Python backend | [fastapi.md](fastapi.md) |
| Django + Python | Python enterprise web/API | [django.md](django.md) |
| NestJS + TypeScript | Node.js enterprise backend | [nestjs.md](nestjs.md) |
| Go | Services, APIs, and workers | [go.md](go.md) |

## How to Use

1. Copy the relevant guide to your repo root as `AGENTS.override.md`.
2. Run `python scripts/build_agents_md.py` to merge with base rules.
3. Adjust the guide to match your project's specific conventions.

## Customization Checklist

- [ ] Package manager and scripts defined
- [ ] Test runner and commands specified
- [ ] Lint and format commands configured
- [ ] Build command verified
- [ ] Project-specific conventions documented
- [ ] Framework-specific guardrails added
