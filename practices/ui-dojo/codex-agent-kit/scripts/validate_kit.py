from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / '.agents' / 'skills'
RULES = ROOT / 'rules'
AGENT_ROLES = ROOT / 'agents'
WORKFLOWS = ROOT / 'workflows'
EXAMPLES = ROOT / 'examples'
TEMPLATES = ROOT / 'templates'
sys.path.insert(0, str(ROOT / 'scripts'))
from build_agents_md import COPILOT_HEADER, CROSS_IDE_TARGETS, build_parts
from validation_rules import validate_skill_file

errors = []


def expected_agents_md():
    parts = build_parts(RULES)
    return '\n\n---\n\n'.join(parts) + '\n'

for skill_dir in sorted(p for p in SKILLS.iterdir() if p.is_dir()):
    errors.extend(validate_skill_file(skill_dir))

required_skills = {'llm-integration'}
skill_names = {path.name for path in SKILLS.iterdir() if path.is_dir()}
for missing_skill in sorted(required_skills - skill_names):
    errors.append(f'Missing required skill: {SKILLS / missing_skill}')

for rule_dir in sorted(p for p in RULES.iterdir() if p.is_dir()):
    if not (rule_dir / 'RULE.md').exists():
        errors.append(f'Missing RULE.md: {rule_dir}')

required_rules = {'execution-safety', 'reliability-observability', 'rule-precedence', 'llm-ai-integration'}
rule_names = {path.name for path in RULES.iterdir() if path.is_dir()}
for missing_rule in sorted(required_rules - rule_names):
    errors.append(f'Missing required rule: {RULES / missing_rule}')

all_rule_text = '\n'.join(path.read_text(encoding='utf-8') for path in RULES.glob('*/RULE.md'))
known_regressions = (
    r'(?<!r)' + 'm ' + '-rf',
    r'(?<!n)' + 'pm ' + 'publish',
    'limits can be increased ' + 'indefinitely',
)
for forbidden_pattern in known_regressions:
    if re.search(forbidden_pattern, all_rule_text, re.I):
        errors.append(f'Known safety-rule regression matched: {forbidden_pattern}')

required_role_sections = ('## Mission', '## Owns', '## Authority', '## Required handoff', '## Done when')
for role_dir in sorted(p for p in AGENT_ROLES.iterdir() if p.is_dir()):
    role_file = role_dir / 'AGENT.md'
    if not role_file.exists():
        errors.append(f'Missing AGENT.md: {role_dir}')
        continue
    role_text = role_file.read_text(encoding='utf-8')
    for section in required_role_sections:
        if section not in role_text:
            errors.append(f'Missing role section {section}: {role_file}')
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', role_dir.name):
        errors.append(f'Invalid role directory name: {role_dir}')

required_roles = {'planner', 'developer', 'reviewer', 'tester', 'security-reviewer', 'documentation', 'release', 'devops'}
role_names = {path.name for path in AGENT_ROLES.iterdir() if path.is_dir()}
for missing_role in sorted(required_roles - role_names):
    errors.append(f'Missing required agent role: {AGENT_ROLES / missing_role / "AGENT.md"}')

required_workflows = {
    'feature-development.md',
    'bug-fix.md',
    'code-review.md',
    'release.md',
    'incident-response.md',
    'data-migration.md',
}
workflow_files = {path.name for path in WORKFLOWS.glob('*.md')}
for missing_workflow in sorted(required_workflows - workflow_files):
    errors.append(f'Missing workflow: {WORKFLOWS / missing_workflow}')
for workflow_file in sorted(WORKFLOWS.glob('*.md')):
    workflow_text = workflow_file.read_text(encoding='utf-8')
    for section in ('## Use when', '## Workflow', '## Decision gates', '## Done when'):
        if section not in workflow_text:
            errors.append(f'Missing workflow section {section}: {workflow_file}')
    numbered_steps = re.findall(r'^\d+\.\s+', workflow_text, re.M)
    if len(numbered_steps) < 5:
        errors.append(f'Workflow must contain at least five ordered steps: {workflow_file}')

