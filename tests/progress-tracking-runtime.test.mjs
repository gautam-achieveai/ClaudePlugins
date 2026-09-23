import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, rmdirSync, existsSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const script = resolve('progress-tracking/scripts/progress.mjs');
function fixture(t, config = {}) {
  const root = mkdtempSync(join(tmpdir(), 'progress-runtime-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const configFile = join(root, 'config-input.json');
  writeFileSync(configFile, JSON.stringify(config));
  const dir = join(root, '.progress', 'feature');
  function run(command, flags = [], ok = true) {
    const result = spawnSync(process.execPath, [script, command, '--root', root, '--work-id', 'feature', ...flags], { encoding: 'utf8' });
    if (ok) assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
    else assert.notEqual(result.status, 0, `${command} should reject`);
    return JSON.parse(ok ? result.stdout : result.stderr);
  }
  run('init', ['--title', 'Feature <script>alert(1)</script>', '--goal', 'Ship safely', '--config', configFile]);
  let token;
  return { root, dir, run,
    read: name => JSON.parse(readFileSync(join(dir, name), 'utf8')),
    start(flags = []) { const result = run('tick-start', flags); token = result.token; return result; },
    mutate(command, flags = [], ok = true) { return run(command, ['--token', token, ...flags], ok); },
    append(events, ok = true) { const input = join(root, 'events-input.json'); writeFileSync(input, JSON.stringify(events)); return run('append-events', ['--token', token, '--input', input], ok); },
  };
}
const ev = (id, kind, extra = {}) => ({ id, kind, timestamp: new Date().toISOString(), source: { path: 'ledger.md', location: 'line 1' }, summary: id, evidence: [], ...extra });
const dispatch = id => ev(`dispatch-${id}`, 'dispatch', { workstreamId: id, transition: { title: id, owner: `worker-${id}`, reportPaths: [], status: 'active' } });
const proof = (id, criterionId) => ({ id, path: 'test-results.txt', detail: 'node --test: passed', verified: true, ...(criterionId ? { criterionId } : {}) });
const source = (id, path, timestamp = new Date().toISOString()) => ev(id, 'source', { timestamp, source: { path, location: 'read successfully' }, transition: { status: 'fresh', cursor: 1 } });

test('initialization is durable, refuses overwrite and path traversal', t => {
  const f = fixture(t);
  assert.equal(f.read('state.json').schemaVersion, 1);
  assert.equal(f.read('state.json').journalCursor, 0);
  f.run('check');
  assert.equal(f.run('init', ['--title', 'overwrite', '--goal', 'no'], false).code, 'EXISTS');
  const result = spawnSync(process.execPath, [script, 'init', '--root', f.root, '--work-id', '../escape', '--title', 'bad', '--goal', 'bad'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(join(f.root, 'escape')), false);
});

test('restart, mixed-stream progress and per-stream no-progress nudges', t => {
  const f = fixture(t);
  f.start();
  f.append([dispatch('a'), dispatch('b')]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'PROGRESSED');
  f.mutate('render');
  assert.equal(f.mutate('tick-finish').result, 'PROGRESSED');
  f.start();
  f.append([ev('proof-a', 'evidence', { workstreamId: 'a', evidence: [proof('p1')] })]);
  const state = f.mutate('reconcile');
  assert.equal(state.lastTickResult, 'PROGRESSED');
  assert.deepEqual(state.activeTick.unchangedWorkstreams, ['b']);
  assert.equal(state.nudges.length, 1);
  assert.equal(state.nudges[0].delivery, 'pending');
  assert.equal(f.mutate('reconcile').nudges.length, 1);
  f.mutate('render');
  for (const file of ['report.md', 'report.html']) {
    const report = readFileSync(join(f.dir, file), 'utf8');
    assert.match(report, /NO_PROGRESS[^\n<]*b/);
    assert.match(report, /a gained verified evidence: p1/);
    assert.doesNotMatch(report, /active → active/);
  }
  f.mutate('nudge-ack', ['--key', state.nudges[0].key, '--delivery', 'sent to worker-b']);
  f.mutate('tick-finish');
  f.start();
  const idle = f.mutate('reconcile');
  assert.equal(idle.lastTickResult, 'NO_PROGRESS');
  assert.deepEqual(idle.activeTick.unchangedWorkstreams, ['a', 'b']);
  const receipt = f.mutate('tick-finish');
  assert.equal(receipt.pendingNudges.length, 2);
  assert.equal(receipt.result, 'NO_PROGRESS');
  f.run('check');
});

test('event append retries are idempotent, conflicts and invalid batches are atomic, late timestamps accepted', t => {
  const f = fixture(t); f.start();
  const initial = dispatch('a');
  f.append([initial]);
  const journal = readFileSync(join(f.dir, 'events.jsonl'), 'utf8');
  f.append([initial]);
  assert.equal(readFileSync(join(f.dir, 'events.jsonl'), 'utf8'), journal);
  assert.equal(f.append([dispatch('b'), { ...initial, summary: 'conflict' }], false).code, 'CONFLICT');
  assert.equal(readFileSync(join(f.dir, 'events.jsonl'), 'utf8'), journal);
  assert.equal(f.append([dispatch('b'), ev('bad', 'unknown')], false).code, 'INVALID');
  assert.equal(readFileSync(join(f.dir, 'events.jsonl'), 'utf8'), journal);
  f.append([ev('late', 'evidence', { timestamp: '2020-01-01T00:00:00Z', workstreamId: 'a', evidence: [proof('old-proof')] })]);
  assert.ok(f.mutate('reconcile').evidence['old-proof']);
});

test('tick lock ownership, contention and explicit stale recovery', t => {
  const f = fixture(t, { staleAfterMinutes: 0.001 });
  const first = f.start();
  assert.equal(f.run('tick-start', [], false).code, 'BUSY');
  assert.equal(f.run('reconcile', ['--token', 'wrong'], false).code, 'LOCK_OWNER');
  const lock = f.read('tick.lock');
  lock.startedAt = '2000-01-01T00:00:00.000Z';
  writeFileSync(join(f.dir, 'tick.lock'), JSON.stringify(lock));
  assert.equal(f.run('tick-start', [], false).code, 'BUSY');
  const recovered = f.start(['--recover-stale']);
  assert.notEqual(first.token, recovered.token);
  assert.match(readFileSync(join(f.dir, 'events.jsonl'), 'utf8'), /lock_recovered/);
  f.mutate('reconcile'); f.mutate('tick-finish');
});

test('missing required sources classify STALE; blockers classify BLOCKED', t => {
  const f = fixture(t, { sources: ['missing-ledger.md'] }); f.start();
  f.append([dispatch('a')]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'STALE');
  f.mutate('tick-finish');
  writeFileSync(join(f.root, 'missing-ledger.md'), 'facts');
  f.start();
  f.append([source('fresh-ledger', 'missing-ledger.md'), ev('block', 'blocker', { workstreamId: 'a', transition: { id: 'dependency', status: 'open', critical: true, description: 'waiting for API' } })]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'BLOCKED');
});

test('completion requires criterion proof and terminal archives preserve immutable inputs and escaped views', t => {
  const f = fixture(t, { doneWhen: [{ id: 'tests', description: 'Tests pass' }], sources: ['ledger.md'] });
  writeFileSync(join(f.root, 'ledger.md'), 'source facts');
  f.start();
  f.append([source('fresh-ledger', 'ledger.md'), dispatch('a')]);
  assert.equal(f.append([ev('premature', 'terminal', { transition: { status: 'completed' } })], false).code, 'EVIDENCE_REQUIRED');
  f.append([ev('milestone', 'milestone', { milestoneId: 'm1', transition: { title: 'Release', dependencies: [], criteria: [{ id: 'tests', description: 'Tests pass' }], status: 'active' } })]);
  assert.equal(f.append([ev('finish-m1', 'milestone', { milestoneId: 'm1', transition: { status: 'completed' } })], false).code, 'EVIDENCE_REQUIRED');
  f.append([ev('finish-a', 'handoff', { workstreamId: 'a', transition: { status: 'completed' }, evidence: [proof('done-tests', 'tests')] }), ev('finish-m1', 'milestone', { milestoneId: 'm1', transition: { status: 'completed' }, evidence: [proof('done-tests', 'tests')] }), ev('terminal', 'terminal', { transition: { status: 'completed' }, evidence: [proof('done-tests', 'tests')] })]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'TERMINAL');
  f.mutate('render');
  const html = readFileSync(join(f.dir, 'report.html'), 'utf8');
  assert.doesNotMatch(html, /<script/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Mermaid source/);
  assert.match(readFileSync(join(f.dir, 'report.md'), 'utf8'), /```mermaid/);
  for (const file of ['milestones.mmd', 'dependencies.mmd', 'workstreams.mmd']) assert.ok(existsSync(join(f.dir, 'diagrams', file)));
  f.mutate('tick-finish');
  f.start();
  const archive = f.mutate('archive');
  assert.equal(existsSync(join(archive.path, 'inputs')), false);
  assert.ok(f.read('archived.json').hashes['inputs.json']);
  assert.equal(JSON.parse(readFileSync(join(archive.path, 'inputs.json'), 'utf8'))[0].source, 'ledger.md');
  assert.ok(existsSync(join(archive.path, 'events.jsonl')));
  assert.ok(existsSync(join(archive.path, 'report.html')));
  assert.equal(f.mutate('archive', [], false).code, 'ARCHIVED');
  assert.equal(f.run('tick-start', [], false).code, 'ARCHIVED');
  f.run('check');
});

test('parents cannot complete with unfinished children and terminal cannot bypass missing source checks', t => {
  const f = fixture(t, { doneWhen: [{ id: 'tests', description: 'Tests pass' }], sources: ['missing.md'] }); f.start();
  f.append([dispatch('parent'), { ...dispatch('child'), transition: { ...dispatch('child').transition, parentId: 'parent' } }]);
  assert.equal(f.append([ev('finish-parent', 'handoff', { workstreamId: 'parent', transition: { status: 'completed' }, evidence: [proof('parent-proof')] })], false).code, 'INVALID');
  f.append([ev('finish-child', 'handoff', { workstreamId: 'child', transition: { status: 'completed' }, evidence: [proof('child-proof')] }), ev('finish-parent', 'handoff', { workstreamId: 'parent', transition: { status: 'completed' }, evidence: [proof('parent-proof')] })]);
  assert.equal(f.append([ev('early-terminal', 'terminal', { transition: { status: 'completed' }, evidence: [proof('tests-proof', 'tests')] })], false).code, 'INVALID');
});

test('required sources and worker reports need recent successful observations', t => {
  const f = fixture(t, { sources: ['ledger.md'] }); writeFileSync(join(f.root, 'ledger.md'), 'facts'); writeFileSync(join(f.root, 'worker.md'), 'facts'); f.start();
  f.append([{ ...dispatch('a'), transition: { ...dispatch('a').transition, reportPaths: ['worker.md'] } }]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'STALE');
  f.append([source('old-ledger', 'ledger.md', '2020-01-01T00:00:00Z'), source('worker-fresh', 'worker.md')]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'STALE');
  f.append([source('new-ledger', 'ledger.md')]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'PROGRESSED');
  f.mutate('tick-finish'); f.start();
  f.append([source('same-cursor', 'ledger.md'), source('same-worker-cursor', 'worker.md')]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'NO_PROGRESS');
});

test('later progress supersedes pending nudges without claiming delivery', t => {
  const f = fixture(t); f.start(); f.append([dispatch('a')]); f.mutate('tick-finish');
  f.start(); f.mutate('tick-finish');
  assert.equal(f.read('state.json').nudges[0].delivery, 'pending');
  f.start(); f.append([ev('advance', 'evidence', { workstreamId: 'a', evidence: [proof('new-proof')] })]);
  const state = f.mutate('reconcile');
  assert.equal(state.nudges[0].delivery, 'superseded');
  assert.equal(state.nudges[0].deliveredAt, undefined);
});

test('terminal work supersedes pending nudges and raises no new ones', t => {
  const f = fixture(t); f.start(); f.append([dispatch('a')]); f.mutate('tick-finish');
  f.start(); f.mutate('tick-finish');
  assert.equal(f.read('state.json').nudges[0].delivery, 'pending');
  f.start(); f.append([ev('failed', 'terminal', { transition: { status: 'failed' }, evidence: [proof('failure')] })]);
  const state = f.mutate('reconcile');
  assert.equal(state.nudges.length, 1);
  assert.equal(state.nudges[0].delivery, 'superseded');
  assert.equal(state.nudges[0].supersededReason, 'Work reached terminal outcome');
});

test('reports include human progress summary, UTC refresh time, optional architecture and dark mode', t => {
  const f = fixture(t); f.start(); f.append([dispatch('a')]); f.mutate('render');
  writeFileSync(join(f.dir, 'diagrams', 'system.mmd'), 'flowchart LR\n a["<unsafe>"] --> b\n```\n# injected heading');
  f.mutate('render');
  const html = readFileSync(join(f.dir, 'report.html'), 'utf8');
  assert.match(html, /As of .*UTC/); assert.match(html, /What progressed/); assert.match(html, /Waiting on/);
  assert.match(html, /prefers-color-scheme/); assert.match(html, /system Mermaid source/); assert.match(html, /&lt;unsafe&gt;/);
  assert.match(readFileSync(join(f.dir, 'report.md'), 'utf8'), /````mermaid\nflowchart LR/);
});

test('stale recovery preserves unreported progress and projection lag is recoverable', t => {
  const f = fixture(t, { staleAfterMinutes: 0.001 }); f.start();
  f.append([dispatch('a')]);
  assert.equal(f.run('check', [], false).code, 'STATE_LAG');
  const lock = f.read('tick.lock'); lock.startedAt = '2000-01-01T00:00:00.000Z'; writeFileSync(join(f.dir, 'tick.lock'), JSON.stringify(lock));
  f.start(['--recover-stale']);
  const state = f.mutate('reconcile');
  assert.equal(state.lastTickResult, 'PROGRESSED');
  assert.ok(state.activeTick.deltas.some(delta => delta.field === 'workstreams' && delta.id === 'a'));
  f.mutate('tick-finish'); f.run('check');
});

test('a recovery interrupted before its tick started keeps the original baseline', t => {
  const f = fixture(t, { staleAfterMinutes: 0.001 }); f.start();
  f.append([dispatch('a')]);
  const expire = () => { const lock = f.read('tick.lock'); lock.startedAt = '2000-01-01T00:00:00.000Z'; writeFileSync(join(f.dir, 'tick.lock'), JSON.stringify(lock)); };
  expire(); f.start(['--recover-stale']);
  // Crash after the new lock was written but before tick_started reached the journal.
  const journalFile = join(f.dir, 'events.jsonl');
  const rows = readFileSync(journalFile, 'utf8').trimEnd().split('\n');
  assert.match(rows.at(-1), /tick_started/);
  writeFileSync(journalFile, rows.slice(0, -1).join('\n') + '\n');
  expire(); f.start(['--recover-stale']);
  const state = f.mutate('reconcile');
  assert.equal(state.lastTickResult, 'PROGRESSED');
  assert.ok(state.activeTick.deltas.some(delta => delta.field === 'workstreams' && delta.id === 'a'));
});

test('an unreadable mutation lock is recoverable once old, and busy while fresh', t => {
  const f = fixture(t);
  const lockFile = join(f.dir, 'mutation.lock');
  writeFileSync(lockFile, '');
  assert.equal(f.run('tick-start', ['--recover-stale'], false).code, 'BUSY');
  const old = new Date(Date.now() - 60000); utimesSync(lockFile, old, old);
  assert.equal(f.run('tick-start', [], false).code, 'BUSY');
  f.start(['--recover-stale']);
  assert.equal(existsSync(lockFile), false);
});

test('a blocker on a non-critical workstream does not block the tick', t => {
  const f = fixture(t); f.start();
  f.append([ev('dispatch-side', 'dispatch', { workstreamId: 'side', transition: { title: 'side', owner: 'worker-side', reportPaths: [], status: 'active', critical: false } }),
    ev('block-side', 'blocker', { workstreamId: 'side', transition: { id: 'side-wait', status: 'open', critical: true, description: 'waiting on docs' } })]);
  assert.equal(f.mutate('reconcile').lastTickResult, 'PROGRESSED');
});

test('an incomplete journal tail is refused with JOURNAL_TAIL', t => {
  const f = fixture(t); f.start(); f.append([dispatch('a')]);
  writeFileSync(join(f.dir, 'events.jsonl'), '{"sequence":99', { flag: 'a' });
  assert.equal(f.run('check', [], false).code, 'JOURNAL_TAIL');
  assert.equal(f.mutate('reconcile', [], false).code, 'JOURNAL_TAIL');
});

test('unknown prototype IDs, unsupported transitions, and unverified completion are rejected', t => {
  const f = fixture(t); f.start();
  assert.equal(f.append([ev('prototype', 'evidence', { workstreamId: 'toString', evidence: [proof('p')] })], false).code, 'INVALID');
  f.append([dispatch('a')]);
  assert.equal(f.append([ev('empty', 'handoff', { workstreamId: 'a', transition: { status: 'completed' } })], false).code, 'EVIDENCE_REQUIRED');
  assert.equal(f.append([ev('unverified', 'handoff', { workstreamId: 'a', transition: { status: 'completed' }, evidence: [{ ...proof('p'), verified: false }] })], false).code, 'EVIDENCE_REQUIRED');
  assert.equal(f.append([ev('unsupported', 'handoff', { workstreamId: 'a', transition: { status: 'completed', invented: true }, evidence: [proof('p')] })], false).code, 'INVALID');
});

for (const kind of ['risk', 'blocker', 'ruling']) test(`${kind} resolution and reassignment advance affected workstreams`, t => {
  const f = fixture(t); f.start();
  const transition = { id: 'issue', status: 'open', description: 'Needs a decision', critical: false };
  f.append([dispatch('a'), dispatch('b'), ev('opened', kind, { workstreamId: 'a', transition })]); f.mutate('tick-finish');
  f.start(); f.mutate('tick-finish');
  f.start();
  f.append([ev('resolved', kind, { workstreamId: 'a', transition: { ...transition, status: 'resolved' }, evidence: [proof('resolution')] })]);
  const state = f.mutate('reconcile');
  assert.equal(state.lastTickResult, 'PROGRESSED');
  assert.deepEqual(state.activeTick.unchangedWorkstreams, ['b']);
  assert.equal(state.nudges.find(item => item.key === 'feature:2:a').delivery, 'superseded');
  assert.equal(state.nudges.some(item => item.key === 'feature:3:a'), false);
  f.mutate('tick-finish'); f.start();
  f.append([ev('reassigned', kind, { workstreamId: 'b', transition: { ...transition, status: 'resolved' }, evidence: [proof('resolution')] })]);
  assert.deepEqual(f.mutate('reconcile').activeTick.unchangedWorkstreams, []);
});

test('milestone link and acceptance criteria changes are material and relationships appear in reports', t => {
  const f = fixture(t); f.start();
  f.append([dispatch('a'), ev('m1', 'milestone', { milestoneId: 'm1', transition: { title: 'Release', criteria: [] } })]); f.mutate('tick-finish');
  f.start(); f.append([ev('link', 'handoff', { workstreamId: 'a', transition: { milestoneId: 'm1' } })]);
  const linked = f.mutate('reconcile'); assert.equal(linked.lastTickResult, 'PROGRESSED'); assert.deepEqual(linked.activeTick.unchangedWorkstreams, []);
  f.mutate('render');
  assert.match(readFileSync(join(f.dir, 'report.md'), 'utf8'), /Milestone/);
  assert.match(readFileSync(join(f.dir, 'report.html'), 'utf8'), /a milestone: none → m1/);
  assert.match(readFileSync(join(f.dir, 'diagrams', 'workstreams.mmd'), 'utf8'), /m_m1 --> w_a/);
  f.mutate('tick-finish'); f.start();
  f.append([ev('criteria', 'milestone', { milestoneId: 'm1', transition: { criteria: [{ id: 'tests', description: 'Integration tests pass' }] } })]);
  const criteria = f.mutate('reconcile'); assert.equal(criteria.lastTickResult, 'PROGRESSED');
  assert.ok(criteria.activeTick.deltas.some(item => item.field === 'milestones' && item.after.criteria[0].id === 'tests'));
});

test('completed_with_risks requires an accepted risk supported by evidence', t => {
  const f = fixture(t, { doneWhen: [{ id: 'tests', description: 'Tests pass' }] }); f.start();
  const terminal = ev('terminal', 'terminal', { transition: { status: 'completed_with_risks' }, evidence: [proof('tests', 'tests')] });
  assert.equal(f.append([terminal], false).code, 'INVALID');
  f.append([ev('accepted-risk', 'risk', { transition: { id: 'latency', status: 'accepted', description: 'Accepted latency tradeoff' }, evidence: [proof('risk-acceptance')] }), terminal]);
  assert.equal(f.mutate('reconcile').status, 'completed_with_risks');
});

test('global done-when criteria and observed evidence appear in both reports', t => {
  const f = fixture(t, { doneWhen: [{ id: 'acceptance', description: 'All acceptance checks pass' }] }); f.start();
  f.append([dispatch('a'), ev('proof', 'evidence', { workstreamId: 'a', evidence: [proof('acceptance-proof', 'acceptance')] })]);
  f.mutate('render');
  for (const file of ['report.md', 'report.html']) {
    const report = readFileSync(join(f.dir, file), 'utf8');
    assert.match(report, /Done when/); assert.match(report, /All acceptance checks pass/); assert.match(report, /Observed verified evidence/); assert.match(report, /acceptance-proof/);
  }
});

test('finish and render retry a committed receipt after report publication fails', t => {
  const f = fixture(t); f.start(); f.append([dispatch('a')]);
  const obstacle = join(f.dir, 'report.html'); mkdirSync(obstacle);
  f.mutate('tick-finish', [], false);
  const state = f.read('state.json'), journal = readFileSync(join(f.dir, 'events.jsonl'), 'utf8');
  assert.equal(state.activeTick, null); assert.equal(state.lastReceipt.tick, 1); assert.ok(existsSync(join(f.dir, 'tick.lock')));
  rmdirSync(obstacle);
  f.mutate('render');
  assert.deepEqual(f.mutate('tick-finish'), state.lastReceipt);
  assert.equal(readFileSync(join(f.dir, 'events.jsonl'), 'utf8'), journal);
  assert.equal(f.read('state.json').tickSequence, 1); assert.equal(existsSync(join(f.dir, 'tick.lock')), false); f.run('check');
});

test('archive retries its committed terminal receipt after report publication fails', t => {
  const f = fixture(t); f.start();
  f.append([ev('failed', 'terminal', { transition: { status: 'failed' }, evidence: [proof('failure')] })]);
  const obstacle = join(f.dir, 'report.html'); mkdirSync(obstacle); f.mutate('archive', [], false);
  const receipt = f.read('state.json').lastReceipt, journal = readFileSync(join(f.dir, 'events.jsonl'), 'utf8');
  rmdirSync(obstacle);
  const archive = f.mutate('archive');
  assert.ok(existsSync(join(archive.path, 'report.html'))); assert.equal(existsSync(join(f.dir, 'tick.lock')), false);
  assert.deepEqual(f.read('state.json').lastReceipt, receipt); assert.equal(readFileSync(join(f.dir, 'events.jsonl'), 'utf8'), journal); f.run('check');
});

test('archive recovers an existing validated snapshot after seal publication fails', t => {
  const f = fixture(t, { doneWhen: [{ id: 'done', description: 'Acceptance passed' }] });
  const { token } = f.start();
  f.append([ev('complete', 'terminal', { transition: { status: 'completed' }, evidence: [proof('pass', 'done')] })]);
  const preload = join(f.root, 'fail-seal.mjs');
  writeFileSync(preload, `import fs from 'node:fs'; import { basename } from 'node:path'; import { syncBuiltinESMExports } from 'node:module';
const rename = fs.renameSync; fs.renameSync = function(from, to) { if (basename(to) === 'archived.json') throw new Error('simulated seal publication failure'); return rename(from, to); }; syncBuiltinESMExports();`);
  const failed = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, script, 'archive', '--root', f.root, '--work-id', 'feature', '--token', token], { encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /simulated seal publication failure/);
  const snapshot = join(f.dir, 'archive', 'terminal-1');
  assert.equal(existsSync(join(snapshot, 'manifest.json')), true);
  assert.equal(existsSync(join(f.dir, 'archived.json')), false);
  const journalBefore = readFileSync(join(f.dir, 'events.jsonl'), 'utf8');
  const reportBefore = readFileSync(join(snapshot, 'report.html'), 'utf8');
  const receiptBefore = f.read('state.json').lastReceipt;
  writeFileSync(join(snapshot, 'report.html'), 'changed snapshot');
  assert.equal(f.mutate('archive', [], false).code, 'ARCHIVE_CHANGED');
  assert.equal(existsSync(join(f.dir, 'archived.json')), false);
  writeFileSync(join(snapshot, 'report.html'), reportBefore);
  const configBefore = readFileSync(join(snapshot, 'config.json'), 'utf8');
  const manifestBefore = readFileSync(join(snapshot, 'manifest.json'), 'utf8');
  const otherConfig = JSON.stringify({ ...JSON.parse(configBefore), title: 'Different work' });
  writeFileSync(join(snapshot, 'config.json'), otherConfig);
  const changedManifest = JSON.parse(manifestBefore);
  changedManifest.hashes['config.json'] = createHash('sha256').update(otherConfig).digest('hex');
  writeFileSync(join(snapshot, 'manifest.json'), JSON.stringify(changedManifest));
  assert.equal(f.mutate('archive', [], false).code, 'ARCHIVE_CHANGED');
  writeFileSync(join(snapshot, 'config.json'), configBefore);
  writeFileSync(join(snapshot, 'manifest.json'), manifestBefore);
  const archived = f.mutate('archive');
  assert.equal(archived.path, snapshot);
  assert.equal(existsSync(join(f.dir, 'tick.lock')), false);
  assert.equal(readFileSync(join(f.dir, 'events.jsonl'), 'utf8'), journalBefore);
  assert.equal(readFileSync(join(snapshot, 'report.html'), 'utf8'), reportBefore);
  assert.deepEqual(f.read('state.json').lastReceipt, receiptBefore);
  f.run('check');
});

test('concurrent mutation attempts preserve all accepted events', async t => {
  const f = fixture(t); const { token } = f.start();
  const files = ['a', 'b'].map(id => { const file = join(f.root, `${id}.json`); writeFileSync(file, JSON.stringify([dispatch(id)])); return file; });
  const results = await Promise.all(files.map(input => new Promise(resolveResult => {
    const child = spawn(process.execPath, [script, 'append-events', '--root', f.root, '--work-id', 'feature', '--token', token, '--input', input]);
    let out = '', err = ''; child.stdout.on('data', chunk => { out += chunk; }); child.stderr.on('data', chunk => { err += chunk; });
    child.on('exit', code => resolveResult({ code, data: JSON.parse(code === 0 ? out : err) }));
  })));
  for (let i = 0; i < results.length; i++) if (results[i].code !== 0) { assert.equal(results[i].data.code, 'BUSY'); f.mutate('append-events', ['--input', files[i]]); }
  assert.deepEqual(Object.keys(f.mutate('reconcile').workstreams).sort(), ['a', 'b']);
  f.run('check');
});
