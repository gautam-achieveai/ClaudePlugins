#!/usr/bin/env node
// Opt-in native CLI evaluations. Never invoked by the ordinary test suite.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, cpSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initStudy, addRecord, readBundle, contextFor } from '../scripts/research-store.mjs';

const plugin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(file, 'utf8');
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const json = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
export function codexModelReceipt(sessionId, sessions = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions')) {
  if (!/^[a-f0-9-]{36}$/.test(sessionId ?? '') || !existsSync(sessions)) return null;
  // Read only this evaluation's own native rollout, and retain only model metadata.
  const name = readdirSync(sessions, { recursive: true }).find(name => name.endsWith(sessionId + '.jsonl'));
  if (!name) return null;
  let model = null, effort = null, inventoryObserved = false;
  const discoveredSkills = new Set();
  for (const line of read(path.join(sessions, name)).split(/\r?\n/)) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'turn_context' && event.payload?.model && !model) { model = event.payload.model; effort = event.payload.effort ?? null; }
    if (event.type === 'response_item' && ['user', 'developer'].includes(event.payload?.role)) {
      for (const block of event.payload.content ?? []) {
        if (!block.text?.includes('<skills_instructions>')) continue;
        inventoryObserved = true;
        for (const match of block.text.matchAll(/^- (?:experimentation:)?(research|research-learning|evidence-research):/gm)) discoveredSkills.add(match[1]);
      }
    }
  }
  return model ? { model, effort, source: 'native rollout turn_context and skill inventory', inventoryObserved, discoveredSkills: [...discoveredSkills].sort() } : null;
}
export function inspectActivation(trace, { pluginRoot, workspace } = {}) {
  const found = new Set(), attempted = new Set(), ambiguous = new Set(), pending = new Map();
  const normalize = text => text.replace(/\\/g, '/').replace(/\/{2,}/g, '/').toLowerCase();
  const names = ['research', 'research-learning', 'evidence-research'];
  const paths = names.flatMap(name => [
    ...(pluginRoot ? [[normalize(path.join(pluginRoot, 'skills', name, 'SKILL.md')), name]] : []),
    ...(workspace ? [[normalize(path.join(workspace, '.agents/skills', name, 'SKILL.md')), name]] : []),
    ...(workspace ? [[`.agents/skills/${name}/skill.md`, name], [`./.agents/skills/${name}/skill.md`, name]] : []),
  ]);
  function readCommand(command) {
    const text = normalize(command);
    const reads = [];
    for (const [file, name] of paths) {
      const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = new RegExp(`(^|[\\s"'=(])${escaped}(?=$|[\\s"';|&)\\]])`).exec(text);
      const position = match ? match.index + match[1].length : -1;
      if (position < 0) continue;
      const prefix = text.slice(0, position).split(/[;&|\n]/).at(-1);
      if (/\b(get-content|cat|type|sed)\b/.test(prefix) && !/\b(echo|printf|write-output)\b/.test(prefix)) reads.push(name);
      else ambiguous.add(name);
    }
    return reads;
  }
  function containsSkill(output, name) {
    if (!pluginRoot) return false;
    const file = path.join(pluginRoot, 'skills', name, 'SKILL.md');
    if (!existsSync(file)) return false;
    const plain = value => value.replace(/\r\n/g, '\n').trim();
    return plain(output).includes(plain(read(file)));
  }
  for (const line of trace.split(/\r?\n/)) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const blocks = event.message?.content ?? [];
    for (const block of blocks) {
      if (block.type === 'tool_use' && block.name === 'Skill') {
        const name = names.find(name => block.input?.skill === `experimentation:${name}`);
        if (name) { attempted.add(name); pending.set(block.id, [name]); }
      }
      if (block.type === 'tool_use' && block.name === 'Read') {
        const name = paths.find(([file]) => file === normalize(block.input?.file_path ?? ''))?.[1];
        if (name) { attempted.add(name); pending.set(block.id, [name]); }
      }
      if (block.type === 'tool_use' && ['Bash', 'PowerShell'].includes(block.name)) {
        const reads = readCommand(block.input?.command ?? '');
        for (const name of reads) attempted.add(name);
        if (reads.length) pending.set(block.id, { commands: reads });
      }
      if (block.type === 'tool_result' && pending.has(block.tool_use_id)) {
        const expected = pending.get(block.tool_use_id);
        if (!block.is_error) {
          if (Array.isArray(expected)) for (const name of expected) found.add(name);
          else for (const name of expected.commands) {
            const output = typeof block.content === 'string' ? block.content : (block.content ?? []).map(item => item.text ?? '').join('\n');
            if (containsSkill(output, name)) found.add(name); else ambiguous.add(name);
          }
        }
        pending.delete(block.tool_use_id);
      }
    }
    if (event.item?.type === 'command_execution') {
      const reads = readCommand(event.item.command ?? '');
      for (const name of reads) attempted.add(name);
      if (event.type === 'item.completed' && event.item.exit_code === 0) for (const name of reads) {
        if (containsSkill(event.item.aggregated_output ?? '', name)) found.add(name); else ambiguous.add(name);
      }
    }
  }
  return { activated: [...found].sort(), attempted: [...attempted].sort(), ambiguous: [...ambiguous].filter(name => !found.has(name)).sort() };
}
export function activationFromTrace(trace, options) {
  return inspectActivation(trace, options).activated;
}

