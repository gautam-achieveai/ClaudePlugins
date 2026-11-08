import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plugin = path.join(root, 'experimentation');
const read = file => readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const descriptionOf = frontmatter => frontmatter
  .match(/^description:[ \t]*>-?\r?\n((?:[ \t]+[^\r\n]*(?:\r?\n|$))+)/m)?.[1]
  ?.split(/\r?\n/).map(line => line.trim()).join(' ').trim();
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

test('experimentation is registered consistently and all skills permit implicit selection', () => {
  const canonical = json(path.join(plugin, '.claude-plugin/plugin.json'));
  const entry = json(path.join(root, '.claude-plugin/marketplace.json')).plugins.filter(item => item.name === canonical.name);
  assert.equal(entry.length, 1);
  assert.equal(path.resolve(root, entry[0].source), plugin);
  for (const manifest of [entry[0], json(path.join(plugin, '.codex-plugin/plugin.json')), json(path.join(plugin, '.kimi-plugin/plugin.json'))]) {
    for (const field of ['name', 'version', 'description']) assert.equal(manifest[field], canonical[field]);
  }
  const names = readdirSync(path.join(plugin, 'skills')).sort();
  assert.deepEqual(names, ['evidence-research', 'research', 'research-learning']);
  for (const name of names) {
    const dir = path.join(plugin, 'skills', name);
    const skill = read(path.join(dir, 'SKILL.md'));
    const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatter, name);
    assert.equal(frontmatter[1].match(/^name:\s*(.+)$/m)?.[1], name);
    const description = descriptionOf(frontmatter[1]);
    assert.ok(description, `${name}: description required`);
    assert.ok(description.length <= 1024, `${name}: discovery description too long`);
    assert.doesNotMatch(frontmatter[1], /^disable-model-invocation:\s*true\s*$/m);
    assert.doesNotMatch(frontmatter[1], /^user-invocable:\s*false\s*$/m);
    assert.match(read(path.join(dir, 'agents/openai.yaml')), /allow_implicit_invocation:\s*true/);
  }
});

test('predefined research and experimentation agents have portable identities and inherited models', () => {
  const dir = path.join(plugin, 'agents');
  const names = ['evidence-investigator', 'evidence-reviewer', 'experiment-designer', 'experiment-runner', 'learning-curator', 'research-lead'];
  assert.deepEqual(readdirSync(dir).sort(), names.map(name => `${name}.md`));
  for (const name of names) {
    const content = read(path.join(dir, `${name}.md`));
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatter, name);
    assert.equal(frontmatter[1].match(/^name:\s*(.+)$/m)?.[1], name);
    assert.match(frontmatter[1], /^model:\s*inherit\s*$/m);
    const description = descriptionOf(frontmatter[1]);
    assert.ok(description && description.length <= 1024, name);
  }
});

test('authored references use plugin-root templates and resolve independently of the referring directory', () => {
  const archive = path.join(plugin, 'reference/papers');
  // Downloaded source text can contain publisher links; it is data, not plugin instructions.
  const papers = new Set(json(path.join(archive, 'manifest.json')).map(entry => path.join(archive, entry.file)));
  for (const file of files(plugin).filter(file => file.endsWith('.md') && !papers.has(file))) {
    for (const match of read(file).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^https?:\/\//.test(target) || target.startsWith('#')) continue;
      const prefix = '${CLAUDE_PLUGIN_ROOT}/';
      assert.ok(target.startsWith(prefix), `${file}: reference needs plugin-root template: ${target}`);
      const resolved = path.resolve(plugin, target.slice(prefix.length).split('#')[0]);
      const relative = path.relative(plugin, resolved);
      assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), `${file}: escapes plugin: ${target}`);
      assert.ok(existsSync(resolved), `${file}: missing ${target}`);
    }
  }
});

test('source catalogs link each archived paper to the matching local copy', () => {
  const entries = json(path.join(plugin, 'reference/papers/manifest.json'));
  for (const catalog of ['sources.md', 'research-sources.md']) {
    const content = read(path.join(plugin, 'reference', catalog));
    assert.ok(content.includes('](${CLAUDE_PLUGIN_ROOT}/reference/papers/index.md)'), catalog);
    for (const line of content.split(/\r?\n/)) {
      for (const match of line.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
        const id = match[1].match(/arxiv\.org\/(?:html|abs)\/(\d{4}\.\d+(?:v\d+)?)/)?.[1];
        const entry = entries.find(entry => id ? (entry.id === id || entry.id.replace(/v\d+$/, '') === id) : entry.source === match[1]);
        if (entry) assert.ok(line.includes('](${CLAUDE_PLUGIN_ROOT}/reference/papers/' + entry.file + ')'), `${catalog}: no local copy for ${match[1]}`);
      }
    }
  }
});

test('packaged paper text matches archive checksums and has descriptive filenames', () => {
  const archive = path.join(plugin, 'reference/papers');
  for (const entry of json(path.join(archive, 'manifest.json'))) {
    assert.equal(path.basename(entry.file), entry.file);
    assert.doesNotMatch(entry.file, /^\d{4}\.\d+/);
    const bytes = readFileSync(path.join(archive, entry.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.markdown_sha256, entry.file);
  }
});
