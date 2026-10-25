import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const marketplace = JSON.parse(read('.kimi-plugin/marketplace.json'));
const claudeMarketplace = JSON.parse(read('.claude-plugin/marketplace.json'));

test('Kimi marketplace uses the version 2 format and covers every Claude marketplace plugin', () => {
  assert.equal(marketplace.version, '2');
  const claudeNames = claudeMarketplace.plugins.map((entry) => entry.name).sort();
  const kimiIds = marketplace.plugins.map((entry) => entry.id).sort();
  assert.deepEqual(kimiIds, claudeNames);
});

for (const claudeEntry of claudeMarketplace.plugins) {
  const id = claudeEntry.name;

  test(`Kimi entry and manifest for ${id} resolve and stay in sync with the Claude marketplace`, () => {
    const entries = marketplace.plugins.filter((entry) => entry.id === id);
    assert.equal(entries.length, 1, `${id} must appear exactly once`);
    assert.equal(path.resolve(root, entries[0].source), path.join(root, id));
    assert.equal(entries[0].version, claudeEntry.version);

    const manifestPath = path.join(root, id, '.kimi-plugin', 'plugin.json');
    assert.ok(existsSync(manifestPath), `${id} needs a .kimi-plugin/plugin.json manifest`);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.name, id);
    assert.equal(manifest.version, claudeEntry.version);

    const claudeManifest = JSON.parse(read(path.join(id, '.claude-plugin', 'plugin.json')));
    assert.equal(manifest.version, claudeManifest.version);

    for (const field of ['skills', 'commands']) {
      const declared = manifest[field];
      if (!declared) continue;
      for (const rel of Array.isArray(declared) ? declared : [declared]) {
        assert.ok(
          existsSync(path.join(root, id, rel)),
          `${id} declares ${field} at ${rel}, which does not exist`,
        );
      }
    }
  });
}

test('Kimi manifests do not duplicate existing MCP registrations or unsupported runtime fields', () => {
  for (const entry of marketplace.plugins) {
    const manifest = JSON.parse(read(path.join(entry.source, '.kimi-plugin', 'plugin.json')));
    assert.equal(manifest.mcpServers, undefined, `${entry.id} must not duplicate the project-level .mcp.json registration`);
    for (const unsupported of ['tools', 'apps', 'inject', 'configFile']) {
      assert.equal(manifest[unsupported], undefined, `${entry.id} sets unsupported field ${unsupported}`);
    }
  }
});
