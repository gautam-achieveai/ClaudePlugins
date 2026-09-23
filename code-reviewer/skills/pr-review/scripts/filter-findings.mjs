#!/usr/bin/env node
// filter-findings.mjs — mechanical pre-verification filter for review findings.
//
// Anchors every finding to the diff, merges duplicates across agents, and caps
// per-agent output. Runs before the verification pass so that no model time is
// spent on findings about code this PR never touched.
//
// Usage:
//   node filter-findings.mjs --diff <file|-> --findings <file|-> [options]
//
//   --diff <path>          unified diff; "-" reads stdin
//   --findings <path>      JSON: an array of agent envelopes, a single
//                          envelope, or a bare array of finding records
//   --tolerance <n>        lines of slack when matching a cited line to a
//                          changed line (default 2); a near-but-inexact match
//                          is kept and flagged anchorMatch="NEAR"
//   --max-per-agent <n>    cap per agent after merging (default 5)
//   --out <path>           write result JSON here (default stdout)
//
// Exit codes: 0 ok, 2 bad usage or unusable input (a diff with no files, or
// findings that are not envelopes/records). Unusable input never exits 0:
// anything this filter cannot anchor becomes PRE_EXISTING, which never blocks.

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parseGitDiff } from "./diff-parse.mjs";

export const DEFAULT_TOLERANCE = 2;
export const DEFAULT_MAX_PER_AGENT = 5;

// ---------------------------------------------------------------- diff parse

export const normalizePath = (p) =>
  String(p || "").trim().replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();

/**
 * Map post-image changed lines per file.
 * Returns Map<normalizedPath, {added:Set<number>, removedNear:Set<number>, deleted:boolean}>.
 * `removedNear` holds post-image positions where lines were deleted, so a
 * finding about a deletion still anchors to the diff. A deleted file is keyed
 * by its old path, so findings about the removal still anchor.
 */
export function parseDiff(text) {
  const files = new Map();
  for (const entry of parseGitDiff(text).files) {
    files.set(normalizePath(entry.path), {
      added: entry.added,
      removedNear: entry.removedNear,
      deleted: entry.status === "deleted",
    });
  }
  return files;
}

/**
 * Match a cited path against diff paths; tolerates suffix-only citations.
 * The reverse match (cited path ends with a diff path) is only for absolute
 * citations — otherwise `sandbox/README.md` would anchor to a changed root `README.md`.
 */
export function lookupFile(files, cited) {
  const c = normalizePath(cited);
  if (!c) return null;
  if (files.has(c)) return files.get(c);
  const absolute = /^([a-z]:)?\//.test(c);
  for (const [p, v] of files) {
    if (p.endsWith("/" + c) || (absolute && c.endsWith("/" + p))) return v;
  }
  return null;
}

/**
 * Does this citation land on the diff?
 * Returns null for no, "EXACT" for a cited line that is itself changed, or
 * "NEAR" for one within the slack window. NEAR citations are kept but flagged:
 * an unchanged line one or two rows from a changed one is exactly how a
 * pre-existing issue sneaks in, so the verifier re-checks the anchor.
 */
export function touchesDiff(entry, line, slack) {
  if (!entry) return null;
  if (line === null || line === undefined) return "NEAR"; // file-level finding on a changed file
  if (entry.deleted) return "NEAR"; // every line of a deleted file changed; the verifier checks the claim
  const n = Number(line);
  if (!Number.isFinite(n)) return "NEAR";
  if (entry.added.has(n) || entry.removedNear.has(n)) return "EXACT";
  for (let d = -slack; d <= slack; d += 1) {
    if (entry.added.has(n + d) || entry.removedNear.has(n + d)) return "NEAR";
  }
  return null;
}

