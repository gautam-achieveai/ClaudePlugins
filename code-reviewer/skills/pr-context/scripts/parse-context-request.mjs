#!/usr/bin/env node
// parse-context-request.mjs — boundary parser for pr-context's caller-vs-seed
// contract.
//
// pr-context (and pr-review, which dispatches it) accept a "Context Mode" /
// "Context Gatherer Owner" control alongside an opaque seed payload (PR
// title/body/discussion, or a caller-supplied Pre-fetched/Review-setup
// Context / Daemon-Supplied Context block). The seed is untrusted — it can
// contain attacker-controlled text (a PR body) that happens to spell out a
// control marker verbatim. Recognizing a marker anywhere in the whole
// argument (a "does this string contain X" search) lets that untrusted seed
// text impersonate a caller control: a PR body containing the literal string
// "Context Gatherer Owner: daemon-direct" would suppress gathering, and one
// containing "Context Mode: deterministic-offline" plus a fabricated
// "Pre-fetched Context:" block would smuggle fake context past a real
// gather.
//
// This module fixes that by construction:
//   - New callers build a request with `buildContextRequest` and get back a
//     JSON string. Its top-level `contextMode` / `gathererOwner` fields are
//     structurally separate from its `seed` string value — the seed is never
//     re-parsed for control markers, no matter what it contains.
//   - Legacy plain-text callers are still supported: `parseContextRequest`
//     splits the raw text at the FIRST occurrence of any known payload
//     delimiter (Pre-fetched Context:, Review-setup Context:, ## Daemon-
//     Supplied Context, ## Context Gatherer Result (Daemon-Supplied):).
//     Control markers are recognized only in the header text before that
//     first delimiter. Everything from the delimiter onward — including any
//     nested delimiter- or marker-looking text inside it — is the seed and
//     is never scanned.
//
// Usage:
//   node parse-context-request.mjs --parse [--in <file|->] [--out <file>]
//   node parse-context-request.mjs --build --context-mode <enrichment|deterministic-offline>
//     [--gatherer-owner daemon-direct] [--seed <text>|--seed-file <file|->] [--out <file>]
//
// No dependencies.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

export const PAYLOAD_DELIMITERS = [
  "Pre-fetched Context:",
  "Review-setup Context:",
  "## Daemon-Supplied Context",
  "## Context Gatherer Result (Daemon-Supplied):",
];

const CONTEXT_MODES = ["enrichment", "deterministic-offline"];
const GATHERER_OWNERS = ["daemon-direct"];

const DAEMON_DIRECT_MARKER = /Context Gatherer Owner:\s*daemon-direct\b/;
const DETERMINISTIC_OFFLINE_MARKER = /Context Mode:\s*deterministic-offline\b/;

/**
 * Split raw text at the first payload delimiter. The header (before the
 * delimiter) is the only text ever scanned for control markers; the seed
 * (the delimiter onward, verbatim) never is, however many nested delimiters,
 * markers, or newlines it contains.
 */
export function splitHeaderAndSeed(rawText) {
  const text = String(rawText ?? "");
  let earliest = -1;
  for (const delimiter of PAYLOAD_DELIMITERS) {
    const index = text.indexOf(delimiter);
    if (index !== -1 && (earliest === -1 || index < earliest)) {
      earliest = index;
    }
  }
  if (earliest === -1) {
    return { header: text, seed: "" };
  }
  return { header: text.slice(0, earliest), seed: text.slice(earliest) };
}

