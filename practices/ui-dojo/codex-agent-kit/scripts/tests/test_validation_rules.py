import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

from validation_rules import validate_skill_file


class ValidateSkillFileTests(unittest.TestCase):
    def write_skill(self, root: Path, body: str, name: str = 'sample-skill') -> Path:
        skill_dir = root / name
        skill_dir.mkdir()
        (skill_dir / 'SKILL.md').write_text(body, encoding='utf-8')
        return skill_dir

    def valid_skill(self, extra: str = '') -> str:
        return (
            '---\n'
            'name: sample-skill\n'
            'description: A sufficiently detailed description for validation tests.\n'
            '---\n\n'
            '# Sample Skill\n\n'
            '## Guardrails\nSafe boundaries.\n\n'
            '## Definition of done\nThe requested outcome is verified.\n'
            f'{extra}'
        )

    def test_accepts_skill_with_required_sections(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_dir = self.write_skill(Path(temp_dir), self.valid_skill())
            self.assertEqual([], validate_skill_file(skill_dir))

    def test_reports_each_missing_required_section(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_dir = self.write_skill(
                Path(temp_dir),
                '---\nname: sample-skill\n'
                'description: A sufficiently detailed description for validation tests.\n'
                '---\n\n# Sample Skill\n',
            )
            errors = validate_skill_file(skill_dir)
            self.assertTrue(any('## Guardrails' in error for error in errors))
            self.assertTrue(any('## Definition of done' in error for error in errors))

    def test_section_names_must_be_exact_headings(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_dir = self.write_skill(
                Path(temp_dir),
                self.valid_skill().replace('## Guardrails', '## React-specific guardrails'),
            )
            errors = validate_skill_file(skill_dir)
            self.assertTrue(any('## Guardrails' in error for error in errors))

    def test_reports_missing_references(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_dir = self.write_skill(
                Path(temp_dir), self.valid_skill('\n[Checklist](references/checklist.md)\n')
            )
            errors = validate_skill_file(skill_dir)
            self.assertTrue(any('references/checklist.md' in error for error in errors))

    def test_reports_missing_skill_file_without_crashing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_dir = Path(temp_dir) / 'missing-skill'
            skill_dir.mkdir()
            self.assertEqual(
                [f'Missing SKILL.md: {skill_dir}'], validate_skill_file(skill_dir)
            )


if __name__ == '__main__':
    unittest.main()
