#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, readdirSync, openSync, closeSync, fsyncSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const fields = {
  idea: ['mechanism'],
  hypothesis: ['prediction', 'falsifier', 'scope'],
  experiment: ['method', 'procedure', 'success', 'stop'],
  evidence: ['mode', 'source', 'observation', 'limitations'],
  lesson: ['conditions', 'action', 'exceptions'],
  decision: ['action', 'rationale', 'next'],
};
const relations = ['related', 'tests', 'supports', 'contradicts', 'derived-from', 'depends-on'];
const modes = ['observed', 'historical', 'simulation', 'literature'];
const identifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fail = (message) => { throw new Error(message); };
function object(value, label, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${label}: unknown field ${key}`);
  for (const key of required) if (!(key in value)) fail(`${label}: missing ${key}`);
}
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a nonempty string`);
}
function id(value, label) {
  if (typeof value !== 'string' || value.length > 100 || !identifier.test(value)) fail(`${label} must be a safe lowercase kebab identifier (max 100 characters)`);
}
function timestamp(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value))) fail(`${label} must be an ISO timestamp`);
}
function version(value, label) {
  if (value !== 1) fail(`${label}: unsupported schemaVersion ${value}`);
}
function validateStudy(study) {
  object(study, 'study', ['schemaVersion', 'id', 'question', 'createdAt']);
  version(study.schemaVersion, 'study'); id(study.id, 'study.id');
  text(study.question, 'study.question'); timestamp(study.createdAt, 'study.createdAt');
}
function validateRecord(record) {
  const required = ['schemaVersion', 'id', 'kind', 'title', 'summary', 'createdAt', 'links', 'data'];
  object(record, 'record', [...required, 'supersedes'], required);
  version(record.schemaVersion, 'record'); id(record.id, 'record.id');
  if (!Object.hasOwn(fields, record.kind)) fail(`${record.id}: unknown kind ${record.kind}`);
  for (const key of ['title', 'summary']) text(record[key], `${record.id}.${key}`);
  timestamp(record.createdAt, `${record.id}.createdAt`);
  object(record.data, `${record.id}.data`, fields[record.kind]);
  for (const key of fields[record.kind]) text(record.data[key], `${record.id}.data.${key}`);
  if (record.kind === 'evidence' && !modes.includes(record.data.mode)) fail(`${record.id}: unknown evidence mode`);
  if (!Array.isArray(record.links)) fail(`${record.id}.links must be an array`);
  const seen = new Set();
  for (const link of record.links) {
    object(link, `${record.id}.link`, ['rel', 'target']);
    if (!relations.includes(link.rel)) fail(`${record.id}: unknown link relation ${link.rel}`);
    id(link.target, `${record.id}.link.target`);
    if (link.target === record.id) fail(`${record.id}: self links are not supported`);
    const key = `${link.rel}:${link.target}`;
    if (seen.has(key)) fail(`${record.id}: duplicate link ${key}`);
    seen.add(key);
  }
  if ('supersedes' in record) id(record.supersedes, `${record.id}.supersedes`);
  for (const [kind, rel] of [['experiment', 'tests'], ['lesson', 'derived-from']]) {
    if (record.kind === kind && !record.links.some(link => link.rel === rel)) fail(`${record.id}: ${kind} requires a ${rel} link`);
  }
}

export function validateBundle(bundle) {
  object(bundle, 'bundle', ['schemaVersion', 'study', 'records']);
  version(bundle.schemaVersion, 'bundle'); validateStudy(bundle.study);
  if (!Array.isArray(bundle.records)) fail('bundle.records must be an array');
  const byId = new Map();
  for (const record of bundle.records) {
    validateRecord(record);
    if (byId.has(record.id)) fail(`duplicate record ID ${record.id}`);
    byId.set(record.id, record);
  }
  const replacements = new Map();
  for (const record of bundle.records) {
    for (const link of record.links) {
      const target = byId.get(link.target);
      if (!target) fail(`${record.id}: dangling ${link.rel} target ${link.target}`);
      if (link.rel === 'tests' && target.kind !== 'hypothesis') fail(`${record.id}: tests must target a hypothesis`);
      if (record.kind === 'lesson' && link.rel === 'derived-from' && target.kind !== 'evidence') fail(`${record.id}: derived-from must target evidence`);
    }
    if (record.supersedes) {
      const target = byId.get(record.supersedes);
      if (!target || target.kind !== record.kind) fail(`${record.id}: supersedes must target an existing record of the same kind`);
      if (replacements.has(target.id)) fail(`${target.id}: supersession fork is not allowed`);
      replacements.set(target.id, record.id);
    }
  }
  for (const record of bundle.records) {
    const visited = new Set();
    let current = record;
    while (current?.supersedes) {
      if (visited.has(current.id)) fail(`${record.id}: supersession cycle`);
      visited.add(current.id); current = byId.get(current.supersedes);
    }
  }
  return bundle;
}

