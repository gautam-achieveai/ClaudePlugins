import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plugin = path.join(root, 'experimentation');
const read = file => readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

test('experimentation is registered consistently and both skills permit implicit selection', () => {
  const canonical = json(path.join(plugin, '.claude-plugin/plugin.json'));
  const entry = json(path.join(root, '.claude-plugin/marketplace.json')).plugins.filter(item => item.name === canonical.name);
  assert.equal(entry.length, 1);
  assert.equal(path.resolve(root, entry[0].source), plugin);
  for (const manifest of [entry[0], json(path.join(plugin, '.codex-plugin/plugin.json')), json(path.join(plugin, '.kimi-plugin/plugin.json'))]) {
    for (const field of ['name', 'version', 'description']) assert.equal(manifest[field], canonical[field]);
  }
  const names = readdirSync(path.join(plugin, 'skills')).sort();
  assert.deepEqual(names, ['research', 'research-learning']);
  for (const name of names) {
    const dir = path.join(plugin, 'skills', name);
    const skill = read(path.join(dir, 'SKILL.md'));
    const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatter, name);
    assert.equal(frontmatter[1].match(/^name:\s*(.+)$/m)?.[1], name);
    const description = frontmatter[1].match(/description:\s*>-?\r?\n([\s\S]*?)(?=^\S|$)/m)?.[1]?.trim();
    assert.ok(description, `${name}: description required`);
    assert.ok(description.length <= 1024, `${name}: discovery description too long`);
    assert.doesNotMatch(frontmatter[1], /^disable-model-invocation:\s*true\s*$/m);
    assert.doesNotMatch(frontmatter[1], /^user-invocable:\s*false\s*$/m);
    assert.match(read(path.join(dir, 'agents/openai.yaml')), /allow_implicit_invocation:\s*true/);
  }
});

test('every packaged local Markdown reference resolves inside the plugin', () => {
  for (const file of files(plugin).filter(file => file.endsWith('.md'))) {
    for (const match of read(file).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^https?:\/\//.test(target) || target.startsWith('#')) continue;
      const resolved = path.resolve(path.dirname(file), target.split('#')[0]);
      const relative = path.relative(plugin, resolved);
      assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), `${file}: escapes plugin: ${target}`);
      assert.ok(existsSync(resolved), `${file}: missing ${target}`);
    }
  }
});
