// Syncs host-specific plugin manifests from the Claude source manifests.
//
// The Claude manifests (.claude-plugin/) are the source of truth for each
// plugin's name, version, and description, and the Claude marketplace
// (.claude-plugin/marketplace.json) is the source of truth for listing
// metadata. Copilot CLI falls back to the Claude manifest and reads
// hooks/hooks.json, so those files are never touched here.
//
// This script propagates the shared fields to:
//   - <plugin>/.kimi-plugin/plugin.json   (Kimi Code CLI + Desktop; also rewrites
//     the root .kimi-plugin/marketplace.json in Kimi marketplace v2 format)
//   - <plugin>/.codex-plugin/plugin.json  (OpenAI Codex, when present)
//
// Host-specific fields that already exist (interface, hooks, sessionStart,
// skills/commands declarations, ...) are preserved, not regenerated.
//
// Usage:
//   node scripts/sync-host-manifests.mjs          # write files into sync
//   node scripts/sync-host-manifests.mjs --check  # exit 1 if anything is out of sync

import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const readJson = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const writeJson = (file, value) => {
  writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const claudeMarketplace = readJson('.claude-plugin/marketplace.json');
const ownerName = claudeMarketplace.owner?.name ?? 'Gautam Bhakar';
const KIMI_NAME_PATTERN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*(@[A-Za-z0-9_-]+)?$/;
const KIMI_UNSUPPORTED_FIELDS = ['tools', 'apps', 'inject', 'configFile'];

const titleCase = (id) =>
  id
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');

// Rebuild a host manifest: shared fields synced from the Claude manifest,
// everything else preserved in its existing order.
function buildManifest(hostFile, canonical, pluginDir) {
  const existing = existsSync(path.join(root, hostFile)) ? readJson(hostFile) : {};
  const rest = { ...existing };
  for (const key of ['name', 'version', 'description', 'author', 'skills', 'commands']) {
    delete rest[key];
  }

  const manifest = {
    name: canonical.name,
    version: canonical.version,
    description: canonical.description,
    author: existing.author ?? { name: ownerName },
  };
  const skills = existing.skills ?? (existsSync(path.join(pluginDir, 'skills')) ? './skills/' : undefined);
  const commands =
    existing.commands ?? (existsSync(path.join(pluginDir, 'commands')) ? './commands/' : undefined);
  if (skills) manifest.skills = skills;
  if (commands) manifest.commands = commands;
  Object.assign(manifest, rest);
  return manifest;
}

function validateKimiManifest(id, manifest) {
  assert.match(manifest.name, KIMI_NAME_PATTERN, `${id}: invalid Kimi manifest name`);
  for (const field of [...KIMI_UNSUPPORTED_FIELDS, 'mcpServers']) {
    assert.equal(manifest[field], undefined, `${id}: Kimi manifest must not set ${field}`);
  }
  for (const field of ['skills', 'commands']) {
    if (!manifest[field]) continue;
    for (const rel of Array.isArray(manifest[field]) ? manifest[field] : [manifest[field]]) {
      assert.ok(existsSync(path.join(root, id, rel)), `${id}: declares ${field} at missing path ${rel}`);
    }
  }
}

const changes = [];

for (const entry of claudeMarketplace.plugins) {
  const id = entry.name;
  const pluginDir = path.join(root, id);
  assert.ok(existsSync(pluginDir), `${id}: marketplace source ${entry.source} does not resolve`);

  const claudeManifest = readJson(path.join(id, '.claude-plugin', 'plugin.json'));
  assert.equal(claudeManifest.name, id, `${id}: Claude manifest name mismatch`);
  assert.equal(entry.version, claudeManifest.version, `${id}: Claude marketplace/manifest version drift`);

  // Kimi per-plugin manifest.
  const kimiFile = path.join(id, '.kimi-plugin', 'plugin.json');
  const kimiManifest = buildManifest(kimiFile, claudeManifest, pluginDir);
  validateKimiManifest(id, kimiManifest);
  assert.equal(kimiManifest.version, entry.version, `${id}: Kimi manifest version drift`);
  changes.push({ file: kimiFile, desired: kimiManifest });

  // Codex manifest, when the plugin ships one.
  const codexFile = path.join(id, '.codex-plugin', 'plugin.json');
  if (existsSync(codexFile)) {
    const codexManifest = buildManifest(codexFile, claudeManifest, pluginDir);
    assert.equal(codexManifest.version, entry.version, `${id}: Codex manifest version drift`);
    changes.push({ file: codexFile, desired: codexManifest });
  }
}

const kimiMarketplaceFile = '.kimi-plugin/marketplace.json';
const existingKimiMarketplace = existsSync(path.join(root, kimiMarketplaceFile))
  ? readJson(kimiMarketplaceFile)
  : { version: '2', plugins: [] };
const kimiMarketplace = {
  version: '2',
  plugins: claudeMarketplace.plugins.map(
    (entry) => {
      const existingEntry = existingKimiMarketplace.plugins?.find((candidate) => candidate.id === entry.name);
      return {
        id: entry.name,
        displayName: existingEntry?.displayName ?? titleCase(entry.name),
        description: entry.description,
        version: entry.version,
        category: entry.category,
        source: entry.source,
      };
    },
  ),
};
changes.push({ file: kimiMarketplaceFile, desired: kimiMarketplace });

let drift = 0;
for (const { file, desired } of changes) {
  const current = existsSync(path.join(root, file)) ? readJson(file) : undefined;
  if (JSON.stringify(current) === JSON.stringify(desired)) continue;
  drift += 1;
  if (checkOnly) {
    console.log(`out of sync: ${path.relative(root, file)}`);
  } else {
    writeJson(file, desired);
    console.log(`synced: ${path.relative(root, file)}`);
  }
}

if (drift === 0) {
  console.log(`all ${changes.length} host manifest files in sync`);
} else if (checkOnly) {
  console.error(`${drift} file(s) out of sync; run node scripts/sync-host-manifests.mjs`);
  process.exit(1);
}