/** "path/file.cs:42", "path/file.cs:42 <any separator> why", or "path/file.cs#L42" -> {file, line} */
export function parseRef(ref) {
  const text = String(ref || "").trim();
  const m = /^(.*?)(?::|#L)(\d+)(?:-\d+)?(?!\d)/.exec(text);
  if (!m) return { file: text.split(/\s/)[0], line: null };
  return { file: m[1], line: Number.parseInt(m[2], 10) };
}

// ------------------------------------------------------------ findings input

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Accepts an array of envelopes, one envelope, or a bare array of findings.
 * Also counts inputs that fit none of those shapes, so a malformed envelope is
 * reported instead of silently disappearing.
 */
export function inspectFindings(parsed) {
  const envelopes = Array.isArray(parsed) ? parsed : [parsed];
  const findings = [];
  let rejected = 0;
  for (const env of envelopes) {
    if (isRecord(env) && Array.isArray(env.findings)) {
      const agent = env.agent || "unknown";
      for (const f of env.findings) {
        if (isRecord(f)) findings.push({ ...f, agent: f.agent || agent });
        else rejected += 1;
      }
    } else if (isRecord(env) && (env.issue || env.file)) {
      findings.push({ ...env, agent: env.agent || "unknown" });
    } else {
      rejected += 1;
    }
  }
  return { findings, rejected };
}

export const loadFindings = (parsed) => inspectFindings(parsed).findings;

// ------------------------------------------------------------------ dedupe

const STOP = new Set(["the", "a", "an", "is", "are", "to", "of", "in", "on", "and", "or", "for", "this", "that", "it", "be", "not", "with", "when", "if"]);

export const tokens = (s) =>
  new Set(
    String(s || "")
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((t) => t.length > 2 && !STOP.has(t))
  );

export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

const SEV_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
export const sevRank = (s) => SEV_RANK[String(s || "").toUpperCase()] || 0;
const filled = (f) => Object.values(f).filter((v) => v !== null && v !== undefined && v !== "").length;

/** Merge findings that describe the same defect at the same place. */
export function dedupe(findings, tolerance = DEFAULT_TOLERANCE) {
  const kept = [];
  const merges = [];

  for (const f of findings) {
    const fTok = tokens(`${f.issue} ${f.underlyingProblem}`);
    const fFile = normalizePath(f.file);
    let target = null;

    for (const k of kept) {
      if (normalizePath(k.file) !== fFile) continue;
      const near =
        k.line === null || f.line === null || k.line === undefined || f.line === undefined
          ? true
          : Math.abs(Number(k.line) - Number(f.line)) <= tolerance;
      if (!near) continue;
      if (jaccard(tokens(`${k.issue} ${k.underlyingProblem}`), fTok) >= 0.5) { target = k; break; }
    }

    if (!target) { kept.push({ ...f, mergedFrom: [] }); continue; }

    // Keep the richer record; fold the other one's agent and instances in.
    const winner = filled(f) > filled(target) ? { ...f, mergedFrom: target.mergedFrom } : target;
    const loser = winner === target ? f : target;
    if (winner !== target) kept[kept.indexOf(target)] = winner;

    winner.severity = sevRank(winner.severity) >= sevRank(loser.severity) ? winner.severity : loser.severity;
    winner.instances = [...new Set([...(winner.instances || []), ...(loser.instances || [])])];
    winner.mergedFrom = [...new Set([...(winner.mergedFrom || []), loser.agent].filter(Boolean))];
    merges.push({ agent: loser.agent, file: loser.file, line: loser.line ?? null, intoAgent: winner.agent });
  }
  return { kept, merges };
}

// ------------------------------------------------------------------ anchor

/** Split findings into diff-anchored and pre-existing. */
export function anchorFindings(all, files, tolerance = DEFAULT_TOLERANCE) {
  const anchored = [];
  const preExisting = [];

  for (const f of all) {
    const entry = lookupFile(files, f.file);
    const direct = entry ? touchesDiff(entry, f.line, tolerance) : null;
    if (direct) {
      anchored.push({ ...f, diffAnchor: "IN_DIFF", anchorMatch: direct });
      continue;
    }

    const via = f.enablingChange ? parseRef(f.enablingChange) : null;
    const viaEntry = via ? lookupFile(files, via.file) : null;
    const viaMatch = viaEntry ? touchesDiff(viaEntry, via.line, tolerance) : null;
    if (viaMatch) {
      anchored.push({ ...f, diffAnchor: "ENABLED_BY_DIFF", anchorMatch: viaMatch });
      continue;
    }

    preExisting.push({
      ...f,
      diffAnchor: "PRE_EXISTING",
      anchorMatch: null,
      filterReason: entry
        ? "cited line is unchanged context and no valid enablingChange"
        : "cited file not in diff and no valid enablingChange",
    });
  }
  return { anchored, preExisting };
}

// -------------------------------------------------------------------- run

export function runFilter({ diffText, findings, tolerance = DEFAULT_TOLERANCE, maxPerAgent = DEFAULT_MAX_PER_AGENT }) {
  const files = parseDiff(diffText);
  const { findings: all, rejected } = inspectFindings(findings);
  const { anchored, preExisting } = anchorFindings(all, files, tolerance);
  const { kept, merges } = dedupe(anchored, tolerance);

  const byAgent = new Map();
  for (const f of kept) {
    const a = f.agent || "unknown";
    if (!byAgent.has(a)) byAgent.set(a, []);
    byAgent.get(a).push(f);
  }

  const capped = [];
  const dropped = [];
  let cappedCount = 0;
  for (const [agent, list] of byAgent) {
    list.sort((x, y) => sevRank(y.severity) - sevRank(x.severity));
    capped.push(...list.slice(0, maxPerAgent));
    const over = list.slice(maxPerAgent);
    cappedCount += over.length;
    for (const f of over) dropped.push({ ...f, filterReason: `over per-agent cap of ${maxPerAgent}`, agent });
  }

  return {
    stats: {
      received: all.length,
      rejectedInputs: rejected,
      anchored: anchored.length,
      preExisting: preExisting.length,
      mergedDuplicates: merges.length,
      cappedOff: cappedCount,
      toVerify: capped.length,
      filesInDiff: files.size,
      tolerance,
      maxPerAgent,
    },
    toVerify: capped,
    preExisting,
    dropped,
    merges,
  };
}

// -------------------------------------------------------------------- cli

export function main(argv) {
  const opt = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 && i + 1 < argv.length ? argv[i + 1] : fallback;
  };

  const diffPath = opt("diff");
  const findingsPath = opt("findings");
  const tolerance = Number.parseInt(opt("tolerance", String(DEFAULT_TOLERANCE)), 10);
  const maxPerAgent = Number.parseInt(opt("max-per-agent", String(DEFAULT_MAX_PER_AGENT)), 10);
  const outPath = opt("out");

  if (!diffPath || !findingsPath) {
    console.error("usage: filter-findings.mjs --diff <file|-> --findings <file|-> [--tolerance n] [--max-per-agent n] [--out file]");
    return 2;
  }
  if (!Number.isInteger(tolerance) || tolerance < 0) {
    console.error("--tolerance must be a non-negative integer");
    return 2;
  }
  if (!Number.isInteger(maxPerAgent) || maxPerAgent < 1) {
    console.error("--max-per-agent must be a positive integer");
    return 2;
  }

  if (diffPath === "-" && findingsPath === "-") {
    console.error("--diff and --findings cannot both read stdin");
    return 2;
  }

  const slurp = (p, label) => {
    try {
      return readFileSync(p === "-" ? 0 : p, "utf8");
    } catch (e) {
      throw new Error(`cannot read ${label} input: ${e.message}`);
    }
  };

  let diffText;
  let findings;
  try {
    diffText = slurp(diffPath, "diff");
    const findingsText = slurp(findingsPath, "findings");
    try {
      findings = JSON.parse(findingsText);
    } catch (e) {
      throw new Error(`findings input is not valid JSON: ${e.message}`);
    }
  } catch (e) {
    console.error(e.message);
    return 2;
  }

  const result = runFilter({ diffText, findings, tolerance, maxPerAgent });
  if (result.stats.filesInDiff === 0) {
    console.error("diff input contains no files; refusing to mark every finding pre-existing");
    return 2;
  }
  if (result.stats.rejectedInputs > 0) {
    console.error(`findings input has ${result.stats.rejectedInputs} entries that are not agent envelopes or finding records`);
    return 2;
  }
  const json = JSON.stringify(result, null, 2);
  if (outPath) writeFileSync(outPath, json);
  else process.stdout.write(json + "\n");
  return 0;
}

// Compare real paths: import.meta.url is already resolved through symlinks and
// junctions, process.argv[1] is not.
const isEntryPoint = () => {
  try {
    return Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
};
const invokedDirectly = isEntryPoint();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
