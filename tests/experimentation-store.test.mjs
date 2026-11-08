import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { initStudy, addRecord, readBundle, validateBundle, listRecords, contextFor, summarize, schema } from '../experimentation/scripts/research-store.mjs';

const script = fileURLToPath(new URL('../experimentation/scripts/research-store.mjs', import.meta.url));
function workspace(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'research-store-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, root: path.join(dir, 'study') };
}
const sample = (kind, id, overrides = {}) => ({
  id, kind, title: id, summary: `Summary for ${id}`, links: [],
  data: {
    idea: { mechanism: 'Reduce effort before first value.' },
    hypothesis: { prediction: 'More users finish a task.', falsifier: 'No material improvement.', scope: 'New teams.' },
    experiment: { method: 'Randomized test', procedure: 'Assign teams.', success: 'Retention improves.', stop: 'Planned sample reached.' },
    evidence: { mode: 'observed', source: 'artifacts/results.csv, 2026-11-05', observation: 'No clear improvement.', limitations: 'Wide uncertainty.' },
    lesson: { conditions: 'New teams', action: 'Check first value.', exceptions: 'Established teams untested.' },
    decision: { action: 'revise', rationale: 'Evidence is uncertain.', next: 'Test onboarding.' },
  }[kind], ...overrides,
});
function seed(root) {
  initStudy(root, { question: 'What improves team retention?' });
  addRecord(root, sample('idea', 'onboarding'));
  addRecord(root, sample('hypothesis', 'first-value', { links: [{ rel: 'related', target: 'onboarding' }] }));
  addRecord(root, sample('experiment', 'test-first-value', { links: [{ rel: 'tests', target: 'first-value' }] }));
  addRecord(root, sample('evidence', 'result', { links: [{ rel: 'contradicts', target: 'first-value' }, { rel: 'related', target: 'test-first-value' }] }));
  addRecord(root, sample('lesson', 'conditional-lesson', { links: [{ rel: 'derived-from', target: 'result' }] }));
  addRecord(root, sample('decision', 'next-test', { links: [{ rel: 'related', target: 'conditional-lesson' }] }));
}

test('research round survives restart with linked counterevidence, lessons, and portable history', (t) => {
  const { root } = workspace(t);
  seed(root);
  const before = readFileSync(path.join(root, 'records', 'first-value.json'), 'utf8');
  const revision = sample('hypothesis', 'first-value-revised', { supersedes: 'first-value', links: [{ rel: 'related', target: 'result' }] });
  addRecord(root, revision);
  const bundle = readBundle(root);
  assert.equal(validateBundle(JSON.parse(JSON.stringify(bundle))).records.length, 7);
  assert.equal(readFileSync(path.join(root, 'records', 'first-value.json'), 'utf8'), before);
  assert.deepEqual(listRecords(bundle, { kind: 'hypothesis' }).map(r => r.id), ['first-value-revised']);
  assert.equal(listRecords(bundle, { kind: 'hypothesis', history: true }).length, 2);
  assert.equal(listRecords(bundle, { query: 'counterfactual' }).length, 0);
  assert.ok(contextFor(bundle, 'first-value-revised').records.some(r => r.id === 'result'));
  assert.ok(contextFor(bundle, 'first-value-revised').records.some(r => r.id === 'first-value'));
  const summary = summarize(bundle);
  assert.equal(summary.hypotheses.length, 1);
  assert.equal(summary.decisions.length, 1);
  assert.equal(summary.experimentsWithoutEvidence.length, 0);
});

test('init and stable-ID retries are idempotent; conflicts preserve prior bytes', (t) => {
  const { root } = workspace(t);
  assert.equal(initStudy(root, { question: 'Question?', id: 'research' }).outcome, 'created');
  assert.equal(initStudy(root, { question: 'Question?', id: 'research' }).outcome, 'unchanged');
  assert.throws(() => initStudy(root, { question: 'Different?' }), /different|conflict/i);
  const input = sample('idea', 'idea-one');
  assert.equal(addRecord(root, input).outcome, 'created');
  const before = readFileSync(path.join(root, 'records', 'idea-one.json'), 'utf8');
  assert.equal(addRecord(root, input).outcome, 'unchanged');
  assert.throws(() => addRecord(root, { ...input, summary: 'Changed' }), /conflict|exists/i);
  assert.equal(readFileSync(path.join(root, 'records', 'idea-one.json'), 'utf8'), before);
});

test('invalid payloads and graph transitions cannot alter valid data', (t) => {
  const { root } = workspace(t);
  seed(root);
  const before = JSON.stringify(readBundle(root));
  const invalid = [
    sample('idea', '../escape'),
    sample('idea', 'bad-schema', { schemaVersion: 2 }),
    sample('idea', 'unknown', { mystery: true }),
    sample('idea', 'empty', { data: { mechanism: '' } }),
    sample('idea', 'bad-data', { data: { mechanism: 'x', extra: 'typo' } }),
    sample('idea', 'missing-ref', { links: [{ rel: 'related', target: 'absent' }] }),
    sample('idea', 'bad-rel', { links: [{ rel: 'maybe', target: 'first-value' }] }),
    sample('idea', 'link-extra', { links: [{ rel: 'related', target: 'first-value', extra: true }] }),
    sample('experiment', 'wrong-target', { links: [{ rel: 'tests', target: 'onboarding' }] }),
    sample('experiment', 'missing-tests'),
    sample('lesson', 'missing-evidence'),
    sample('lesson', 'wrong-evidence', { links: [{ rel: 'derived-from', target: 'onboarding' }] }),
    sample('evidence', 'bad-mode', { data: { mode: 'guess', source: 'x', observation: 'x', limitations: 'x' } }),
    sample('idea', 'wrong-revision', { supersedes: 'first-value' }),
    sample('idea', 'bad-date', { createdAt: 'not a date' }),
  ];
  for (const input of invalid) assert.throws(() => addRecord(root, input), input.id);
  assert.equal(JSON.stringify(readBundle(root)), before);
  assert.equal(readdirSync(root).includes('.write-lock'), false);
  addRecord(root, sample('hypothesis', 'revision', { supersedes: 'first-value' }));
  assert.throws(() => addRecord(root, sample('hypothesis', 'fork', { supersedes: 'first-value' })), /supersed|fork/i);
});

