from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULES = ROOT / "rules"
OUTPUT = ROOT / "AGENTS.md"
MANIFEST = ROOT / "MANIFEST.txt"

# Cross-IDE output targets: (relative_path, include_header)
CROSS_IDE_TARGETS = [
    (".cursorrules", False),
    (".clinerules", False),
    (".github/copilot-instructions.md", True),
]

COPILOT_HEADER = "# GitHub Copilot Instructions\n\nAuto-generated from rules/*/RULE.md via python scripts/build_agents_md.py.\nDo not edit manually.\n\n"


def build_cheatsheet(rules_dir: Path) -> str:
    """Return navigation using the explicit rule IDs emitted by build_parts."""
    rows = []
    for rule_file in sorted(rules_dir.glob("*/RULE.md")):
        lines = rule_file.read_text(encoding="utf-8-sig").splitlines()
        name = next((l.lstrip("# ") for l in lines if l.startswith("# ")), rule_file.parent.name)
        purpose = ""
        for i, l in enumerate(lines):
            if l.startswith("## Purpose"):
                purpose = lines[i + 1].strip() if i + 1 < len(lines) else ""
                break
        anchor = "rule-" + rule_file.parent.name
        rows.append("| [" + name + "](#" + anchor + ") | " + purpose + " |")
    header = "| Rule | Purpose |\n|------|---------|"
    return header + "\n" + "\n".join(rows)


def build_intro(rules_dir: Path) -> str:
    cheatsheet = build_cheatsheet(rules_dir)
    lines = [
        "# AGENTS.md",
        "",
        "This file is generated from rules/*/RULE.md.",
        "Run python scripts/build_agents_md.py after changing a rule.",
        "",
        "## Quick Reference",
        "",
        cheatsheet,
        "",
        "## Project Adaptation",
        "",
        "- Discover and use the repository actual package manager and commands.",
        "- Follow existing architecture, naming, formatting, and testing conventions.",
        "- More specific AGENTS.override.md or nested AGENTS.md files may override these defaults.",
        "- Resolve instruction conflicts using rules/rule-precedence/RULE.md.",
        "- Apply definition-of-done.md before reporting implementation work as complete.",
    ]
    return "\n".join(lines)


def build_parts(rules_dir: Path) -> list:
    """Build kit sections with stable IDs independent of titles or Markdown slugs."""
    intro = build_intro(rules_dir).strip()
    parts = [intro]
    for rule_file in sorted(rules_dir.glob("*/RULE.md")):
        source = rule_file.relative_to(rules_dir.parent).as_posix()
        anchor = "rule-" + rule_file.parent.name
        parts.append(
            '<!-- source: ' + source + ' -->\n<a id="' + anchor + '"></a>\n\n'
            + rule_file.read_text(encoding="utf-8-sig").strip()
        )
    return parts


def write_cross_ide(parts: list, root: Path) -> list:
    body = "\n\n---\n\n".join(parts[1:])
    written = []
    for rel_path, include_header in CROSS_IDE_TARGETS:
        target = root / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        content = (COPILOT_HEADER if include_header else "") + body + "\n"
        target.write_text(content, encoding="utf-8")
        written.append(target)
    return written


def build_all(root: Path = ROOT):
    parts = build_parts(root / "rules")
    output = root / "AGENTS.md"
    manifest = root / "MANIFEST.txt"
    
    output.write_text("\n\n---\n\n".join(parts) + "\n", encoding="utf-8")
    cross_ide_files = write_cross_ide(parts, root)

    manifest_entries = []
    for path in sorted(root.rglob("*"), key=lambda item: item.relative_to(root).as_posix()):
        if path.name == "__pycache__" or "__pycache__" in path.parts:
            continue
        relative = path.relative_to(root).as_posix()
        if path.is_dir():
            relative += "/"
        manifest_entries.append(relative)
    manifest.write_text("\n".join(manifest_entries) + "\n", encoding="utf-8")

    print("Generated " + str(output) + " from " + str(len(parts)-1) + " rules and refreshed " + str(manifest) + ".")
    for f in cross_ide_files:
        print("  Synced cross-IDE: " + f.relative_to(root).as_posix())


if __name__ == "__main__":
    build_all(ROOT)