function binary(name) {
  if (process.platform !== 'win32') return [name];
  const paths = spawnSync('where.exe', [name], { encoding: 'utf8', windowsHide: true }).stdout?.trim().split(/\r?\n/) ?? [];
  const executable = paths.find(file => file.endsWith('.exe'));
  if (executable) return [executable];
  if (name === 'codex') {
    for (const file of paths) {
      const script = path.join(path.dirname(file), 'node_modules/@openai/codex/bin/codex.js');
      if (existsSync(script)) return [process.execPath, script];
    }
  }
  throw new Error(`Cannot resolve ${name} to an executable; install its CLI first`);
}

function seed(workspace) {
  const root = path.join(workspace, 'study');
  initStudy(root, { id: 'compression-transfer', question: 'Which compression mechanism transfers across tasks?' });
  const records = [
    { id: 'hypothesis-exact', kind: 'hypothesis', data: { prediction: 'Exact passages outperform summaries on all tasks.', falsifier: 'A comparable task favors summaries.', scope: 'Fixed reader and token budget.' } },
    { id: 'evidence-exact', kind: 'evidence', links: [{ rel: 'supports', target: 'hypothesis-exact' }], data: { mode: 'literature', source: 'Fictional fixture A, contract questions, 1024 tokens.', observation: 'Exact 96, summary 83, full 98.', limitations: 'One corpus; no uncertainty estimates.' } },
    { id: 'evidence-contrary', kind: 'evidence', links: [{ rel: 'contradicts', target: 'hypothesis-exact' }], data: { mode: 'literature', source: 'Fictional fixture B, narrative questions, 4096 tokens.', observation: 'Hierarchy 91, exact 84, full 94.', limitations: 'Task, corpus, budget and summary design all differ from A.' } },
    { id: 'lesson-conditional', kind: 'lesson', links: [{ rel: 'derived-from', target: 'evidence-exact' }, { rel: 'derived-from', target: 'evidence-contrary' }], data: { conditions: 'Fixture A only.', action: 'Treat the preferred compressor as conditional.', exceptions: 'B conflicts and is confounded; a generic winner is unproved.' } },
    { id: 'checkpoint', kind: 'decision', links: [{ rel: 'related', target: 'lesson-conditional' }], data: { action: 'research', rationale: 'Find comparable evidence before revising.', next: 'Owner unassigned. Check paired tasks with fixed reader, corpus and budget.' } },
  ];
  for (const record of records) addRecord(root, { title: record.id, summary: record.id, links: [], ...record });
  return Object.fromEntries(readdirSync(path.join(root, 'records')).map(name => [name, hash(path.join(root, 'records', name))]));
}

export function gradeStudy(workspace, before) {
  const checks = { historyPreserved: false, validStudy: false, newCheckpoint: false, contraryLinked: false };
  try {
    checks.historyPreserved = Object.entries(before).every(([name, digest]) => hash(path.join(workspace, 'study/records', name)) === digest);
    const bundle = readBundle(path.join(workspace, 'study'));
    checks.validStudy = true;
    const added = bundle.records.filter(record => !Object.hasOwn(before, record.id + '.json'));
    checks.newCheckpoint = added.some(record => record.kind === 'decision');
    checks.contraryLinked = added.filter(record => record.kind === 'decision').some(record => contextFor(bundle, record.id, { limit: 1000 }).records.some(item => item.id === 'evidence-contrary'));
  } catch (error) { checks.error = error.message; }
  return checks;
}

async function execute(command, args, cwd, prompt, directory, timeoutMs) {
  const start = Date.now();
  let stdout = '', stderr = '', timedOut = false;
  const result = await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    json(path.join(directory, 'process.json'), { pid: child.pid, command, startedAt: new Date().toISOString() });
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
      else child.kill();
    }, timeoutMs);
    child.stdout.on('data', data => { stdout += data; appendFileSync(path.join(directory, 'trace.jsonl'), data); });
    child.stderr.on('data', data => { stderr += data; appendFileSync(path.join(directory, 'stderr.log'), data); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
    child.stdin.end(prompt);
  });
  writeFileSync(path.join(directory, 'trace.jsonl'), stdout);
  writeFileSync(path.join(directory, 'stderr.log'), stderr);
  return { ...result, timedOut, elapsedMs: Date.now() - start, stdout };
}

