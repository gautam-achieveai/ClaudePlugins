import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  realpathSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  captureArtifact, createSnapshotId, readArtifact,
} from "../code-reviewer/skills/pr-review/scripts/review-artifacts.mjs";

const SCRIPT = fileURLToPath(new URL("../code-reviewer/skills/pr-review/scripts/review-artifacts.mjs", import.meta.url));
const CONTEXT = { repository: "org/repo", headCommit: "head-123", mergeBase: "base-456" };
const snapshot = (diff = "+dirty\n") => createSnapshotId(CONTEXT, Buffer.from(diff));
const cli = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
const doc = (relative) => readFileSync(new URL(`../code-reviewer/${relative}`, import.meta.url), "utf8");
// Bind to producer contracts so a rename on either side fails here, not in a live review.
const VERIFIER_VERDICTS = doc("agents/finding-verifier.md").match(/"verdict": "([A-Z_ |]+)"/)[1].split(" | ");
const CONTEXT_DOC = JSON.parse(doc("skills/pr-review/reference/review-modes.md")
  .split("`context.json` carries:")[1].split("```json")[1].split("```")[0]);

function fixture(t, overrides = {}) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "review-artifacts-test-")));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const inputPath = path.join(dir, "native.json");
  const outputPath = path.join(dir, "artifact.json");
  const assignment = {
    schemaVersion: 1, runId: "run-1", snapshotId: snapshot(), stageId: "scan",
    attemptId: "attempt-1", agent: "correctness", format: "json", outputPath,
    ...overrides,
  };
  const write = (value) => writeFileSync(inputPath, JSON.stringify(value));
  const capture = (value) => {
    write(value);
    return captureArtifact({ assignment, inputPath });
  };
  return { dir, inputPath, outputPath, assignment, write, capture };
}

test("snapshot keys are the ones the documented context.json producer writes", () => {
  for (const field of ["repository", "headCommit", "mergeBase"]) {
    assert.ok(Object.hasOwn(CONTEXT_DOC, field), `review-modes.md context.json lacks ${field}`);
  }
  assert.match(createSnapshotId(CONTEXT_DOC, Buffer.from("+dirty\n")), /^sha256:[a-f0-9]{64}$/);
});

test("snapshot binds exact diff bytes and repository/headCommit/mergeBase, including dirty work at the same HEAD", () => {
  const original = snapshot();
  assert.match(original, /^sha256:[a-f0-9]{64}$/);
  assert.equal(snapshot(), original);
  for (const diff of ["+other dirty\n", "+dirty\r\n", "+dirty", ""]) {
    assert.notEqual(snapshot(diff), original);
  }
  for (const field of ["repository", "headCommit", "mergeBase"]) {
    assert.notEqual(createSnapshotId({ ...CONTEXT, [field]: "different" }, Buffer.from("+dirty\n")), original);
    assert.throws(() => createSnapshotId({ ...CONTEXT, [field]: "" }, Buffer.alloc(0)), new RegExp(field));
  }
  assert.notEqual(createSnapshotId(CONTEXT, Buffer.from([0xff])), createSnapshotId(CONTEXT, Buffer.from([0xfe])));
  assert.throws(() => createSnapshotId(CONTEXT, "+dirty\n"), /must be bytes/);
  assert.throws(() => createSnapshotId({ repository: "repo", head: "head", base: "base" }, Buffer.alloc(0)), /headCommit/);
});

test("explicit scanner clean result round-trips without modifying native bytes or assignment", (t) => {
  const f = fixture(t, { resultKind: "scanner" });
  const native = { findings: [], questions: [], coverageNote: "Checked changed code and callers." };
  const source = `  ${JSON.stringify(native)}\r\n`;
  writeFileSync(f.inputPath, source);
  const originalAssignment = structuredClone(f.assignment);
  const artifact = captureArtifact({ assignment: Object.freeze(f.assignment), inputPath: f.inputPath });
  assert.deepEqual(artifact.result, native);
  assert.equal(artifact.status, "complete");
  assert.equal(artifact.schemaVersion, 1);
  assert.deepEqual(readArtifact({ assignment: f.assignment }), artifact);
  assert.equal(readFileSync(f.inputPath, "utf8"), source);
  assert.deepEqual(f.assignment, originalAssignment);
});

