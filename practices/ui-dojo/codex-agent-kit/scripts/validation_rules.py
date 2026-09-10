from pathlib import Path
import re


REQUIRED_SKILL_SECTIONS = ('## Guardrails', '## Definition of done')


def validate_skill_file(skill_dir: Path) -> list[str]:
    """Return validation errors for one skill directory."""
    errors: list[str] = []
    skill_file = skill_dir / 'SKILL.md'
    if not skill_file.exists():
        return [f'Missing SKILL.md: {skill_dir}']

    text = skill_file.read_text(encoding='utf-8')
    match = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    if not match:
        return [f'Missing YAML frontmatter: {skill_file}']

    frontmatter = match.group(1)
    name = re.search(r'^name:\s*(.+)$', frontmatter, re.M)
    description = re.search(r'^description:\s*(.+)$', frontmatter, re.M)
    if not name:
        errors.append(f'Missing name: {skill_file}')
    elif name.group(1).strip() != skill_dir.name:
        errors.append(f'Name/folder mismatch: {skill_file}')
    if not description or len(description.group(1).strip()) < 30:
        errors.append(f'Description too short or missing: {skill_file}')
    if len(text.splitlines()) > 200:
        errors.append(f'SKILL.md is too large; use progressive disclosure: {skill_file}')
    for section in REQUIRED_SKILL_SECTIONS:
        if not re.search(rf'^{re.escape(section)}\s*$', text, re.M):
            errors.append(f'Missing skill section {section}: {skill_file}')
    for referenced in re.findall(r'\[[^\]]+\]\((references/[^)]+)\)', text):
        if not (skill_dir / referenced).exists():
            errors.append(f'Missing referenced file {referenced}: {skill_file}')
    return errors
