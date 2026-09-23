import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const plugin = 'progress-tracking';
const files = () => [
  ...readdirSync(path.join(root, plugin, 'agents')).map((name) => `${plugin}/agents/${name}`),
  ...readdirSync(path.join(root, plugin, 'skills')).map((name) => `${plugin}/skills/${name}/SKILL.md`),
];

test('progress tracking is discoverable with consistent marketplace metadata', () => {
  const manifest = JSON.parse(read(`${plugin}/.claude-plugin/plugin.json`));
  const entry = JSON.parse(read('.claude-plugin/marketplace.json')).plugins.find((p) => p.name === plugin);
  assert.equal(manifest.name, plugin);
  assert.ok(entry);
  assert.equal(entry.source, './progress-tracking');
  assert.equal(entry.version, manifest.version);
  assert.ok(read('README.md').includes(`progress-tracking (v${manifest.version})`));
  assert.ok(existsSync(path.join(root, plugin, 'README.md')));
});

test('all progress components have gateway-safe discovery and resolve helper skills', () => {
  for (const file of files()) {
    const content = read(file);
    const metadata = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    assert.ok(metadata, file);
    const expected = file.includes('/agents/') ? path.basename(file, '.md') : path.basename(path.dirname(file));
    assert.match(metadata, new RegExp(`^name: ${expected}$`, 'm'));
    assert.match(metadata, /^description: [^>|\r\n]+$/m, file);
    assert.match(metadata, /^user-invocable: true$/m, file);
    assert.match(metadata, /^disable-model-invocation: false$/m, file);
    if (file.includes('/agents/')) {
      assert.match(metadata, /^model: inherit$/m, file);
      assert.match(metadata, /^color: (cyan|blue|green|yellow|magenta|red)$/m, file);
      const helpers = metadata.match(/^skills:\r?\n((?:[ \t]+- .+\r?\n?)*)/m)?.[1] ?? '';
      for (const [, helper] of helpers.matchAll(/- ([\w-]+)/g)) {
        assert.ok(existsSync(path.join(root, plugin, 'skills', helper, 'SKILL.md')), `${file}: ${helper}`);
      }
    }
    assert.doesNotMatch(content, /rEtcd|docs\/progress|SendUserFile|model: haiku/, file);
    for (const [, local] of content.matchAll(/\]\((\.\.?\/[^)#]+)(?:#[^)]*)?\)/g)) {
      assert.ok(existsSync(path.resolve(root, path.dirname(file), local)), `${file}: ${local}`);
    }
  }
});

test('conductor includes a complete resumable tick and per-workstream no-progress delivery', () => {
  const content = read(`${plugin}/skills/tracking-progress/SKILL.md`);
  for (const reference of ['progress-scout', 'progress-tracker', 'progress-architect']) {
    assert.ok(content.includes(`progress-tracking:${reference}`));
  }
  for (const command of ['tick-start', 'append-events', 'reconcile', 'render', 'nudge-ack', 'tick-finish']) {
    assert.ok(content.includes(command), `missing ${command}`);
  }
  assert.match(content, /unchanged.*workstream/i);
  assert.match(content, /resume|restart/i);
  assert.match(content, /scheduler|recurring/i);
  assert.match(content, /pending|nudge_required/i);
  assert.match(content, /ReadWork/);
  assert.match(content, /UpdateWork/);
  assert.match(content, /report\.md/);
  assert.match(content, /TERMINAL/);
  assert.ok(read(`${plugin}/skills/accessible-progress-report/SKILL.md`).includes('progress-tracking:tracking-progress'));
});

test('Agile dispatch and handoff contracts feed durable progress tracking', () => {
  const skill = read('development/skills/agile-development/SKILL.md');
  const contract = read('development/skills/agile-development/reference/worker-contract.md');
  const waves = read('development/skills/agile-development/reference/parallel-waves.md');
  assert.ok(skill.includes('progress-tracking:tracking-progress'));
  for (const field of ['workId', 'workstreamId', 'parentWorkstreamId', 'reportPath']) {
    assert.ok(contract.includes(field), `worker contract missing ${field}`);
  }
  assert.match(contract, /checkpoint/i);
  assert.match(waves, /workstreamId/);
});

test('every Agile role can persist its owned checkpoints without editing shared tracking state', () => {
  const roles = ['architect', 'test-planner', 'manual-tester', 'developer', 'critic']
    .map(name => `development/agents/${name}.md`)
    .concat('code-reviewer/agents/code-reviewer.md');
  for (const file of roles) {
    const content = read(file);
    const metadata = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
    const tools = metadata.match(/^tools:\r?\n((?:[ \t]+- .+\r?\n?)*)/m)?.[1];
    if (tools) {
      assert.match(tools, /- Write(?:\r?\n|$)/, `${file} must be able to create its report`);
      assert.match(tools, /- Edit(?:\r?\n|$)/, `${file} must be able to update its report`);
    }
    assert.match(content, /Persist checkpoints.*reportPath/, file);
    assert.match(content, /progress conductor owns shared tracking state/, file);
    assert.doesNotMatch(content, /Do not edit files\./, `${file} must not prohibit its own report`);
  }
});

test('helper skills preloaded by one agent are internal, not user-triggered', () => {
  for (const helper of ['progress-evidence', 'progress-status-board', 'progress-system-picture']) {
    const metadata = read(`progress-tracking/skills/${helper}/SKILL.md`).match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
    assert.match(metadata, /^description: Internal helper\. Load only when explicitly named/m, helper);
  }
});