test("scanner missing findings or coverageNote never becomes a clean result", (t) => {
  const f = fixture(t, { resultKind: "scanner" });
  for (const result of [
    {}, { coverageNote: "checked" }, { findings: null, coverageNote: "checked" },
    { findings: {} }, { findings: [] }, { findings: [], coverageNote: " " }, [],
  ]) {
    assert.throws(() => f.capture(result), /findings|coverageNote|must be an object/);
    assert.equal(existsSync(f.outputPath), false);
  }
});

test("verification accepts only native verdicts and retains corrections and provenance", (t) => {
  const f = fixture(t, { resultKind: "verification" });
  assert.deepEqual(VERIFIER_VERDICTS, ["TRUE_POSITIVE", "FALSE_POSITIVE", "UNPROVEN"]);
  for (const verdict of VERIFIER_VERDICTS) {
    const assignment = { ...f.assignment, outputPath: path.join(f.dir, `${verdict}.json`) };
    const native = {
      verdict, lens: "REACHABILITY", citedEvidence: ["src/Foo.cs:42 - traced caller to guard"],
      reasoning: "Traced the candidate trigger and the existing guard.",
      falsePositiveReason: verdict === "FALSE_POSITIVE" ? "already-guarded" : null,
      correctedFinding: { line: 42, issue: "Corrected claim", severity: "LOW" },
      candidateSources: [{ agent: "scanner", evidence: ["call-site:42"], custom: { detail: true } }],
      disconfirmation: "Checked guarded caller", unknownFutureField: [1, null, false],
    };
    f.write(native);
    const artifact = captureArtifact({ assignment, inputPath: f.inputPath });
    assert.deepEqual(readArtifact({ assignment }).result, native);
    assert.deepEqual(artifact.result, native);
  }
  for (const verdict of [undefined, null, "", "true_positive", "PASS", "LIKELY", "CONFIRMED", "REFUTED", "UNCERTAIN"]) {
    assert.throws(() => f.capture({ verdict }), /verification verdict/);
  }
});

test("generic JSON retains native objects, arrays, and scalar values without new required fields", (t) => {
  const f = fixture(t);
  for (const [index, native] of [{ daemonOutput: { untouched: true } }, [], null, 0, false, "plain"].entries()) {
    const assignment = { ...f.assignment, outputPath: path.join(f.dir, `${index}.json`) };
    f.write(native);
    captureArtifact({ assignment, inputPath: f.inputPath });
    assert.deepEqual(readArtifact({ assignment }).result, native);
  }
});

test("native identity fields are optional, but stale identities fail closed", (t) => {
  const f = fixture(t);
  for (const field of ["runId", "snapshotId", "stageId", "attemptId", "agent"]) {
    assert.throws(() => f.capture({ [field]: "stale", payload: [] }), new RegExp(`native result ${field}`));
    assert.equal(existsSync(f.outputPath), false);
  }
  const native = Object.fromEntries(["runId", "snapshotId", "stageId", "attemptId", "agent"].map((key) => [key, f.assignment[key]]));
  assert.deepEqual(f.capture(native).result, native);
});

test("accounted stages preserve every candidate exactly once across all supported outcomes", (t) => {
  const outcomes = ["retained", "refuted", "unresolved", "merged", "pre-existing", "capped", "out-of-scope"];
  const ids = outcomes.map((_, i) => `candidate-${i}`);
  const f = fixture(t, { resultKind: "accounted", expectedCandidateIds: ids });
  const native = {
    dispositions: outcomes.map((outcome, i) => ({
      candidateId: ids[i], outcome, ...(outcome === "merged" ? { targetId: ids[0] } : {}),
    })),
    findings: [{ id: ids[0], candidateSources: ids, correctedLine: 12 }],
  };
  f.capture(native);
  assert.deepEqual(readArtifact({ assignment: f.assignment }).result, native);
});

