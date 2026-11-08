import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { activationFromTrace, inspectActivation, codexModelReceipt, gradeStudy, main } from '../experimentation/evals/run-host-evals.mjs';
import { initStudy, addRecord } from '../experimentation/scripts/research-store.mjs';

test('activation requires native tool evidence rather than an answer claiming skill use', t => {
  assert.deepEqual(activationFromTrace(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'I used research /skills/research/SKILL.md' }] } })), []);
  const call = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'load', name: 'Skill', input: { skill: 'experimentation:research' } }] } };
  const loaded = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'load', content: 'Loaded', is_error: false }] } };
  assert.deepEqual(activationFromTrace([call, loaded].map(JSON.stringify).join('\n')), ['research']);
  const root = mkdtempSync(path.join(tmpdir(), 'activation-package-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'skills/evidence-research/SKILL.md');
  mkdirSync(path.dirname(file), { recursive: true });
  const content = '# Evidence research\nUse traceable sources and retain limitations.\n';
  writeFileSync(file, content);
  assert.deepEqual(activationFromTrace(JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: `Get-Content -LiteralPath "${file}"`, exit_code: 0, aggregated_output: content } }), { pluginRoot: root }), ['evidence-research']);
  const workspace = path.join(root, 'workspace');
  const local = path.join(workspace, '.agents/skills/evidence-research/SKILL.md');
  mkdirSync(path.dirname(local), { recursive: true });
  writeFileSync(local, content);
  assert.deepEqual(activationFromTrace(JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: "Get-Content '.agents/skills/evidence-research/SKILL.md'", exit_code: 0, aggregated_output: content } }), { pluginRoot: root, workspace }), ['evidence-research']);
  assert.deepEqual(activationFromTrace('not JSON\n' + JSON.stringify({ type: 'thread.started', thread_id: 'fixture' })), []);
});

test('echoes, failed reads and another plugin cannot pass activation', () => {
  const options = { pluginRoot: 'C:/package' };
  const event = (command, exit_code) => JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command, exit_code } });
  assert.deepEqual(activationFromTrace(event('echo C:/package/skills/research/SKILL.md', 0), options), []);
  const failed = inspectActivation(event('Get-Content C:/package/skills/research/SKILL.md', 1), options);
  assert.deepEqual(failed.activated, []);
  assert.deepEqual(failed.attempted, ['research']);
  assert.deepEqual(activationFromTrace(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'other', name: 'Skill', input: { skill: 'other-plugin:research' } }] } }), options), []);
  assert.deepEqual(activationFromTrace(event('cat C:/another-package/skills/research/SKILL.md', 0), options), []);
  assert.deepEqual(activationFromTrace(event('Get-Content C:/package/skills/research/SKILL.md.bak', 0), options), []);
  assert.deepEqual(activationFromTrace(event('if ($false) { Get-Content C:/package/skills/research/SKILL.md }', 0), options), []);
});

test('native Codex receipt retains model and actual skill inventory without other session content', t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'model-receipt-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const id = '11111111-1111-1111-1111-111111111111';
  writeFileSync(path.join(dir, 'rollout-' + id + '.jsonl'), [
    { type: 'turn_context', payload: { model: 'fixture-model', effort: 'high', private: 'exclude' } },
    { type: 'response_item', payload: { role: 'developer', content: [{ text: '<skills_instructions>\n- experimentation:research: fixture\n- experimentation:evidence-research: fixture\n</skills_instructions>' }] } },
  ].map(JSON.stringify).join('\n'));
  assert.deepEqual(codexModelReceipt(id, dir), { model: 'fixture-model', effort: 'high', source: 'native rollout turn_context and skill inventory', inventoryObserved: true, discoveredSkills: ['evidence-research', 'research'] });
  assert.equal(codexModelReceipt('../foreign', dir), null);
});

test('study grading detects preserved history, contrary evidence and a new checkpoint', t => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'host-eval-grade-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, 'study');
  initStudy(root, { id: 'fixture', question: 'Which explanation?' });
  addRecord(root, { id: 'evidence-contrary', kind: 'evidence', title: 'Contrary', summary: 'A contrary observation', links: [], data: { mode: 'literature', source: 'fixture', observation: 'Conflicts', limitations: 'One case' } });
  const file = path.join(root, 'records/evidence-contrary.json');
  const before = { 'evidence-contrary.json': createHash('sha256').update(readFileSync(file)).digest('hex') };
  assert.equal(gradeStudy(workspace, before).newCheckpoint, false);
  addRecord(root, { id: 'next-checkpoint', kind: 'decision', title: 'Next', summary: 'Research again', links: [{ rel: 'related', target: 'evidence-contrary' }], data: { action: 'investigate', rationale: 'Unresolved', next: 'Compare conditions' } });
  assert.deepEqual(gradeStudy(workspace, before), { historyPreserved: true, validStudy: true, newCheckpoint: true, contraryLinked: true });
  writeFileSync(file, '{}');
  const corrupt = gradeStudy(workspace, before);
  assert.equal(corrupt.historyPreserved, false);
  assert.equal(corrupt.validStudy, false);
});

test('evaluation rejects sensitive configuration-tree output before launching a host', async () => {
  await assert.rejects(main(['--out', path.join(tmpdir(), '.claude', 'fixture-evals')]), /outside agent configuration trees/);
});
