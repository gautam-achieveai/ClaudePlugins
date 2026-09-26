#!/usr/bin/env node
// Keep caller controls separate from untrusted PR text, including in legacy requests.
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PAYLOAD_DELIMITERS = [
  "Pre-fetched Context:",
  "Review-setup Context:",
  "## Daemon-Supplied Context",
  "## Context Gatherer Result (Daemon-Supplied):",
];

export function splitHeaderAndSeed(text) {
  const boundary = /^(?:Pre-fetched Context:|Review-setup Context:|## Daemon-Supplied Context|## Context Gatherer Result \(Daemon-Supplied\):)[ \t]*\r?$/gm.exec(text)?.index ?? text.length;
  return { header: text.slice(0, boundary), seed: text.slice(boundary) };
}

function validateRequest({ header = "", seed = "", contextMode = "enrichment", gathererOwner = null }) {
  if (typeof header !== "string" || typeof seed !== "string") {
    throw new TypeError("header and seed must be strings");
  }
  if (!["enrichment", "deterministic-offline"].includes(contextMode)) {
    throw new Error("contextMode must be enrichment or deterministic-offline");
  }
  if (gathererOwner !== null && gathererOwner !== "daemon-direct") {
    throw new Error("gathererOwner must be null or daemon-direct");
  }
  if (gathererOwner === "daemon-direct" && contextMode === "deterministic-offline") {
    throw new Error("daemon-direct ownership cannot be combined with deterministic-offline");
  }
  if (splitHeaderAndSeed(header).seed) {
    throw new Error("payload delimiters belong in seed, not header");
  }
  const delimiter = PAYLOAD_DELIMITERS.find((item) => seed.startsWith(item));
  const payload = delimiter ? seed.slice(delimiter.length) : seed;
  return {
    header,
    seed,
    contextMode,
    gathererOwner,
    offlinePayloadMissing: contextMode === "deterministic-offline" && !payload.trim(),
  };
}

export function buildContextRequest(request = {}) {
  const { offlinePayloadMissing, ...fields } = validateRequest(request);
  return JSON.stringify(fields);
}

export function parseContextRequest(text) {
  if (typeof text !== "string") throw new TypeError("context request must be text");
  if (text.trimStart().startsWith("{")) {
    const request = JSON.parse(text);
    return validateRequest(request);
  }

  const { header, seed } = splitHeaderAndSeed(text);
  const control = (label, fallback) => {
    const matches = [...header.matchAll(new RegExp(`^${label}:[ \\t]*(.*)$`, "gm"))];
    if (matches.length > 1) throw new Error(`duplicate ${label} control`);
    return matches.length ? matches[0][1].trim() : fallback;
  };
  return validateRequest({
    header,
    seed,
    contextMode: control("Context Mode", "enrichment"),
    gathererOwner: control("Context Gatherer Owner", null),
  });
}

export function main(args) {
  try {
    const options = new Map();
    for (let index = 0; index < args.length; index += 2) {
      const name = args[index];
      if (!["--in", "--out"].includes(name) || !args[index + 1] || options.has(name)) {
        throw new Error("usage: parse-context-request.mjs --in <file|-> [--out <file>]");
      }
      options.set(name, args[index + 1]);
    }
    if (!options.has("--in")) throw new Error("--in is required");
    const input = options.get("--in");
    const result = parseContextRequest(readFileSync(input === "-" ? 0 : input, "utf8"));
    if (result.offlinePayloadMissing) {
      throw new Error("deterministic-offline requires a non-empty context payload; no live fallback");
    }
    const output = `${JSON.stringify(result, null, 2)}\n`;
    if (options.has("--out")) writeFileSync(options.get("--out"), output, "utf8");
    else process.stdout.write(output);
    return 0;
  } catch (error) {
    console.error(`cannot parse context request: ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && realpathSync(path.resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