test("accounting rejects lost, repeated, unknown candidates and merged results without a target", (t) => {
  const f = fixture(t, { resultKind: "accounted", expectedCandidateIds: ["a", "b"] });
  const retained = { candidateId: "a", outcome: "retained" };
  const refuted = { candidateId: "b", outcome: "refuted" };
  for (const [dispositions, error] of [
    [[retained], /missing candidateIds: b/],
    [[retained, retained, refuted], /unknown or duplicate/],
    [[retained, refuted, { candidateId: "c", outcome: "capped" }], /unknown or duplicate/],
    [[retained, { candidateId: "b", outcome: "discarded" }], /outcome is invalid/],
    [[retained, { candidateId: "b", outcome: "merged" }], /requires targetId/],
    [[retained, { candidateId: "b", outcome: "merged", targetId: " " }], /requires targetId/],
    [[null], /unknown or duplicate/],
  ]) {
    assert.throws(() => f.capture({ dispositions }), error);
    assert.equal(existsSync(f.outputPath), false);
  }
  assert.throws(() => f.capture({}), /dispositions must be an array/);
  f.assignment.expectedCandidateIds = [];
  assert.deepEqual(f.capture({ dispositions: [] }).result, { dispositions: [] });
});

test("invalid assignments and incompatible Markdown accounting are rejected", (t) => {
  const f = fixture(t);
  f.write({});
  for (const changes of [
    { schemaVersion: 2 }, { runId: "" }, { snapshotId: "HEAD" }, { stageId: 3 },
    { attemptId: null }, { agent: " " }, { format: "text" }, { resultKind: "other" }, { resultKind: null },
    { outputPath: "relative.json" }, { outputPath: path.join(f.dir, "absent", "artifact.json") },
    { resultKind: "accounted" }, { expectedCandidateIds: ["a", "a"] },
    { expectedCandidateIds: [null] }, { expectedCandidateIds: "a" },
    { format: "markdown", resultKind: "scanner" }, { format: "markdown", expectedCandidateIds: [] },
  ]) {
    assert.throws(() => captureArtifact({ assignment: { ...f.assignment, ...changes }, inputPath: f.inputPath }));
  }
  assert.equal(existsSync(f.outputPath), false);
  assert.throws(() => captureArtifact({ assignment: null, inputPath: f.inputPath, outputPath: f.outputPath }), /schemaVersion/);
});

test("read rejects stale assignments, including dirty snapshot changes without a new HEAD", (t) => {
  const f = fixture(t);
  f.capture({ payload: "settled" });
  for (const [field, value] of Object.entries({
    runId: "another-run", snapshotId: snapshot("+new dirty content\n"), stageId: "another-stage",
    attemptId: "another-attempt", agent: "another-agent", format: "markdown",
    resultKind: "scanner", expectedCandidateIds: [],
  })) {
    assert.throws(() => readArtifact({ assignment: { ...f.assignment, [field]: value } }), new RegExp(field));
  }
  assert.throws(() => readArtifact({
    assignment: { ...f.assignment, outputPath: path.join(f.dir, "elsewhere.json") }, inputPath: f.outputPath,
  }), /input does not match/);
});