dod_file = ROOT / 'definition-of-done.md'
if not dod_file.exists():
    errors.append(f'Missing shared Definition of Done: {dod_file}')
else:
    dod_text = dod_file.read_text(encoding='utf-8')
    for section in (
        '## Requirements and scope',
        '## Correctness and compatibility',
        '## Tests and verification',
        '## Change quality',
        '## Documentation and operations',
        '## Final report',
    ):
        if section not in dod_text:
            errors.append(f'Missing Definition of Done section {section}: {dod_file}')

required_examples = {
    'good-component.tsx',
    'good-hook.ts',
    'good-api-handler.ts',
    'good-unit-test.test.ts',
    'commit-message-example.md',
    'pull-request-example.md',
    'anti-patterns.md',
    'bad-examples.md',
    'good-error-handler.ts',
    'good-llm-boundary.ts',
}
example_files = {path.name for path in EXAMPLES.iterdir() if path.is_file() and path.stat().st_size > 0}
for missing_example in sorted(required_examples - example_files):
    errors.append(f'Missing example: {EXAMPLES / missing_example}')

error_handler_example = EXAMPLES / 'good-error-handler.ts'
if error_handler_example.exists():
    error_handler_text = error_handler_example.read_text(encoding='utf-8')
    if re.search(r'\bconsole\.(?:error|warn|log)\b', error_handler_text):
        errors.append(f'Good error-handler example must use an injected structured logger: {error_handler_example}')
    if 'interface StructuredLogger' not in error_handler_text:
        errors.append(f'Good error-handler example must define its logger contract: {error_handler_example}')

bad_examples_file = EXAMPLES / 'bad-examples.md'
if bad_examples_file.exists():
    bad_examples_text = bad_examples_file.read_text(encoding='utf-8').lower()
    for security_topic in ('sql injection', 'hardcoded secret', 'prompt injection'):
        if security_topic not in bad_examples_text:
            errors.append(f'Bad examples must cover {security_topic}: {bad_examples_file}')

required_templates = {
    'implementation-plan.md',
    'bug-report.md',
    'code-review.md',
    'pull-request.md',
    'architecture-decision-record.md',
    'release-checklist.md',
}
template_files = {path.name for path in TEMPLATES.iterdir() if path.is_file()} if TEMPLATES.exists() else set()
for missing_template in sorted(required_templates - template_files):
    errors.append(f'Missing template: {TEMPLATES / missing_template}')

agents_file = ROOT / 'AGENTS.md'
if not agents_file.exists() or agents_file.read_text(encoding='utf-8') != expected_agents_md():
    errors.append('AGENTS.md is stale; run: python scripts/build_agents_md.py')

parts = build_parts(RULES)
cross_ide_body = '\n\n---\n\n'.join(parts[1:]) + '\n'
for relative_path, include_header in CROSS_IDE_TARGETS:
    cross_ide_file = ROOT / relative_path
    expected_content = (COPILOT_HEADER if include_header else '') + cross_ide_body
    if not cross_ide_file.exists() or cross_ide_file.read_text(encoding='utf-8') != expected_content:
        errors.append(f'{relative_path} is stale; run: python scripts/build_agents_md.py')

if errors:
    print('Validation failed:')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

skill_count = len([path for path in SKILLS.iterdir() if path.is_dir()])
rule_count = len([path for path in RULES.iterdir() if path.is_dir()])
role_count = len([path for path in AGENT_ROLES.iterdir() if path.is_dir()])
workflow_count = len(list(WORKFLOWS.glob('*.md')))
print(f'OK: {skill_count} skills, {rule_count} rules, {role_count} agent roles, {workflow_count} workflows, shared Definition of Done, examples, and templates validated; AGENTS.md is current.')
