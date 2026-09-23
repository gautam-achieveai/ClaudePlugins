#!/usr/bin/env node
// Local, dependency-free event journal. Reports and state are reproducible views.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, openSync, closeSync, fsyncSync, copyFileSync, statSync, realpathSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { hostname } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';

const HELP = `progress.mjs <command> --root <project-directory> --work-id <safe-id>
Commands (JSON stdout; failures JSON stderr and exit 1):
  init --title <text> --goal <text> [--config <JSON-file>]
  tick-start [--recover-stale]
  append-events --token <token> --input <JSON-array-file>
  reconcile --token <token>
  check
  render --token <token>
  nudge-ack --token <token> --key <nudge-key> --delivery <description>
  tick-finish --token <token> [--result <expected-result>]
  archive --token <token>
  help
--root is the project root; durable files live at .progress/<work-id>.
tick-start returns the exclusive tick token. Every later mutation requires it.
--recover-stale is explicit takeover after config.staleAfterMinutes (default 60).
No replace-state: reconcile deterministically replays the append-only journal.
See reference/state-contract.md for config, event, evidence and transition schemas.`;
const externalKinds = new Set(['milestone', 'dispatch', 'handoff', 'evidence', 'verdict', 'risk', 'ruling', 'blocker', 'terminal', 'source']);
const terminalStatuses = new Set(['completed', 'completed_with_risks', 'blocked_terminal', 'failed']);
const activeStatuses = new Set(['active', 'blocked', 'waiting']);
const statuses = new Set([...activeStatuses, 'completed']);
const now = () => new Date().toISOString();
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
const requireValue = (value, label) => { if (typeof value !== 'string' || !value.trim()) fail('INVALID', `${label} must be a nonempty string`); return value; };
const safeId = value => { requireValue(value, 'ID'); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(value) || Object.hasOwn(Object.prototype, value) || value === 'prototype') fail('INVALID', `Unsafe ID: ${value}`); return value; };
const clone = value => JSON.parse(JSON.stringify(value));
const stable = value => JSON.stringify(sort(value));
function sort(value) { return Array.isArray(value) ? value.map(sort) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value; }
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
function atomic(file, content) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try { writeFileSync(temp, content, { flag: 'wx' }); const fd = openSync(temp, 'r+'); try { fsyncSync(fd); } finally { closeSync(fd); } renameSync(temp, file); }
  finally { if (existsSync(temp)) unlinkSync(temp); }
}
const writeJson = (file, value) => atomic(file, `${JSON.stringify(value, null, 2)}\n`);
function parseArgs(argv) {
  const command = argv.shift() || 'help'; const flags = {};
  while (argv.length) { const key = argv.shift(); if (!key.startsWith('--') || Object.hasOwn(flags, key.slice(2))) fail('INVALID', `Invalid or duplicate flag ${key}`); flags[key.slice(2)] = key === '--recover-stale' ? true : requireValue(argv.shift(), key); }
  const allowed = { init: ['title', 'goal', 'config'], 'tick-start': ['recover-stale'], 'append-events': ['token', 'input'], reconcile: ['token'], check: [], render: ['token'], 'nudge-ack': ['token', 'key', 'delivery'], 'tick-finish': ['token', 'result'], archive: ['token'], help: [], '--help': [] };
  if (!Object.hasOwn(allowed, command)) fail('INVALID', `Unknown command ${command}`);
  for (const key of Object.keys(flags)) if (!['root', 'work-id', ...allowed[command]].includes(key)) fail('INVALID', `Unknown flag --${key}`);
  return { command, flags };
}
function paths(flags) {
  const root = realpathSync(resolve(requireValue(flags.root, '--root')));
  const workId = safeId(flags['work-id']); const parent = join(root, '.progress'); const dir = join(parent, workId);
  for (const path of [parent, dir]) if (existsSync(path)) { const rel = relative(root, realpathSync(path)); if (rel.startsWith('..') || isAbsolute(rel)) fail('INVALID', 'Progress directory resolves outside project root'); }
  return { root, workId, parent, dir };
}
function configFor(flags, workId) {
  const supplied = flags.config ? readJson(resolve(flags.config)) : {};
  const config = { schemaVersion: 1, workId, title: requireValue(flags.title, '--title'), goal: requireValue(flags.goal, '--goal'), doneWhen: [], sources: [], workerReports: [], cadenceMinutes: 15, staleAfterMinutes: 60, noProgressThreshold: 1, formats: ['markdown', 'html', 'mermaid'], notifications: { enabled: true }, ...supplied };
  config.schemaVersion = 1; config.workId = workId; config.title = flags.title; config.goal = flags.goal;
  validateCriteria(config.doneWhen);
  for (const key of ['sources', 'workerReports']) { if (!Array.isArray(config[key])) fail('INVALID', `${key} must be an array of explicit paths`); config[key].forEach(path => requireValue(path, key)); }
  for (const key of ['cadenceMinutes', 'staleAfterMinutes', 'noProgressThreshold']) if (typeof config[key] !== 'number' || !Number.isFinite(config[key]) || config[key] <= 0) fail('INVALID', `${key} must be positive`);
  return config;
}
function validateCriteria(criteria) {
  if (!Array.isArray(criteria)) fail('INVALID', 'criteria must be an array');
  const ids = new Set(); for (const criterion of criteria) { safeId(criterion.id); requireValue(criterion.description, 'criterion description'); if (ids.has(criterion.id)) fail('INVALID', 'Duplicate criterion'); ids.add(criterion.id); }
}
function initial(config) {
  return { schemaVersion: 1, workId: config.workId, status: 'active', journalCursor: 0, tickSequence: 0, lastTickResult: null, sourceCursors: {}, gitHead: null, milestones: {}, workstreams: {}, evidence: {}, risks: {}, blockers: {}, rulings: {}, staleSources: [], nextActions: [], nudges: [], activeTick: null, lastReceipt: null };
}
function journal(dir) {
  const text = readFileSync(join(dir, 'events.jsonl'), 'utf8');
  if (text && !text.endsWith('\n')) fail('JOURNAL_TAIL', 'Incomplete journal tail; preserve journal and recover its last complete transaction before continuing');
  const rows = text.trim() ? text.trimEnd().split('\n').map(line => JSON.parse(line)) : [];
  const ids = new Set();
  rows.forEach((row, index) => { if (row.sequence !== index + 1 || !Array.isArray(row.events) || !row.events.length) fail('INVALID', 'Invalid journal sequence'); for (const event of row.events) { if (ids.has(event.id)) fail('INVALID', `Duplicate journal event ${event.id}`); ids.add(event.id); } });
  return rows;
}
function append(dir, rows, events) {
  if (!events.length) return;
  const row = { sequence: rows.length + 1, events };
  const file = join(dir, 'events.jsonl');
  // Preserve every old byte, but atomically publish a complete new transaction.
  // A killed writer can leave a temporary sibling, never a torn live journal.
  atomic(file, `${readFileSync(file, 'utf8')}${JSON.stringify(row)}\n`);
  rows.push(row);
}
function system(kind, data = {}, id = `_runtime:${randomUUID()}`) { return { id, timestamp: now(), source: { path: 'progress.mjs', location: kind }, summary: kind, kind, evidence: [], ...data }; }
function validateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) fail('INVALID', 'Event must be an object');
  requireValue(event.id, 'event.id'); if (event.id.startsWith('_runtime:')) fail('INVALID', 'Reserved event ID namespace');
  if (!externalKinds.has(event.kind)) fail('INVALID', `Unsupported event kind ${event.kind}`);
  requireValue(event.timestamp, 'timestamp'); if (!/^\d{4}-\d\d-\d\dT.+(?:Z|\+00:00)$/.test(event.timestamp) || !Number.isFinite(Date.parse(event.timestamp))) fail('INVALID', 'timestamp must be UTC ISO 8601');
  requireValue(event.source?.path, 'source.path'); requireValue(event.source?.location, 'source.location'); requireValue(event.summary, 'summary');
  if (!Array.isArray(event.evidence)) fail('INVALID', 'evidence must be an array');
  if (event.workstreamId) safeId(event.workstreamId); if (event.milestoneId) safeId(event.milestoneId);
  if (event.transition !== undefined && (!event.transition || typeof event.transition !== 'object' || Array.isArray(event.transition))) fail('INVALID', 'transition must be an object');
  for (const evidence of event.evidence) { safeId(evidence.id); requireValue(evidence.path, 'evidence.path'); requireValue(evidence.detail, 'evidence.detail'); if (typeof evidence.verified !== 'boolean') fail('INVALID', 'evidence.verified must be boolean'); if (evidence.criterionId) safeId(evidence.criterionId); }
}
function proofFor(state, ids, criteria = []) {
  const proofs = ids.map(id => state.evidence[id]).filter(item => item?.verified);
  if (!proofs.length) fail('EVIDENCE_REQUIRED', 'Completion requires verified sourced evidence');
  for (const criterion of criteria) if (!proofs.some(item => item.criterionId === criterion.id)) fail('EVIDENCE_REQUIRED', `Missing verified evidence for criterion ${criterion.id}`);
}
function material(state) {
  // Descriptive churn, clocks, handoff prose, cursors and nudges never advance progress.
  const entities = collection => Object.fromEntries(Object.entries(collection).map(([id, value]) => [id, { status: value.status, evidence: value.evidence.filter(key => state.evidence[key]?.verified).sort(), parentId: value.parentId, dependencies: [...new Set(value.dependencies)].sort(), owner: value.owner, critical: value.critical, milestoneId: value.milestoneId || null, criteria: value.criteria?.map(item => ({ id: item.id, description: item.description })).sort((a, b) => a.id.localeCompare(b.id)) }]));
  const facts = collection => Object.fromEntries(Object.entries(collection).map(([id, value]) => [id, { status: value.status, workstreamId: value.workstreamId, evidence: value.evidence.filter(key => state.evidence[key]?.verified).sort() }]));
  return { status: state.status, workstreams: entities(state.workstreams), milestones: entities(state.milestones), evidence: Object.keys(state.evidence).filter(id => state.evidence[id].verified).sort(), risks: facts(state.risks), blockers: facts(state.blockers), rulings: facts(state.rulings) };
}
function changedWorkstreams(deltas) {
  const changed = new Set(deltas.filter(item => item.field === 'workstreams').map(item => item.id));
  for (const item of deltas) if (['risks', 'blockers', 'rulings'].includes(item.field)) for (const record of [item.before, item.after]) if (record?.workstreamId) changed.add(record.workstreamId);
  return changed;
}
function validateGraph(collection, label) {
  for (const entity of Object.values(collection)) {
    const visit = (id, ancestors = new Set()) => { if (ancestors.has(id)) fail('INVALID', `${label} cycle at ${id}`); const value = collection[id]; if (!value) fail('INVALID', `Unknown ${label} ID ${id}`); const seen = new Set([...ancestors, id]); for (const dep of [...(value.dependencies || []), ...(value.parentId ? [value.parentId] : [])]) visit(dep, seen); };
    visit(entity.id);
  }
}
function replay(config, rows) {
  const state = initial(config);
  for (const row of rows) {
    for (const event of row.events) reduce(state, event, config);
    state.journalCursor = row.sequence;
  }
  classify(state); return state;
}
function requiredSources(config, state) {
  return [...new Set([...config.sources, ...config.workerReports, ...Object.values(state.workstreams).flatMap(item => item.reportPaths)])];
}
function staleObservations(config, state, timestamp) {
  return requiredSources(config, state).filter(path => {
    const observation = state.sourceCursors[path];
    const age = Date.parse(timestamp) - Date.parse(observation?.observedAt);
    return !observation || observation.status !== 'fresh' || !Number.isFinite(age) || age > config.staleAfterMinutes * 60000 || age < -30000;
  });
}
function unavailableSources(ctx, config, state, timestamp) {
  return [...new Set([...staleObservations(config, state, timestamp), ...requiredSources(config, state).filter(path => { try { return !statSync(resolve(ctx.root, path)).isFile(); } catch { return true; } })])];
}
function reduce(state, event, config) {
  const t = event.transition || {};
  if (event.kind === 'tick_started') {
    state.tickSequence = event.tick; state.activeTick = { tick: event.tick, startedAt: event.timestamp, baseline: state.recoveryBaseline || material(state), deltas: [], unchangedWorkstreams: [], result: null }; delete state.recoveryBaseline; return;
  }
  if (event.kind === 'lock_recovered') { state.recoveryBaseline = state.activeTick?.baseline || state.recoveryBaseline || material(state); state.activeTick = null; return; }
  if (event.kind === 'tick_finished') {
    state.lastReceipt = event.receipt; state.lastTickResult = event.receipt.result;
    for (const id of Object.keys(state.workstreams)) { const stream = state.workstreams[id]; stream.noProgressCount = event.receipt.unchangedWorkstreams.includes(id) ? (stream.noProgressCount || 0) + 1 : 0; }
    state.activeTick = null; return;
  }
  if (event.kind === 'nudge_required') { if (!state.nudges.some(item => item.key === event.nudge.key)) state.nudges.push(event.nudge); return; }
  if (event.kind === 'nudge_delivered') { const nudge = state.nudges.find(item => item.key === event.key); if (!nudge) fail('INVALID', 'Unknown nudge key'); nudge.delivery = 'delivered'; nudge.deliveredAt = event.timestamp; nudge.deliveryDescription = event.delivery; return; }
  if (event.kind === 'nudge_superseded') { const nudge = state.nudges.find(item => item.key === event.key); if (!nudge) fail('INVALID', 'Unknown nudge key'); nudge.delivery = 'superseded'; nudge.supersededAt = event.timestamp; nudge.supersededReason = event.reason; return; }
  if (event.kind === 'source_probe') { state.staleSources = event.staleSources; return; }
  validateEvent(event);
  if (terminalStatuses.has(state.status)) fail('TERMINAL', 'Terminal work cannot accept domain events');
  const verifiedBefore = new Set(Object.keys(state.evidence).filter(id => state.evidence[id].verified));
  for (const item of event.evidence) {
    const previous = state.evidence[item.id];
    if (previous && stable(previous) !== stable(item)) fail('CONFLICT', `Conflicting evidence ID ${item.id}`);
    state.evidence[item.id] = clone(item);
  }
  const evidenceIds = event.evidence.map(item => item.id);
  if (['dispatch', 'handoff', 'milestone'].includes(event.kind)) {
    const isMilestone = event.kind === 'milestone'; const id = isMilestone ? event.milestoneId : event.workstreamId; safeId(id);
    const collection = isMilestone ? state.milestones : state.workstreams;
    const previous = collection[id]; if (!previous && event.kind === 'handoff') fail('INVALID', 'Handoff requires an existing workstream');
    const allowed = isMilestone ? ['title', 'dependencies', 'status', 'criteria', 'nextAction'] : ['title', 'owner', 'parentId', 'dependencies', 'milestoneId', 'reportPaths', 'status', 'critical', 'nextAction'];
    for (const key of Object.keys(t)) if (!allowed.includes(key)) fail('INVALID', `Unsupported ${event.kind} transition field ${key}`);
    const entity = { id, title: id, status: 'active', dependencies: [], evidence: [], ...(isMilestone ? { criteria: [] } : { owner: '', parentId: null, reportPaths: [], critical: true, noProgressCount: 0 }), ...previous, ...t };
    requireValue(entity.title, 'title'); if (!statuses.has(entity.status)) fail('INVALID', `Invalid status ${entity.status}`);
    if (!Array.isArray(entity.dependencies)) fail('INVALID', 'dependencies must be an array'); entity.dependencies.forEach(safeId);
    if (isMilestone) validateCriteria(entity.criteria);
    else { requireValue(entity.owner, 'owner'); if (!Array.isArray(entity.reportPaths)) fail('INVALID', 'reportPaths must be an array'); entity.reportPaths.forEach(path => requireValue(path, 'report path')); if (entity.parentId) safeId(entity.parentId); if (typeof entity.critical !== 'boolean') fail('INVALID', 'critical must be boolean'); if (entity.milestoneId && !state.milestones[entity.milestoneId]) fail('INVALID', 'Unknown linked milestone'); }
    entity.evidence = [...new Set([...(previous?.evidence || []), ...evidenceIds])];
    if (entity.status === 'completed') { proofFor(state, entity.evidence, isMilestone ? entity.criteria : []); for (const dep of entity.dependencies) if (collection[dep]?.status !== 'completed') fail('INVALID', `Dependency ${dep} is incomplete`); if (!isMilestone && Object.values(collection).some(item => item.parentId === id && item.status !== 'completed')) fail('INVALID', `Child workstreams of ${id} are incomplete`); }
    if (!isMilestone && entity.parentId && collection[entity.parentId]?.status === 'completed' && entity.status !== 'completed') fail('INVALID', 'Cannot add unfinished work to a completed parent');
    collection[id] = entity; validateGraph(collection, isMilestone ? 'milestone' : 'workstream');
    if (!isMilestone) entity.latestHandoff = event.kind === 'handoff' ? { eventId: event.id, summary: event.summary, source: event.source, timestamp: event.timestamp } : entity.latestHandoff;
  } else if (event.kind === 'evidence' || event.kind === 'verdict') {
    if (Object.keys(t).length) fail('INVALID', `${event.kind} has no state transition; use handoff or milestone`);
    if (!event.workstreamId && !event.milestoneId) fail('INVALID', 'Evidence requires a workstream or milestone target');
    for (const [id, collection] of [[event.workstreamId, state.workstreams], [event.milestoneId, state.milestones]]) if (id) { if (!collection[id]) fail('INVALID', `Unknown evidence target ${id}`); collection[id].evidence = [...new Set([...collection[id].evidence, ...evidenceIds])]; }
  } else if (['risk', 'blocker', 'ruling'].includes(event.kind)) {
    safeId(t.id); if (!['open', 'resolved', 'accepted'].includes(t.status)) fail('INVALID', 'Risk/blocker/ruling status must be open, resolved or accepted');
    requireValue(t.description, 'description'); if (t.status !== 'open') proofFor(state, evidenceIds);
    const collection = state[event.kind === 'risk' ? 'risks' : event.kind === 'blocker' ? 'blockers' : 'rulings'];
    if (event.workstreamId && !state.workstreams[event.workstreamId]) fail('INVALID', 'Unknown workstream');
    collection[t.id] = { ...t, workstreamId: event.workstreamId || null, evidence: evidenceIds, source: event.source };
  } else if (event.kind === 'source') {
    if (!['fresh', 'stale'].includes(t.status)) fail('INVALID', 'Source status must be fresh or stale');
    const path = event.source.path; Object.defineProperty(state.sourceCursors, path, { value: { status: t.status, cursor: t.cursor ?? null, eventId: event.id, observedAt: event.timestamp }, enumerable: true, configurable: true, writable: true });
    if (t.status === 'fresh') state.staleSources = state.staleSources.filter(item => item !== path);
    if (t.gitHead !== undefined) state.gitHead = requireValue(t.gitHead, 'gitHead');
  } else if (event.kind === 'terminal') {
    if (!terminalStatuses.has(t.status)) fail('INVALID', 'Unsupported terminal status');
    proofFor(state, evidenceIds, t.status.startsWith('completed') ? config.doneWhen : []);
    if (t.status.startsWith('completed')) {
      if (!config.doneWhen.length) fail('EVIDENCE_REQUIRED', 'Configure at least one doneWhen criterion before completed terminal status');
      if (Object.values(state.workstreams).some(item => item.status !== 'completed') || Object.values(state.milestones).some(item => item.status !== 'completed')) fail('INVALID', 'All workstreams and milestones must be completed');
      if (Object.values(state.blockers).some(item => item.status === 'open')) fail('INVALID', 'Open blockers prevent completion');
      const risks = Object.values(state.risks); if (risks.some(item => item.status === 'open')) fail('INVALID', 'Open risks prevent completion');
      if (t.status === 'completed' && risks.some(item => item.status === 'accepted')) fail('INVALID', 'Accepted risks require completed_with_risks');
      if (t.status === 'completed_with_risks' && !risks.some(item => item.status === 'accepted')) fail('INVALID', 'completed_with_risks requires at least one accepted risk');
      if (state.staleSources.length || staleObservations(config, state, event.timestamp).length || Object.values(state.sourceCursors).some(item => item.status === 'stale')) fail('INVALID', 'Stale sources prevent completion');
    }
    state.status = t.status; state.terminal = { eventId: event.id, timestamp: event.timestamp, summary: event.summary, evidence: evidenceIds, source: event.source };
  }
  if (event.workstreamId && state.workstreams[event.workstreamId]) {
    const stream = state.workstreams[event.workstreamId];
    if (evidenceIds.some(id => state.evidence[id].verified && !verifiedBefore.has(id))) stream.lastVerifiedProgress = { eventId: event.id, timestamp: event.timestamp, summary: event.summary };
  }
  state.nextActions = Object.values(state.workstreams).filter(item => item.nextAction).map(item => ({ workstreamId: item.id, action: item.nextAction }));
}
function classify(state) {
  if (!state.activeTick) return;
  const tick = state.activeTick, before = tick.baseline, after = material(state), deltas = [];
  for (const field of Object.keys(after)) {
    if (field === 'status' || field === 'evidence') { if (stable(before[field]) !== stable(after[field])) deltas.push({ field, before: before[field], after: after[field] }); }
    else for (const id of new Set([...Object.keys(before[field]), ...Object.keys(after[field])])) if (stable(before[field][id]) !== stable(after[field][id])) deltas.push({ field, id, before: before[field][id] ?? null, after: after[field][id] ?? null });
  }
  tick.deltas = deltas;
  const changed = changedWorkstreams(deltas);
  tick.unchangedWorkstreams = Object.values(state.workstreams).filter(item => activeStatuses.has(item.status) && !changed.has(item.id)).map(item => item.id).sort();
  const blocked = Object.values(state.blockers).filter(item => item.status === 'open' && item.critical !== false && state.workstreams[item.workstreamId]?.critical !== false);
  const unblockedAdvance = [...changed].some(id => { const stream = state.workstreams[id]; return stream.critical && stream.status !== 'blocked' && !blocked.some(item => !item.workstreamId || item.workstreamId === id); });
  const stale = state.staleSources.length || Object.values(state.sourceCursors).some(item => item.status === 'stale');
  tick.result = terminalStatuses.has(state.status) ? 'TERMINAL' : stale ? 'STALE' : (blocked.length || Object.values(state.workstreams).some(item => item.critical && item.status === 'blocked')) && !unblockedAdvance ? 'BLOCKED' : deltas.length ? 'PROGRESSED' : 'NO_PROGRESS';
  state.lastTickResult = tick.result;
}
function reconcile(ctx, config, rows) {
  let state = replay(config, rows);
  if (!state.activeTick) {
    const lock = readJson(join(ctx.dir, 'tick.lock'));
    if (state.lastReceipt?.tick !== lock.tick) fail('INVALID', 'No active or committed tick matches the lock');
    // A committed receipt is immutable even if publishing its views failed.
    writeJson(join(ctx.dir, 'state.json'), state); return state;
  }
  const staleSources = unavailableSources(ctx, config, state, now());
  if (stable(staleSources) !== stable(state.staleSources) && !terminalStatuses.has(state.status)) { append(ctx.dir, rows, [system('source_probe', { staleSources })]); state = replay(config, rows); }
  const changed = changedWorkstreams(state.activeTick.deltas);
  const terminal = terminalStatuses.has(state.status);
  const superseded = state.nudges.filter(item => item.delivery === 'pending' && (terminal || changed.has(item.workstreamId) || state.workstreams[item.workstreamId]?.status === 'completed' || state.workstreams[item.workstreamId]?.owner !== item.owner)).map(item => system('nudge_superseded', { key: item.key, reason: terminal ? 'Work reached terminal outcome' : 'Workstream progressed, completed, or changed owner' }));
  append(ctx.dir, rows, superseded); state = replay(config, rows);
  const nudges = terminal ? [] : state.activeTick.unchangedWorkstreams.filter(id => !state.nudges.some(item => item.key === `${state.workId}:${state.activeTick.tick}:${id}`)).map(id => {
    const stream = state.workstreams[id];
    return system('nudge_required', { nudge: { key: `${state.workId}:${state.activeTick.tick}:${id}`, workId: state.workId, workstreamId: id, tick: state.activeTick.tick, owner: stream.owner, delivery: 'pending', lastVerifiedProgress: stream.lastVerifiedProgress || null, blocker: Object.values(state.blockers).find(item => item.status === 'open' && (!item.workstreamId || item.workstreamId === id))?.description || 'No new verified evidence or accepted state transition', reportPaths: stream.reportPaths, ledgerPaths: config.sources, question: 'What prevented verified progress, and what exact evidence or context will unblock the next step?', requestedStatuses: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'], escalated: (stream.noProgressCount || 0) + 1 >= config.noProgressThreshold } });
  });
  append(ctx.dir, rows, nudges); state = replay(config, rows); writeJson(join(ctx.dir, 'state.json'), state); return state;
}
function mutex(dir, recover, fn) {
  const file = join(dir, 'mutation.lock'), gate = join(dir, 'mutation-recovery.lock');
  if (existsSync(gate)) fail('BUSY', 'Mutation lock recovery in progress; inspect interrupted recovery if persistent');
  let fd;
  try { fd = openSync(file, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (!recover) fail('BUSY', 'Another command owns the mutation lock');
    let gateFd; try { gateFd = openSync(gate, 'wx'); } catch { fail('BUSY', 'Another command is recovering the mutation lock'); }
    try {
      let owner = null; try { owner = readJson(file); } catch {}
      // An unreadable lock is an owner that died between creating and writing it; allow a moment for a live writer.
      if (!owner) { if (Date.now() - statSync(file).mtimeMs < 5000) fail('BUSY', 'Mutation lock is being written; retry'); }
      else {
        if (owner.host !== hostname()) fail('BUSY', 'Cannot recover a mutation lock from another host');
        let alive = true; try { process.kill(owner.pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; }
        if (alive) fail('BUSY', 'Mutation lock owner is still running');
      }
      unlinkSync(file); fd = openSync(file, 'wx');
    } finally { closeSync(gateFd); unlinkSync(gate); }
  }
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid, host: hostname() }));
    if (existsSync(gate)) fail('BUSY', 'Mutation lock recovery in progress');
    return fn();
  } finally { closeSync(fd); unlinkSync(file); }
}
function ownLock(ctx, token) {
  const file = join(ctx.dir, 'tick.lock');
  if (!existsSync(file)) fail('LOCK_OWNER', 'No active tick; run tick-start');
  const lock = readJson(file); if (lock.token !== token) fail('LOCK_OWNER', 'Token does not own the active tick'); return lock;
}
const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const md = value => escapeHtml(String(value ?? '').replaceAll('`', "'").replaceAll('|', '\\|').replace(/[\r\n]+/g, ' '));
const label = value => String(value).replace(/[^a-zA-Z0-9 ._:-]/g, ' ').slice(0, 160);
function diagrams(state) {
  const milestone = ['flowchart LR'], workstream = ['flowchart TD'], dependencies = ['flowchart LR'];
  for (const item of Object.values(state.milestones)) { milestone.push(`  m_${item.id}["${label(item.title)} (${item.status})"]`); for (const dep of item.dependencies) milestone.push(`  m_${dep} --> m_${item.id}`); }
  const linkedMilestones = new Set();
  for (const item of Object.values(state.workstreams)) { const node = `w_${item.id}["${label(item.title)} (${item.status})"]`; workstream.push(`  ${node}`); dependencies.push(`  ${node}`); if (item.parentId) workstream.push(`  w_${item.parentId} --> w_${item.id}`); if (item.milestoneId) { if (!linkedMilestones.has(item.milestoneId)) { workstream.push(`  m_${item.milestoneId}["Milestone: ${label(state.milestones[item.milestoneId].title)}"]`); linkedMilestones.add(item.milestoneId); } workstream.push(`  m_${item.milestoneId} --> w_${item.id}`); } for (const dep of item.dependencies) dependencies.push(`  w_${dep} --> w_${item.id}`); }
  for (const list of [milestone, workstream, dependencies]) if (list.length === 1) list.push('  empty["No entries yet"]');
  return { milestones: milestone.join('\n'), workstreams: workstream.join('\n'), dependencies: dependencies.join('\n') };
}
function render(ctx, config, state) {
  const graphs = diagrams(state), tick = state.activeTick || state.lastReceipt;
  const architecture = join(ctx.dir, 'diagrams', 'system.mmd');
  if (existsSync(architecture)) graphs.system = readFileSync(architecture, 'utf8');
  const result = state.lastTickResult || 'NO_PROGRESS';
  const sections = [
    ['Done when', ['Criterion', 'Description', 'Observed verified evidence'], config.doneWhen.map(item => [item.id, item.description, Object.values(state.evidence).filter(evidence => evidence.verified && evidence.criterionId === item.id).map(evidence => evidence.id).join(', ') || 'none observed'])],
    ['Workstreams', ['ID', 'Title', 'Owner', 'Status', 'Parent', 'Milestone', 'Dependencies', 'Evidence', 'Next action'], Object.values(state.workstreams).map(item => [item.id, item.title, item.owner, item.status, item.parentId || '', item.milestoneId || '', item.dependencies.join(', '), item.evidence.join(', '), item.nextAction || ''])],
    ['Milestones', ['ID', 'Title', 'Status', 'Dependencies', 'Criteria', 'Evidence'], Object.values(state.milestones).map(item => [item.id, item.title, item.status, item.dependencies.join(', '), item.criteria.map(c => `${c.id}: ${c.description}`).join('; '), item.evidence.join(', ')])],
    ['Evidence', ['ID', 'Criterion', 'Verified', 'Path', 'Detail'], Object.values(state.evidence).map(item => [item.id, item.criterionId || '', item.verified ? 'yes' : 'no', item.path, item.detail])],
    ['Risks and blockers', ['Kind', 'ID', 'Status', 'Description'], ['risks', 'blockers', 'rulings'].flatMap(kind => Object.entries(state[kind]).map(([id, item]) => [kind, id, item.status, item.description]))],
    ['Nudges', ['Key', 'Owner', 'Delivery', 'Reason', 'Update paths', 'Diagnostic question'], state.nudges.map(item => [item.key, item.owner, item.delivery === 'pending' ? 'nudge_required (pending delivery)' : item.delivery === 'superseded' ? `superseded: ${item.supersededReason}` : `delivered: ${item.deliveryDescription}`, item.blocker, [...item.reportPaths, ...item.ledgerPaths].join(', '), item.question])],
  ];
  const unchanged = tick?.unchangedWorkstreams || [];
  const deltas = tick?.deltas || [];
  const stale = [...new Set([...state.staleSources, ...Object.entries(state.sourceCursors).filter(([, value]) => value.status === 'stale').map(([path]) => path)])];
  const asOf = `${now().replace('T', ' ').replace('Z', '')} UTC`;
  const changes = deltas.flatMap(item => {
    if (item.field === 'evidence') {
      const attached = new Set(deltas.filter(delta => delta.after?.evidence).flatMap(delta => delta.after.evidence));
      const ungrouped = item.after.filter(id => !item.before.includes(id) && !attached.has(id));
      return ungrouped.length ? [`Verified evidence added: ${ungrouped.join(', ')}.`] : [];
    }
    if (item.field === 'status') return [`Work status: ${item.before} → ${item.after}.`];
    const name = state[item.field]?.[item.id]?.title || item.id;
    if (item.after && typeof item.after === 'object') {
      const lines = [];
      if (!item.before) lines.push(`${name} started (${item.after.status})${item.after.owner ? `; owner ${item.after.owner}` : ''}.`);
      else {
        if (item.before.status !== item.after.status) lines.push(`${name} status: ${item.before.status} → ${item.after.status}.`);
        if (item.before.owner !== item.after.owner) lines.push(`${name} owner: ${item.before.owner || 'none'} → ${item.after.owner || 'none'}.`);
        if (item.before.parentId !== item.after.parentId) lines.push(`${name} parent: ${item.before.parentId || 'none'} → ${item.after.parentId || 'none'}.`);
        if (item.before.milestoneId !== item.after.milestoneId) lines.push(`${name} milestone: ${item.before.milestoneId || 'none'} → ${item.after.milestoneId || 'none'}.`);
        if (item.before.workstreamId !== item.after.workstreamId) lines.push(`${name} workstream: ${item.before.workstreamId || 'none'} → ${item.after.workstreamId || 'none'}.`);
        if (stable(item.before.dependencies) !== stable(item.after.dependencies)) lines.push(`${name} dependencies: ${item.before.dependencies?.join(', ') || 'none'} → ${item.after.dependencies?.join(', ') || 'none'}.`);
        if (stable(item.before.criteria) !== stable(item.after.criteria)) lines.push(`${name} acceptance criteria: ${item.after.criteria?.map(criterion => `${criterion.id}: ${criterion.description}`).join('; ') || 'none'}.`);
        if (item.before.critical !== item.after.critical) lines.push(`${name} critical path: ${item.after.critical ? 'yes' : 'no'}.`);
      }
      const gained = item.after.evidence.filter(id => !item.before?.evidence.includes(id));
      if (gained.length) lines.push(`${name} gained verified evidence: ${gained.join(', ')}.`);
      return lines;
    }
    return [`${item.field} ${name}: ${item.before || 'new'} → ${item.after}.`];
  });
  const waiting = Object.values(state.blockers).filter(item => item.status === 'open').map(item => item.description).concat(Object.values(state.workstreams).filter(item => ['waiting', 'blocked'].includes(item.status)).map(item => `${item.id} (${item.owner}): ${item.nextAction || 'owner update required'}`), stale.map(path => `Refresh source: ${path}`));
  const unchangedDetails = unchanged.map(id => { const item = state.workstreams[id]; return `NO_PROGRESS — ${item.title} (${id}) — ${item.owner}. Last verified progress: ${item.lastVerifiedProgress ? `${item.lastVerifiedProgress.summary} (${item.lastVerifiedProgress.timestamp})` : 'none recorded'}. Next: ${item.nextAction || 'supply evidence or a diagnostic handoff'}.`; });
  const markdownList = values => values.length ? values.map(item => `- ${md(item)}`).join('\n') : 'None.';
  const htmlList = values => values.length ? `<ul>${values.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>None.</p>';
  let markdown = `# ${md(config.title)}\n\n**${result}** · ${md(state.status)} · tick ${state.tickSequence}\n\nAs of ${asOf}\n\n${md(config.goal)}\n\n## What progressed\n\n${changes.length ? markdownList(changes) : 'Nothing progressed.'}\n\n## Unchanged active workstreams\n\n${markdownList(unchangedDetails)}\n\n## Waiting on\n\n${markdownList(waiting)}\n\n<details><summary>Exact deltas</summary>\n\n${deltas.length ? deltas.map(item => `- ${md(stable(item))}`).join('\n') : 'No material change.'}\n\n</details>\n`;
  let body = `<h1>${escapeHtml(config.title)}</h1><p class="result">${escapeHtml(result)} · ${escapeHtml(state.status)} · tick ${state.tickSequence}</p><p>As of ${asOf}</p><p>${escapeHtml(config.goal)}</p><h2>What progressed</h2>${changes.length ? htmlList(changes) : '<p>Nothing progressed.</p>'}<h2>Unchanged active workstreams</h2>${htmlList(unchangedDetails)}<h2>Waiting on</h2>${htmlList(waiting)}<details><summary>Exact deltas</summary><pre>${escapeHtml(deltas.length ? JSON.stringify(deltas, null, 2) : 'No material change.')}</pre></details>`;
  for (const [title, headers, rows] of sections) {
    markdown += `\n## ${title}\n\n| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n')}\n`;
    body += `<h2>${title}</h2><div class="table"><table><caption>${title}</caption><thead><tr>${headers.map(cell => `<th scope="col">${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  for (const [name, source] of Object.entries(graphs)) { const fence = '`'.repeat(Math.max(3, ...[...source.matchAll(/`+/g)].map(match => match[0].length + 1))); markdown += `\n## ${name} Mermaid source\n\n${fence}mermaid\n${source}\n${fence}\n`; body += `<h2>${escapeHtml(name)} Mermaid source</h2><p>Readable graph source.${name === 'system' ? ' Architecture source is maintained by the architect.' : ' Equivalent relationships appear in the tables above.'}</p><pre>${escapeHtml(source)}</pre>`; }
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${escapeHtml(config.title)}</title><style>body{font:18px/1.55 system-ui,sans-serif;color:#17212b;background:#fff;max-width:1100px;margin:auto;padding:24px}h1,h2{line-height:1.2}.result{font-weight:bold;background:#edf3f8;padding:16px;border-left:5px solid #294d6a}.table{overflow:auto}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;border:1px solid #788793;padding:10px}th{background:#edf3f8}caption{text-align:left;font-weight:bold}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f0f3f5;padding:16px}a{color:#174d8c}@media(prefers-color-scheme:dark){body{color:#f0f4f8;background:#15202b}.result,th,pre{background:#243647}.result{border-color:#9bcef7}th,td{border-color:#8c9ead}a{color:#a8d4ff}}</style></head><body><main>${body}</main></body></html>\n`;
  mkdirSync(join(ctx.dir, 'diagrams'), { recursive: true });
  for (const [name, source] of Object.entries(graphs)) if (name !== 'system') atomic(join(ctx.dir, 'diagrams', `${name}.mmd`), `${source}\n`);
  atomic(join(ctx.dir, 'report.md'), markdown); atomic(join(ctx.dir, 'report.html'), html);
  return { result, files: ['report.md', 'report.html', ...Object.keys(graphs).map(name => `diagrams/${name}.mmd`)] };
}
function finish(ctx, config, rows, expected, releaseLock = true) {
  const state = reconcile(ctx, config, rows), tick = state.activeTick;
  const result = tick?.result || state.lastReceipt.result;
  if (expected && expected !== result) fail('INVALID', `Expected ${expected}, computed ${result}`);
  const receipt = tick ? { tick: tick.tick, result, startedAt: tick.startedAt, finishedAt: now(), deltas: tick.deltas, unchangedWorkstreams: tick.unchangedWorkstreams, pendingNudges: state.nudges.filter(item => item.delivery === 'pending').map(item => item.key) } : state.lastReceipt;
  if (tick) append(ctx.dir, rows, [system('tick_finished', { receipt })]);
  const completed = replay(config, rows); writeJson(join(ctx.dir, 'state.json'), completed); render(ctx, config, completed);
  if (releaseLock) unlinkSync(join(ctx.dir, 'tick.lock')); return receipt;
}
function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (command === 'help' || command === '--help') return { help: HELP };
  const ctx = paths(flags);
  if (command === 'init') {
    const config = configFor(flags, ctx.workId); mkdirSync(ctx.parent, { recursive: true });
    try { mkdirSync(ctx.dir); } catch (e) { if (e.code === 'EEXIST') fail('EXISTS', 'Work ID already exists; init never overwrites'); throw e; }
    writeJson(join(ctx.dir, 'config.json'), config); writeFileSync(join(ctx.dir, 'events.jsonl'), '', { flag: 'wx' }); writeJson(join(ctx.dir, 'state.json'), initial(config)); return { workId: ctx.workId, path: ctx.dir };
  }
  const config = readJson(join(ctx.dir, 'config.json'));
  if (command === 'check') {
    const rows = journal(ctx.dir), state = replay(config, rows), saved = readJson(join(ctx.dir, 'state.json'));
    if (stable(state) !== stable(saved)) fail('STATE_LAG', 'State does not match journal; reconcile with the owning token');
    const archiveFile = join(ctx.dir, 'archived.json');
    if (existsSync(archiveFile)) { const archive = readJson(archiveFile); for (const [file, hash] of Object.entries(archive.hashes)) if (createHash('sha256').update(readFileSync(join(archive.path, file))).digest('hex') !== hash) fail('ARCHIVE_CHANGED', `Archive file changed: ${file}`); }
    return { valid: true, journalCursor: state.journalCursor, status: state.status };
  }
  return mutex(ctx.dir, command === 'tick-start' && flags['recover-stale'], () => {
    if (existsSync(join(ctx.dir, 'archived.json'))) fail('ARCHIVED', 'Archived work is immutable; use a new work ID');
    const rows = journal(ctx.dir);
    if (command === 'tick-start') {
      const file = join(ctx.dir, 'tick.lock');
      if (existsSync(file)) {
        const old = readJson(file);
        // A receipt written before a crash is proof that this lock is finished.
        const prior = replay(config, rows);
        if (prior.lastReceipt?.tick === old.tick && !prior.activeTick) unlinkSync(file);
        else {
          if (!flags['recover-stale'] || Date.now() - Date.parse(old.startedAt) < config.staleAfterMinutes * 60000) fail('BUSY', 'Tick already active; explicit stale recovery required after its timeout');
          append(ctx.dir, rows, [system('lock_recovered', { oldTick: old.tick, oldToken: old.token, reason: 'explicit stale recovery' })]); unlinkSync(file);
        }
      }
      const state = replay(config, rows), token = randomUUID(), tick = state.tickSequence + 1, startedAt = now();
      writeFileSync(file, JSON.stringify({ token, tick, startedAt, pid: process.pid, host: hostname() }), { flag: 'wx' });
      append(ctx.dir, rows, [system('tick_started', { tick, timestamp: startedAt })]); writeJson(join(ctx.dir, 'state.json'), replay(config, rows)); return { token, tick, startedAt };
    }
    ownLock(ctx, flags.token);
    if (!replay(config, rows).activeTick && !['reconcile', 'render', 'tick-finish', 'archive'].includes(command)) fail('TICK_FINISHED', 'Receipt is already committed; retry render, tick-finish or archive with this token');
    if (command === 'append-events') {
      const input = readJson(resolve(requireValue(flags.input, '--input'))); if (!Array.isArray(input)) fail('INVALID', 'Input must be a JSON array');
      const known = new Map(rows.flatMap(row => row.events).map(event => [event.id, event])); const fresh = [];
      for (const event of input) { validateEvent(event); if (known.has(event.id)) { if (stable(known.get(event.id)) !== stable(event)) fail('CONFLICT', `Conflicting event ID ${event.id}`); } else { fresh.push(event); known.set(event.id, event); } }
      if (fresh.length) {
        const candidate = replay(config, [...rows, { sequence: rows.length + 1, events: fresh }]);
        if (fresh.some(event => event.kind === 'terminal' && event.transition.status.startsWith('completed')) && unavailableSources(ctx, config, candidate, now()).length) fail('INVALID', 'Missing or stale required inputs prevent completion');
      }
      append(ctx.dir, rows, fresh); return { appended: fresh.length, duplicates: input.length - fresh.length, journalCursor: rows.length };
    }
    if (command === 'reconcile') return reconcile(ctx, config, rows);
    if (command === 'render') { const state = reconcile(ctx, config, rows); return render(ctx, config, state); }
    if (command === 'nudge-ack') {
      const state = replay(config, rows); const nudge = state.nudges.find(item => item.key === flags.key); if (!nudge) fail('INVALID', 'Unknown nudge key');
      const delivery = requireValue(flags.delivery, '--delivery');
      if (nudge.delivery === 'superseded') fail('INVALID', 'Nudge is superseded; do not deliver obsolete requests');
      if (nudge.delivery === 'delivered') { if (nudge.deliveryDescription !== delivery) fail('CONFLICT', 'Nudge delivery already recorded differently'); return nudge; }
      append(ctx.dir, rows, [system('nudge_delivered', { key: flags.key, delivery })]); writeJson(join(ctx.dir, 'state.json'), replay(config, rows)); return { key: flags.key, delivery: 'delivered' };
    }
    if (command === 'tick-finish') return finish(ctx, config, rows, flags.result);
    if (command === 'archive') {
      const state = replay(config, rows); if (!terminalStatuses.has(state.status)) fail('INVALID', 'Only terminal work can be archived');
      const finalPath = join(ctx.dir, 'archive', `terminal-${state.tickSequence}`);
      if (existsSync(finalPath)) {
        // Snapshot publication can succeed before the final seal write. Recover
        // only this receipt's complete, validated snapshot; never overwrite it.
        const manifest = readJson(join(finalPath, 'manifest.json'));
        const required = ['config.json', 'events.jsonl', 'state.json', 'report.md', 'report.html', 'diagrams/milestones.mmd', 'diagrams/workstreams.mmd', 'diagrams/dependencies.mmd', 'inputs.json'];
        if (existsSync(join(finalPath, 'diagrams', 'system.mmd'))) required.push('diagrams/system.mmd');
        if (state.activeTick || state.lastReceipt?.tick !== state.tickSequence || manifest.schemaVersion !== 1 || manifest.workId !== ctx.workId || stable(Object.keys(manifest.hashes || {}).sort()) !== stable(required.sort())) fail('ARCHIVE_CHANGED', 'Existing snapshot does not match this committed receipt');
        for (const file of required) if (createHash('sha256').update(readFileSync(join(finalPath, file))).digest('hex') !== manifest.hashes[file]) fail('ARCHIVE_CHANGED', `Existing snapshot file changed: ${file}`);
        for (const file of ['config.json', 'events.jsonl']) if (!readFileSync(join(finalPath, file)).equals(readFileSync(join(ctx.dir, file)))) fail('ARCHIVE_CHANGED', `Existing snapshot differs from current ${file}`);
        if (stable(readJson(join(finalPath, 'state.json'))) !== stable(state)) fail('ARCHIVE_CHANGED', 'Existing snapshot state differs from journal replay');
        writeJson(join(ctx.dir, 'state.json'), state);
        writeJson(join(ctx.dir, 'archived.json'), { path: finalPath, hashes: manifest.hashes });
        unlinkSync(join(ctx.dir, 'tick.lock'));
        return { path: finalPath, status: state.status, files: required.length };
      }
      // Close the tick before snapshotting, so archived state and views agree.
      finish(ctx, config, rows, undefined, false);
      const temp = `${finalPath}.${randomUUID()}.tmp`;
      mkdirSync(join(temp, 'diagrams'), { recursive: true });
      const files = ['config.json', 'events.jsonl', 'state.json', 'report.md', 'report.html', 'diagrams/milestones.mmd', 'diagrams/workstreams.mmd', 'diagrams/dependencies.mmd'];
      if (existsSync(join(ctx.dir, 'diagrams', 'system.mmd'))) files.push('diagrams/system.mmd');
      for (const file of files) copyFileSync(join(ctx.dir, file), join(temp, file));
      const inputs = [...new Set([...config.sources, ...config.workerReports, ...Object.values(state.workstreams).flatMap(item => item.reportPaths)])];
      const manifest = inputs.map(source => ({ source, copied: false, observation: state.sourceCursors[source] || null }));
      writeJson(join(temp, 'inputs.json'), manifest); files.push('inputs.json');
      const hashes = Object.fromEntries(files.map(file => [file, createHash('sha256').update(readFileSync(join(temp, file))).digest('hex')]));
      writeJson(join(temp, 'manifest.json'), { schemaVersion: 1, workId: ctx.workId, hashes }); renameSync(temp, finalPath);
      writeJson(join(ctx.dir, 'archived.json'), { path: finalPath, hashes }); unlinkSync(join(ctx.dir, 'tick.lock')); return { path: finalPath, status: state.status, files: files.length };
    }
  });
}
try { process.stdout.write(`${JSON.stringify(main())}\n`); }
catch (error) { process.stderr.write(`${JSON.stringify({ code: error.code || 'ERROR', error: error.message })}\n`); process.exitCode = 1; }