test("partial JSON and corrupted artifacts fail closed; valid hash does not bypass status or kind validation", (t) => {
  const f = fixture(t, { resultKind: "scanner" });
  for (const text of ["", '{"findings":[', "```json\n{}\n```", "{}", "null"]) {
    writeFileSync(f.inputPath, text);
    assert.throws(() => captureArtifact({ assignment: f.assignment, inputPath: f.inputPath }));
    assert.equal(existsSync(f.outputPath), false);
  }
  writeFileSync(f.inputPath, Buffer.from([0xff]));
  assert.throws(() => captureArtifact({ assignment: f.assignment, inputPath: f.inputPath }), /encoded data/);
  const artifact = f.capture({ findings: [], coverageNote: "checked" });
  for (const text of [
    "", '{"schemaVersion":1', "null", JSON.stringify({ ...artifact, result: { findings: ["tampered"] } }),
    JSON.stringify({ ...artifact, stageId: "tampered" }), JSON.stringify({ ...artifact, contentHash: null }),
  ]) {
    writeFileSync(f.outputPath, text);
    assert.throws(() => readArtifact({ assignment: f.assignment }), /valid JSON|must be an object|contentHash/);
  }
  for (const changes of [{ status: "running" }, { result: {} }]) {
    const { contentHash, ...content } = { ...artifact, ...changes };
    writeFileSync(f.outputPath, JSON.stringify({
      ...content, contentHash: `sha256:${createHash("sha256").update(JSON.stringify(content)).digest("hex")}`,
    }));
    assert.throws(() => readArtifact({ assignment: f.assignment }), /not complete|findings/);
  }
});

test("immutable publication refuses existing or partial files and cleans temporary files", (t) => {
  const f = fixture(t);
  const artifact = f.capture({ result: "original" });
  const before = readFileSync(f.outputPath);
  assert.throws(() => f.capture({ result: "replacement" }), /EEXIST/);
  assert.deepEqual(readFileSync(f.outputPath), before);
  assert.deepEqual(readArtifact({ assignment: f.assignment }), artifact);
  writeFileSync(f.outputPath, "partial preexisting artifact");
  assert.throws(() => f.capture({ result: "replacement" }), /EEXIST/);
  assert.equal(readFileSync(f.outputPath, "utf8"), "partial preexisting artifact");
  assert.deepEqual(readdirSync(f.dir).sort(), ["artifact.json", "native.json"]);
});

test("output cannot replace native source, hard-linked source, or a different assignment destination", (t) => {
  const f = fixture(t);
  f.write({ retained: "source" });
  const before = readFileSync(f.inputPath);
  assert.throws(() => captureArtifact({
    assignment: { ...f.assignment, outputPath: f.inputPath }, inputPath: f.inputPath,
  }), /different files/);
  linkSync(f.inputPath, f.outputPath);
  assert.throws(() => captureArtifact({ assignment: f.assignment, inputPath: f.inputPath }), /EEXIST/);
  assert.deepEqual(readFileSync(f.inputPath), before);
  assert.throws(() => captureArtifact({
    assignment: f.assignment, inputPath: f.inputPath, outputPath: path.join(f.dir, "wrong.json"),
  }), /does not match assignment/);
  assert.equal(existsSync(path.join(f.dir, "wrong.json")), false);
});

test("artifact paths resolve a real parent, including junction aliases", (t) => {
  const f = fixture(t);
  const real = path.join(f.dir, "real");
  const alias = path.join(f.dir, "alias");
  mkdirSync(real);
  symlinkSync(real, alias, process.platform === "win32" ? "junction" : "dir");
  f.assignment.outputPath = path.join(alias, "artifact.json");
  const artifact = f.capture({ retained: true });
  assert.equal(artifact.outputPath, path.join(real, "artifact.json"));
  assert.deepEqual(readArtifact({ assignment: f.assignment }), artifact);
  assert.throws(() => captureArtifact({
    assignment: { ...f.assignment, outputPath: path.join(real, "directory-input.json") }, inputPath: real,
  }), /regular file/);
});

test("Markdown is explicit and exact, including BOM and line endings; empty text is rejected, not guessed", (t) => {
  const f = fixture(t, { format: "markdown" });
  for (const text of ["", " \r\n\t"]) {
    writeFileSync(f.inputPath, text);
    assert.throws(() => captureArtifact({ assignment: f.assignment, inputPath: f.inputPath }), /nonempty/);
  }
  const native = "\uFEFF# Native review\r\n\r\n```json\r\n{\"not\":\"extracted\"}\r\n```\r\n";
  writeFileSync(f.inputPath, native);
  captureArtifact({ assignment: f.assignment, inputPath: f.inputPath });
  assert.equal(readArtifact({ assignment: f.assignment }).result, native);
  assert.equal(readFileSync(f.inputPath, "utf8"), native);
});

