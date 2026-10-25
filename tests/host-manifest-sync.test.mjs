import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('host manifests stay in sync with the Claude source manifests', () => {
  let output = '';
  assert.doesNotThrow(() => {
    output = execFileSync(process.execPath, [path.join('scripts', 'sync-host-manifests.mjs'), '--check'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }, `host manifests are out of sync; run node scripts/sync-host-manifests.mjs\n${output}`);
  assert.match(output, /all \d+ host manifest files in sync/);
});