export async function main(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--out', '--host', '--cases', '--repeats', '--arm', '--timeout-seconds', '--isolate-claude-hooks'].includes(argv[i]) || argv[i + 1] === undefined) throw new Error('Use --out PATH [--host claude|codex|both] [--cases fact,repeat-round] [--repeats 2] [--arm skill|baseline|both] [--timeout-seconds 240] [--isolate-claude-hooks true]');
    options[argv[i].slice(2)] = argv[i + 1];
  }
  if (!options.out) throw new Error('--out is required; use a new scratch directory');
  const output = path.resolve(options.out);
  if (output.split(path.sep).some(part => ['.claude', '.codex', '.agents'].includes(part))) throw new Error('Use an ordinary temporary directory outside agent configuration trees; those paths can deny fixture writes');
  if (output === plugin || output.startsWith(plugin + path.sep)) throw new Error('Keep evaluation state outside the installed plugin');
  if (options['isolate-claude-hooks'] && options['isolate-claude-hooks'] !== 'true') throw new Error('--isolate-claude-hooks accepts true only; omit it to preserve hooks');
  if (existsSync(output)) throw new Error('Output directory already exists; preserve previous trials');
  const repeats = Number(options.repeats ?? 2);
  const timeout = Number(options['timeout-seconds'] ?? 240);
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 3 || !Number.isFinite(timeout) || timeout < 10 || timeout > 600) throw new Error('Repeats must be 1–3; timeout must be 10–600 seconds');
  const hosts = options.host && options.host !== 'both' ? [options.host] : ['claude', 'codex'];
  const arms = options.arm && options.arm !== 'both' ? [options.arm] : ['skill', 'baseline'];
  if (hosts.some(host => !['claude', 'codex'].includes(host)) || arms.some(arm => !['skill', 'baseline'].includes(arm))) throw new Error('Unknown host or arm');
  const suite = JSON.parse(read(path.join(plugin, 'evals/scenarios.json')));
  const ids = (options.cases ?? 'fact,repeat-round').split(',');
  if (ids.some(id => !['fact', 'repeat-round'].includes(id))) throw new Error('This bounded pilot supports fact and repeat-round from scenarios.json');
  mkdirSync(output, { recursive: true });
  const snapshot = path.join(output, 'package/experimentation');
  cpSync(plugin, snapshot, { recursive: true });
  const versions = Object.fromEntries(hosts.map(host => {
    const [command, ...prefix] = binary(host);
    const r = spawnSync(command, [...prefix, '--version'], { encoding: 'utf8', windowsHide: true });
    if (r.status !== 0) throw new Error(`${host} version check failed`);
    return [host, r.stdout.trim()];
  }));
  json(path.join(output, 'run.json'), { runnerPid: process.pid, startedAt: new Date().toISOString(), versions, pluginVersion: JSON.parse(read(path.join(snapshot, '.claude-plugin/plugin.json'))).version, sourceHashes: Object.fromEntries(['evals/run-host-evals.mjs', 'evals/README.md', 'evals/scenarios.json', 'scripts/research-store.mjs', ...['research', 'research-learning', 'evidence-research'].map(name => `skills/${name}/SKILL.md`)].map(file => [file, hash(path.join(snapshot, file))])), repeats, ids, arms, timeout, isolateClaudeHooks: Boolean(options['isolate-claude-hooks']), note: 'Native CLI discovery; Codex uses repo skill junctions to unchanged package skills. No user installation/config changes. Human evidence-quality grading is separate.' });
  const results = [];
  for (let repeat = 1; repeat <= repeats; repeat++) for (const id of ids) for (const host of hosts) {
    // Alternate order to reduce a fixed arm-order effect.
    for (const arm of repeat % 2 ? arms : [...arms].reverse()) {
      const scenario = suite.cases.find(item => item.id === id);
      const directory = path.join(output, `${host}-${id}-${arm}-${repeat}`);
      const workspace = path.join(directory, 'workspace');
      mkdirSync(workspace, { recursive: true });
      const guidance = '# Evaluation workspace\nThis is an unattended, local fixture evaluation. Do not ask questions or send notifications. Use only local files; no network, external services, delegation, installations or user/global memory writes. Write only within this workspace. Return a concise answer when done.\n';
      writeFileSync(path.join(workspace, 'AGENTS.md'), guidance);
      writeFileSync(path.join(workspace, 'CLAUDE.md'), guidance);
      const before = id === 'repeat-round' ? seed(workspace) : {};
      json(path.join(directory, 'fixture-before.json'), { records: before, studySha256: id === 'repeat-round' ? hash(path.join(workspace, 'study/study.json')) : null });
      if (host === 'codex' && arm === 'skill') {
        const skills = path.join(workspace, '.agents/skills');
        mkdirSync(skills, { recursive: true });
        for (const name of ['research', 'research-learning', 'evidence-research']) symlinkSync(path.join(snapshot, 'skills', name), path.join(skills, name), process.platform === 'win32' ? 'junction' : 'dir');
      }
      let prompt = scenario.prompt;
      if (id === 'repeat-round') prompt += '\nThe existing study is in ./study. Its sources are fictional fixtures. Resume it, preserve every original record, and save the next evidence-linked checkpoint in that same study. Do not run an experiment or browse; return at most 500 words.';
      writeFileSync(path.join(directory, 'prompt.txt'), prompt);
      const [command, ...prefix] = binary(host);
      const settings = { enabledPlugins: { 'experimentation@gb-plugins-marketplace': false }, ...(options['isolate-claude-hooks'] ? { disableAllHooks: true } : {}) };
      const args = host === 'claude'
        ? [...prefix, '--print', '--verbose', '--output-format', 'stream-json', '--max-budget-usd', '1.50', '--permission-mode', 'acceptEdits', '--tools', 'Read,Write,Edit,Bash,PowerShell,Skill', '--allowedTools', 'Read,Write,Edit,Skill,Bash,PowerShell', '--settings', JSON.stringify(settings), ...(arm === 'skill' ? ['--plugin-dir', snapshot] : [])]
        : [...prefix, '--no-daemon', '-c', 'plugins."experimentation@gb-plugins-marketplace".enabled=false', 'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '--json', '-'];
      json(path.join(directory, 'command.json'), { command, args, cwd: workspace, stdin: 'prompt.txt' });
      console.log(`Running ${host} ${id} ${arm} trial ${repeat}`);
      let run;
      try { run = await execute(command, args, workspace, prompt, directory, timeout * 1000); }
      catch (error) { run = { code: null, error: error.message, stdout: '', elapsedMs: 0 }; }
      const activation = inspectActivation(run.stdout, { pluginRoot: snapshot, workspace });
      const activated = activation.activated;
      const events = run.stdout.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
      const metadata = events.find(event => event.type === 'system' && event.subtype === 'init');
      const usage = events.findLast(event => event.type === 'result' || event.type === 'turn.completed');
      const answer = events.findLast(event => event.type === 'result')?.result ?? events.findLast(event => event.item?.type === 'agent_message')?.item?.text ?? events.filter(event => event.type === 'assistant').flatMap(event => event.message?.content ?? []).filter(block => block.type === 'text').map(block => block.text).join('\n');
      writeFileSync(path.join(directory, 'answer.md'), answer || 'No answer returned.');
      const executionPass = run.code === 0 && !run.timedOut && Boolean(usage) && Boolean(answer) && !usage?.is_error;
      const sessionId = metadata?.session_id ?? events.find(event => event.type === 'thread.started')?.thread_id;
      const modelReceipt = host === 'codex' ? codexModelReceipt(sessionId) : null;
      const loadedPlugins = metadata?.plugins?.filter(item => item.name === 'experimentation') ?? null;
      const availabilityPass = host === 'claude' ? Boolean(loadedPlugins && (arm === 'skill' ? loadedPlugins.length === 1 && path.resolve(loadedPlugins[0].path) === snapshot : loadedPlugins.length === 0)) : modelReceipt?.inventoryObserved ? (arm === 'skill' ? modelReceipt.discoveredSkills.length === 3 : modelReceipt.discoveredSkills.length === 0) : null;
      const result = { host, id, arm, repeat, expectedSkill: scenario.expectedSkill, ...activation, executionPass, availabilityPass, loadedPlugins, activationPass: !executionPass || activation.ambiguous.length ? null : (arm === 'baseline' || scenario.expectedSkill === 'none' ? activated.length === 0 : activated.includes(scenario.expectedSkill)), exitCode: run.code, timedOut: run.timedOut ?? false, error: run.error, elapsedMs: run.elapsedMs, model: metadata?.model ?? modelReceipt?.model ?? null, modelReceipt, sessionId, reportedCostUsd: usage?.total_cost_usd ?? null, usage: usage?.usage ?? null, stateChecks: id === 'repeat-round' ? gradeStudy(workspace, before) : { noStudyCreated: !existsSync(path.join(workspace, 'study')) }, qualityGrade: 'pending human review of output and traces' };
      json(path.join(directory, 'result.json'), result);
      results.push(result);
      json(path.join(output, 'results.json'), results);
      console.log(JSON.stringify(result));
    }
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv.slice(2)).then(results => {
  if (results.some(result => !result.executionPass || result.availabilityPass !== true || result.activationPass !== true || (result.arm === 'skill' && result.id === 'repeat-round' && Object.values(result.stateChecks).some(value => value !== true)))) process.exitCode = 1;
}).catch(error => { console.error(error.message); process.exitCode = 1; });