test("read requires the same candidate accounting contract and rejects removed expected IDs", (t) => {
  const f = fixture(t, { expectedCandidateIds: ["a"] });
  f.capture({ dispositions: [{ candidateId: "a", outcome: "unresolved" }] });
  assert.throws(() => readArtifact({ assignment: { ...f.assignment, expectedCandidateIds: ["b"] } }), /expectedCandidateIds/);
  const { expectedCandidateIds, ...withoutAccounting } = f.assignment;
  assert.throws(() => readArtifact({ assignment: withoutAccounting }), /expectedCandidateIds/);
});

test("CLI snapshot, capture receipt, and read expose the persisted contract end to end", (t) => {
  const f = fixture(t, { resultKind: "scanner" });
  writeFileSync(path.join(f.dir, "diff.patch"), Buffer.from("+dirty\n"));
  const contextPath = path.join(f.dir, "context.json");
  writeFileSync(contextPath, JSON.stringify({ ...CONTEXT, diffPath: "diff.patch" }));
  const computed = cli("snapshot", "--context", contextPath);
  assert.equal(computed.status, 0, computed.stderr);
  assert.equal(computed.stdout.trim(), f.assignment.snapshotId);
  const assignmentPath = path.join(f.dir, "assignment.json");
  writeFileSync(assignmentPath, JSON.stringify(f.assignment));
  f.write({ findings: [], coverageNote: "checked" });
  const captured = cli("capture", "--assignment", assignmentPath, "--input", f.inputPath, "--out", f.outputPath);
  assert.equal(captured.status, 0, captured.stderr);
  const artifact = readArtifact({ assignment: f.assignment });
  assert.deepEqual(JSON.parse(captured.stdout), { outputPath: artifact.outputPath, contentHash: artifact.contentHash });
  const read = cli("read", "--assignment", assignmentPath, "--input", f.outputPath);
  assert.equal(read.status, 0, read.stderr);
  assert.deepEqual(JSON.parse(read.stdout), artifact);
  const collision = cli("capture", "--assignment", assignmentPath, "--input", f.inputPath, "--out", f.outputPath);
  assert.equal(collision.status, 2);
  assert.match(collision.stderr, /EEXIST/);
  assert.equal(collision.stdout, "");
});

test("CLI invalid usage and malformed input report explicit stderr with no success output", (t) => {
  const f = fixture(t);
  writeFileSync(f.inputPath, "{");
  for (const args of [
    [], ["unknown"], ["capture"], ["snapshot", "--context"],
    ["snapshot", "--context", f.inputPath], ["read", "--bogus", "x"],
    ["snapshot", "--context", f.inputPath, "--context", f.inputPath],
    ["read", "--assignment", f.inputPath, "--input", f.outputPath],
  ]) {
    const result = cli(...args);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /review-artifacts: /);
    assert.equal(result.stdout, "");
  }
});

test("simultaneous CLI captures publish exactly one complete artifact without clobbering", async (t) => {
  const f = fixture(t);
  const assignmentPath = path.join(f.dir, "assignment.json");
  writeFileSync(assignmentPath, JSON.stringify(f.assignment));
  f.write({ identity: "first" });
  const secondInput = path.join(f.dir, "second.json");
  writeFileSync(secondInput, JSON.stringify({ identity: "second" }));
  const start = (inputPath) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, "capture", "--assignment", assignmentPath, "--input", inputPath, "--out", f.outputPath]);
    let stderr = "";
    child.stdout.resume();
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stderr }));
  });
  const results = await Promise.all([start(f.inputPath), start(secondInput)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [0, 2]);
  assert.match(results.find((r) => r.status === 2).stderr, /EEXIST/);
  assert.ok(["first", "second"].includes(readArtifact({ assignment: f.assignment }).result.identity));
  assert.equal(readdirSync(f.dir).some((name) => name.endsWith(".tmp")), false);
});