function safeEntry(file, directory = false) {
  const stat = lstatSync(file);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())) fail(`${file}: expected a regular ${directory ? 'directory' : 'file'}, not a symlink`);
}
function readJson(file) {
  safeEntry(file);
  try { return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { fail(`${file}: invalid JSON: ${error.message}`); }
}
function studyRoot(root) {
  text(root, '--root');
  const resolved = path.resolve(root);
  safeEntry(resolved, true);
  safeEntry(path.join(resolved, 'records'), true);
  return resolved;
}
export function readBundle(root) {
  root = studyRoot(root);
  const study = readJson(path.join(root, 'study.json'));
  const records = readdirSync(path.join(root, 'records')).sort().filter(name => !name.endsWith('.tmp')).map(name => {
    if (!name.endsWith('.json')) fail(`${name}: unexpected file in records directory`);
    const file = path.join(root, 'records', name);
    const record = readJson(file);
    if (name !== `${record.id}.json`) fail(`${file}: filename does not match record ID`);
    try { validateRecord(record); } catch (error) { fail(`${file}: ${error.message}`); }
    return record;
  });
  return validateBundle({ schemaVersion: 1, study, records });
}

function atomicNew(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  let descriptor;
  try {
    descriptor = openSync(temporary, 'wx');
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`);
    fsyncSync(descriptor); closeSync(descriptor); descriptor = undefined;
    if (existsSync(file)) fail(`${file}: already exists`);
    renameSync(temporary, file);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}
function withLock(root, action) {
  const lock = path.join(root, '.write-lock');
  let descriptor;
  try { descriptor = openSync(lock, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') fail(`Study is locked: ${lock}. Check whether its writer is still running; inspect and remove an abandoned lock only after confirming it is inactive.`);
    throw error;
  }
  try {
    writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    return action();
  } finally { closeSync(descriptor); unlinkSync(lock); }
}
export function initStudy(root, { question, id: studyId } = {}) {
  text(root, '--root'); text(question, 'question');
  root = path.resolve(root);
  if (existsSync(root)) {
    if (!existsSync(path.join(root, 'study.json'))) fail(`${root}: existing foreign directory; choose a new study path`);
    const bundle = readBundle(root);
    if (bundle.study.question !== question || (studyId !== undefined && studyId !== bundle.study.id)) fail('Existing study has a different identity or question');
    return { outcome: 'unchanged', study: bundle.study };
  }
  const study = { schemaVersion: 1, id: studyId ?? path.basename(root), question, createdAt: new Date().toISOString() };
  validateStudy(study);
  mkdirSync(path.dirname(root), { recursive: true });
  mkdirSync(root);
  mkdirSync(path.join(root, 'records'));
  atomicNew(path.join(root, 'study.json'), study);
  return { outcome: 'created', study };
}
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export function addRecord(root, input) {
  root = studyRoot(root);
  return withLock(root, () => {
    const bundle = readBundle(root);
    object(input, 'input', ['schemaVersion', 'id', 'kind', 'title', 'summary', 'createdAt', 'links', 'supersedes', 'data'], ['kind', 'title', 'summary', 'links', 'data']);
    const existing = bundle.records.find(record => record.id === input.id);
    const record = { schemaVersion: 1, id: `${input.kind}-${randomUUID()}`, createdAt: existing?.createdAt ?? new Date().toISOString(), ...input };
    validateRecord(record);
    if (existing) {
      if (stable(existing) !== stable(record)) fail(`ID conflict: ${record.id}; append a new ID with supersedes instead of overwriting`);
      return { outcome: 'unchanged', id: record.id };
    }
    validateBundle({ ...bundle, records: [...bundle.records, record] });
    atomicNew(path.join(root, 'records', `${record.id}.json`), record);
    return { outcome: 'created', id: record.id };
  });
}

function activeRecords(bundle) {
  const superseded = new Set(bundle.records.map(record => record.supersedes).filter(Boolean));
  return bundle.records.filter(record => !superseded.has(record.id));
}
const compact = record => ({ id: record.id, kind: record.kind, title: record.title, summary: record.summary });
export function listRecords(bundle, { kind, query = '', history = false } = {}) {
  if (kind !== undefined && !Object.hasOwn(fields, kind)) fail(`Unknown kind ${kind}`);
  return (history ? bundle.records : activeRecords(bundle))
    .filter(record => (!kind || record.kind === kind) && JSON.stringify(record).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.id.localeCompare(b.id, 'en')).map(compact);
}
export function contextFor(bundle, selectedId, { limit = 30 } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1) fail('limit must be a positive integer');
  const byId = new Map(bundle.records.map(record => [record.id, record]));
  if (!byId.has(selectedId)) fail(`Record not found: ${selectedId}`);
  const neighbors = new Map(bundle.records.map(record => [record.id, new Set()]));
  for (const record of bundle.records) {
    for (const target of [...record.links.map(link => link.target), record.supersedes].filter(Boolean)) {
      neighbors.get(record.id).add(target); neighbors.get(target).add(record.id);
    }
  }
  const ordered = [selectedId], visited = new Set(ordered);
  // Prefer revision lineage and counterevidence before general connected context.
  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i];
    const related = [...neighbors.get(current)].sort((a, b) => {
      const priority = candidate => {
        const record = byId.get(candidate);
        return record.supersedes === current || byId.get(current).supersedes === candidate ? 0
          : record.links.some(link => link.rel === 'contradicts' && link.target === current) ? 1 : 2;
      };
      return priority(a) - priority(b) || a.localeCompare(b, 'en');
    });
    for (const candidate of related) if (!visited.has(candidate)) { visited.add(candidate); ordered.push(candidate); }
  }
  return { selectedId, records: ordered.slice(0, limit).map(recordId => byId.get(recordId)), complete: ordered.length <= limit, omittedCount: Math.max(0, ordered.length - limit), omittedIds: ordered.slice(limit) };
}
export function summarize(bundle) {
  const active = activeRecords(bundle);
  const evidence = bundle.records.filter(record => record.kind === 'evidence');
  return {
    study: bundle.study,
    counts: Object.fromEntries(Object.keys(fields).map(kind => [kind, active.filter(record => record.kind === kind).length])),
    hypotheses: active.filter(record => record.kind === 'hypothesis').map(compact),
    decisions: active.filter(record => record.kind === 'decision').map(compact),
    experimentsWithoutEvidence: active.filter(record => record.kind === 'experiment' && !evidence.some(item => item.links.some(link => link.target === record.id) || record.links.some(link => link.target === item.id))).map(compact),
    note: 'No linked evidence is a retrieval fact, not proof that an experiment has not run. Linked evidence does not imply a conclusive result.',
  };
}
export function schema(kind) {
  if (kind !== undefined && !Object.hasOwn(fields, kind)) fail(`Unknown kind ${kind}`);
  const examples = Object.fromEntries((kind ? [kind] : Object.keys(fields)).map(name => [name, {
    id: `${name}-example`, kind: name, title: 'Replace with a descriptive title', summary: 'Replace with a concise claim or decision',
    links: name === 'experiment' ? [{ rel: 'tests', target: 'hypothesis-id' }] : name === 'lesson' ? [{ rel: 'derived-from', target: 'evidence-id' }] : [],
    data: Object.fromEntries(fields[name].map(field => [field, field === 'mode' ? 'observed' : `Replace with ${field}`])),
  }]));
  return { schemaVersion: 1, generatedRecordFields: ['schemaVersion', 'id', 'createdAt'], optionalRecordFields: ['supersedes'], requiredInputFields: ['kind', 'title', 'summary', 'links', 'data'], linkRelations: relations, evidenceModes: modes, dataFields: kind ? { [kind]: fields[kind] } : fields, examples, bundle: { schemaVersion: 1, study: { schemaVersion: 1, id: 'study-id', question: 'Research question', createdAt: 'ISO timestamp' }, records: ['Full persisted records, including history'] } };
}

const commandOptions = {
  init: ['root', 'question', 'id'], add: ['root', 'file'], list: ['root', 'kind', 'query', 'history'],
  context: ['root', 'id', 'limit'], summary: ['root'], validate: ['root', 'file'], export: ['root'], schema: ['kind'],
};
export function runCli(args) {
  const [command, ...rest] = args;
  if (!command || command === '--help' || command === 'help') return { commands: commandOptions, usage: 'node research-store.mjs COMMAND --root PATH ...', storage: 'init creates a study; add accepts a JSON file; schema prints record examples; --history includes revisions; context --limit defaults to 30; export prints a portable bundle' };
  if (!Object.hasOwn(commandOptions, command)) fail(`Unknown command ${command}`);
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    const name = rest[i].replace(/^--/, '');
    if (!rest[i].startsWith('--') || !commandOptions[command].includes(name) || name in options) fail(`Unknown or duplicate option ${rest[i]}`);
    if (name === 'history') options[name] = true;
    else {
      const value = rest[++i];
      if (value === undefined || value.startsWith('--')) fail(`Missing value for --${name}`);
      options[name] = value;
    }
  }
  if (command === 'schema') return schema(options.kind);
  if (command === 'validate' && options.file) {
    if (options.root) fail('Choose exactly one of --root and --file');
    const bundle = validateBundle(readJson(options.file));
    return { valid: true, studyId: bundle.study.id, recordCount: bundle.records.length };
  }
  text(options.root, '--root');
  if (command === 'init') return initStudy(options.root, options);
  if (command === 'add') { text(options.file, '--file'); return addRecord(options.root, readJson(options.file)); }
  const bundle = readBundle(options.root);
  if (command === 'export') return bundle;
  if (command === 'validate') return { valid: true, studyId: bundle.study.id, recordCount: bundle.records.length };
  if (command === 'list') return listRecords(bundle, options);
  if (command === 'summary') return summarize(bundle);
  text(options.id, '--id');
  return contextFor(bundle, options.id, { limit: options.limit === undefined ? 30 : Number(options.limit) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.stdout.write(`${JSON.stringify(runCli(process.argv.slice(2)), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
