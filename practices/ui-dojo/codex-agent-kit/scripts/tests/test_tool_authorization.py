import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


KIT = Path(__file__).resolve().parents[2]


class ToolAuthorizationTests(unittest.TestCase):
    def test_documented_dispatcher_denies_unknown_invalid_and_unauthorized_calls(self):
        node = shutil.which('node')
        if not node:
            self.skipTest('Node.js 22.6+ is required to run the TypeScript example')
        version = subprocess.check_output([node, '--version'], text=True).strip()
        major, minor = map(int, version.lstrip('v').split('.')[:2])
        if (major, minor) < (22, 6):
            self.skipTest('Node.js 22.6+ is required to strip TypeScript types')
        markdown = (KIT / 'rules/llm-ai-integration/EXAMPLES.md').read_text(encoding='utf-8')
        section = markdown.split('## 3. Deterministic Authorization for Tool Calls', 1)[1]
        example = re.search(r'```typescript\n(.*?)\n```', section, re.S).group(1)
        harness = '''
import assert from 'node:assert/strict';
interface UserContext { id: string; tenantId: string }
class ForbiddenError extends Error {}
'''
        checks = '''
const user = { id: 'actor', tenantId: 'tenant-a' };
let executions = 0;
const validated = { resourceId: 'resource-a' };
const tool: AuthorizedTool = {
  parseArgs(raw) {
    if (raw !== 'valid') throw new Error('Invalid arguments');
    return validated;
  },
  async authorize(actor, args) {
    assert.equal(actor, user);
    assert.equal(args, validated);
    return false;
  },
  async execute(actor, args) {
    assert.equal(actor, user);
    assert.equal(args, validated);
    executions++;
    return 'executed';
  },
};
// A different sensitive tool must receive the same mandatory checks as deletion.
allowedTools.set('exportTenantData', tool);
await assert.rejects(() => executeAgentToolCall(user, 'unknown', 'valid'), ForbiddenError);
await assert.rejects(() => executeAgentToolCall(user, 'exportTenantData', 'invalid'), /Invalid arguments/);
await assert.rejects(() => executeAgentToolCall(user, 'exportTenantData', 'valid'), ForbiddenError);
assert.equal(executions, 0);
tool.authorize = async () => { throw new Error('Authorization service unavailable'); };
await assert.rejects(() => executeAgentToolCall(user, 'exportTenantData', 'valid'), /unavailable/);
assert.equal(executions, 0);
tool.authorize = async () => true;
assert.equal(await executeAgentToolCall(user, 'exportTenantData', 'valid'), 'executed');
assert.equal(executions, 1);
'''
        with tempfile.TemporaryDirectory(prefix='.kit-test-tool-auth-', dir=KIT.parent) as temp:
            test_file = Path(temp) / 'authorization.mts'
            test_file.write_text(harness + example + checks, encoding='utf-8')
            result = subprocess.run([node, '--experimental-strip-types', str(test_file)],
                                    capture_output=True, text=True, timeout=30)
            self.assertEqual(0, result.returncode, result.stdout + result.stderr)