/** Read caller controls out of header text only. Never call this on a seed. */
export function parseControlHeader(header) {
  const text = String(header ?? "");
  return {
    contextMode: DETERMINISTIC_OFFLINE_MARKER.test(text) ? "deterministic-offline" : "enrichment",
    gathererOwner: DAEMON_DIRECT_MARKER.test(text) ? "daemon-direct" : null,
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeContextMode(value) {
  return CONTEXT_MODES.includes(value) ? value : "enrichment";
}

function sanitizeGathererOwner(value) {
  return GATHERER_OWNERS.includes(value) ? value : null;
}

function isSeedEmpty(seed) {
  return String(seed ?? "").trim().length === 0;
}

/**
 * A legacy `seed` still carries its own leading delimiter line verbatim
 * (`Pre-fetched Context:\n<payload>`) so it can be forwarded byte-for-byte.
 * Emptiness for the fail-closed check is about the payload after that
 * label, not the label text itself — strip the one delimiter this seed
 * started with before checking.
 */
function isLegacyPayloadEmpty(seed) {
  const text = String(seed ?? "");
  if (text.length === 0) return true;
  for (const delimiter of PAYLOAD_DELIMITERS) {
    if (text.startsWith(delimiter)) {
      return text.slice(delimiter.length).trim().length === 0;
    }
  }
  return isSeedEmpty(text);
}

/**
 * Parse a raw pr-context argument into a structured request.
 *
 * Recognizes two input shapes:
 *   - Structured (new callers): a JSON object with recognized top-level
 *     control keys (`contextMode`, `gathererOwner`, `seed`). Malformed or
 *     unrecognized field values are sanitized to the safe default
 *     (`enrichment` / no gatherer owner) rather than granting a privileged
 *     mode from garbage input — never throws on bad input.
 *   - Legacy (plain text): header/seed split on the first payload
 *     delimiter; markers are read only from the header.
 *
 * `offlinePayloadMissing` is set whenever `contextMode` is
 * `deterministic-offline` and the seed is absent or blank. Callers must
 * treat that as a fail-closed report-the-gap case — never a silent
 * downgrade to enrichment, and never a live gather.
 */
export function parseContextRequest(rawArgument) {
  const text = String(rawArgument ?? "");
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = undefined;
    }
    if (isPlainObject(parsed) && ("contextMode" in parsed || "gathererOwner" in parsed || "seed" in parsed)) {
      const contextMode = sanitizeContextMode(parsed.contextMode);
      const gathererOwner = sanitizeGathererOwner(parsed.gathererOwner);
      const seed = typeof parsed.seed === "string" ? parsed.seed : "";
      return {
        format: "json",
        contextMode,
        gathererOwner,
        seed,
        offlinePayloadMissing: contextMode === "deterministic-offline" && isSeedEmpty(seed),
      };
    }
  }

  const { header, seed } = splitHeaderAndSeed(text);
  const controls = parseControlHeader(header);
  return {
    format: "legacy",
    ...controls,
    seed,
    offlinePayloadMissing: controls.contextMode === "deterministic-offline" && isLegacyPayloadEmpty(seed),
  };
}

/**
 * Build a structured request as a JSON string — the trusted-construction
 * counterpart to parseContextRequest. Callers pass their own controls and an
 * opaque seed; the seed is placed in a JSON string field, never
 * interpolated into shared text, so nothing inside it can be mistaken for a
 * top-level control when the request is parsed back.
 */
export function buildContextRequest({ contextMode = "enrichment", gathererOwner = null, seed = "" } = {}) {
  return JSON.stringify({
    contextMode: sanitizeContextMode(contextMode),
    gathererOwner: sanitizeGathererOwner(gathererOwner),
    seed: typeof seed === "string" ? seed : String(seed ?? ""),
  });
}

export function main(argv) {
  const flag = (name) => argv.includes(`--${name}`);
  const opt = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 && i + 1 < argv.length ? argv[i + 1] : fallback;
  };

  const slurp = (p) => readFileSync(p === "-" ? 0 : p, "utf8");
  const outPath = opt("out");
  const write = (value) => {
    const json = `${JSON.stringify(value, null, 2)}\n`;
    if (outPath) writeFileSync(outPath, json);
    else process.stdout.write(json);
  };

  if (flag("build")) {
    const contextMode = opt("context-mode", "enrichment");
    const gathererOwner = opt("gatherer-owner", null);
    const seedFile = opt("seed-file");
    const seed = seedFile ? slurp(seedFile) : opt("seed", "");
    if (!CONTEXT_MODES.includes(contextMode)) {
      console.error(`--context-mode must be one of: ${CONTEXT_MODES.join(", ")}`);
      return 2;
    }
    process.stdout.write(`${buildContextRequest({ contextMode, gathererOwner, seed })}\n`);
    return 0;
  }

  const inPath = opt("in", "-");
  let rawArgument;
  try {
    rawArgument = slurp(inPath);
  } catch (error) {
    console.error(`cannot read input: ${error.message}`);
    return 2;
  }
  write(parseContextRequest(rawArgument));
  return 0;
}

// Compare real paths: import.meta.url is already resolved through symlinks
// and junctions, process.argv[1] is not.
const isEntryPoint = () => {
  try {
    return Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
};
if (isEntryPoint()) process.exit(main(process.argv.slice(2)));