test('foreign roots, live locks, and unsafe record paths fail without destructive recovery', (t) => {
  const { dir, root } = workspace(t);
  mkdirSync(root);
  writeFileSync(path.join(root, 'foreign.txt'), 'keep');
  assert.throws(() => initStudy(root, { question: 'Question?' }), /foreign|study|exist/i);
  assert.equal(readFileSync(path.join(root, 'foreign.txt'), 'utf8'), 'keep');
  const other = path.join(dir, 'other');
  initStudy(other, { question: 'Question?' });
  writeFileSync(path.join(other, '.write-lock'), 'active');
  assert.throws(() => addRecord(other, sample('idea', 'blocked')), /lock/i);
  assert.equal(readFileSync(path.join(other, '.write-lock'), 'utf8'), 'active');
  const unsafe = path.join(dir, 'unsafe');
  initStudy(unsafe, { question: 'Question?' });
  rmSync(path.join(unsafe, 'records'), { recursive: true });
  symlinkSync(root, path.join(unsafe, 'records'), 'junction');
  assert.throws(() => addRecord(unsafe, sample('idea', 'blocked')), /symbolic|symlink|directory/i);
  assert.equal(readdirSync(root).includes('blocked.json'), false);
});

test('external snapshots reject corrupt history, cycles, duplicates and unknown versions', (t) => {
  const { root } = workspace(t);
  seed(root);
  const fresh = () => JSON.parse(JSON.stringify(readBundle(root)));
  const duplicate = fresh(); duplicate.records.push(duplicate.records[0]);
  const dangling = fresh(); dangling.records[0].links.push({ rel: 'related', target: 'absent' });
  const cycle = fresh();
  const first = cycle.records.find(r => r.kind === 'hypothesis');
  const second = { ...first, id: 'second', supersedes: first.id };
  first.supersedes = second.id; cycle.records.push(second);
  const version = fresh(); version.schemaVersion = 99;
  const unknown = fresh(); unknown.extra = 'field';
  for (const bundle of [duplicate, dangling, cycle, version, unknown]) assert.throws(() => validateBundle(bundle));
  assert.throws(() => contextFor(fresh(), 'absent'), /not found|unknown/i);
  assert.throws(() => listRecords(fresh(), { kind: 'absent' }), /kind/i);
});

test('bounded context prioritizes counterevidence and reports every omitted record', (t) => {
  const { root } = workspace(t);
  seed(root);
  const bundle = readBundle(root);
  const partial = contextFor(bundle, 'first-value', { limit: 2 });
  assert.deepEqual(partial.records.map(record => record.id), ['first-value', 'result']);
  assert.equal(partial.complete, false);
  assert.equal(partial.omittedCount, 4);
  assert.equal(new Set([...partial.records.map(record => record.id), ...partial.omittedIds]).size, bundle.records.length);
  assert.equal(contextFor(bundle, 'first-value', { limit: 100 }).complete, true);
  assert.throws(() => contextFor(bundle, 'first-value', { limit: 0 }), /positive integer/);
});

// Integration: real process startup and filesystem roundtrip are intentionally exercised.
test('CLI integration exposes schemas and roundtrips a study without executing record content', (t) => {
  const { dir, root } = workspace(t);
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  let result = run('init', '--root', root, '--question', 'Which idea?');
  assert.equal(result.status, 0, result.stderr);
  const input = path.join(dir, 'input.json');
  writeFileSync(input, JSON.stringify(sample('idea', 'literal', { summary: '$(echo SECRET) `literal`' })));
  result = run('add', '--root', root, '--file', input);
  assert.equal(result.status, 0, result.stderr);
  const bundle = path.join(dir, 'bundle.json');
  writeFileSync(bundle, run('export', '--root', root).stdout);
  assert.equal(run('validate', '--file', bundle).status, 0);
  assert.equal(run('validate', '--root', root).status, 0);
  assert.equal(JSON.parse(run('list', '--root', root, '--query', 'SECRET').stdout).length, 1);
  assert.equal(JSON.parse(run('context', '--root', root, '--id', 'literal').stdout).records.length, 1);
  assert.equal(run('summary', '--root', root).status, 0);
  assert.equal(run('schema', '--kind', 'hypothesis').status, 0);
  assert.ok(schema('hypothesis'));
  for (const args of [['missing'], ['add', '--root', root], ['list', '--root', root, '--typo', 'x'], ['validate', '--root', root, '--file', bundle]]) {
    assert.notEqual(run(...args).status, 0, args.join(' '));
  }
  writeFileSync(input, '{broken');
  assert.notEqual(run('add', '--root', root, '--file', input).status, 0);
  writeFileSync(path.join(root, 'records', 'literal.json'), '{broken');
  const invalid = run('validate', '--root', root);
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /literal\.json/);
});
