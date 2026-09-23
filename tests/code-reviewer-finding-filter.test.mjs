import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const FILTER = fileURLToPath(new URL("../code-reviewer/skills/pr-review/scripts/filter-findings.mjs", import.meta.url));

import {
  anchorFindings,
  dedupe,
  loadFindings,
  parseDiff,
  parseRef,
  runFilter,
  touchesDiff,
} from "../code-reviewer/skills/pr-review/scripts/filter-findings.mjs";

const DIFF = [
  "diff --git a/src/Foo.cs b/src/Foo.cs",
  "--- a/src/Foo.cs",
  "+++ b/src/Foo.cs",
  "@@ -10,6 +10,9 @@ public class Foo",
  "     public void Existing()",
  "     {",
  "         var x = 1;",
  "+        var idx = input.Length;",
  "+        return items[idx];",
  "+        // added line 15",
  "     }",
  "     public void Other()",
  "     {",
].join("\n");

const envelope = (agent, findings) => ({ agent, findings, questions: [], omittedSimilarCount: 0 });

test("parseDiff records post-image line numbers of added lines", () => {
  const files = parseDiff(DIFF);
  assert.equal(files.size, 1);
  const foo = files.get("src/foo.cs");
  assert.deepEqual([...foo.added].sort((a, b) => a - b), [13, 14, 15]);
});

test("a finding about a deleted file anchors instead of becoming pre-existing", () => {
  const files = parseDiff("--- a/gone.cs\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-old\n-older\n");
  assert.equal(files.get("gone.cs").deleted, true);

  const { anchored, preExisting } = anchorFindings([
    { agent: "a", file: "gone.cs", line: 2, issue: "callers still use this" },
    { agent: "a", file: "docs/guide.md", line: 40, enablingChange: "gone.cs:1 — file deleted", issue: "dangling link" },
  ], files);
  assert.equal(preExisting.length, 0);
  assert.deepEqual(anchored.map((f) => f.diffAnchor), ["IN_DIFF", "ENABLED_BY_DIFF"]);
});

// A real `git diff`, not a hand-shaped fixture: removed YAML frontmatter, an
// added line whose content starts with "++", a deleted file, a rename, a path
// with " b/" inside it, and a git-quoted non-ASCII path.
const REAL_DIFF = [
  "diff --git a/skills/x/SKILL.md b/skills/x/SKILL.md",
  "index 1111111..2222222 100644",
  "--- a/skills/x/SKILL.md",
  "+++ b/skills/x/SKILL.md",
  "@@ -1,4 +1,4 @@",
  "----",
  "+---",
  " name: x",
  "----",
  "+++ counter",
  " body",
  "diff --git a/old.cs b/old.cs",
  "deleted file mode 100644",
  "--- a/old.cs",
  "+++ /dev/null",
  "@@ -1,2 +0,0 @@",
  "-class Old {}",
  "--- tail",
  "diff --git a/src/A.cs b/src/B.cs",
  "similarity index 90%",
  "rename from src/A.cs",
  "rename to src/B.cs",
  "--- a/src/A.cs",
  "+++ b/src/B.cs",
  "@@ -3 +3 @@",
  "-old",
  "+new",
  "diff --git a/a b/c.md b/a b/c.md",
  "--- a/a b/c.md",
  "+++ b/a b/c.md",
  "@@ -1 +1 @@",
  "-x",
  "+y",
  'diff --git "a/caf\\303\\251.md" "b/caf\\303\\251.md"',
  '--- "a/caf\\303\\251.md"',
  '+++ "b/caf\\303\\251.md"',
  "@@ -1 +1 @@",
  "-x",
  "+y",
].join("\n");

test("parseDiff reads a real git diff without mistaking content for headers", () => {
  const files = parseDiff(REAL_DIFF);
  assert.deepEqual([...files.keys()].sort(), ["a b/c.md", "café.md", "old.cs", "skills/x/skill.md", "src/b.cs"]);
  const skill = files.get("skills/x/skill.md");
  assert.deepEqual([...skill.added].sort((a, b) => a - b), [1, 3]);
  assert.equal(files.get("old.cs").deleted, true);
});

test("touchesDiff separates an exactly-cited changed line from a nearby one", () => {
  const foo = parseDiff(DIFF).get("src/foo.cs");
  assert.equal(touchesDiff(foo, 14, 2), "EXACT");
  assert.equal(touchesDiff(foo, 11, 2), "NEAR");
  assert.equal(touchesDiff(foo, 40, 2), null);
  assert.equal(touchesDiff(foo, null, 2), "NEAR", "file-level findings stay for the verifier");
});

test("a finding on unchanged code in an untouched file is pre-existing", () => {
  const files = parseDiff(DIFF);
  const { anchored, preExisting } = anchorFindings(
    [{ agent: "a", file: "src/Other.cs", line: 3, issue: "old issue" }],
    files,
    2
  );
  assert.equal(anchored.length, 0);
  assert.equal(preExisting.length, 1);
  assert.equal(preExisting[0].diffAnchor, "PRE_EXISTING");
  assert.match(preExisting[0].filterReason, /not in diff/);
});

test("a nested file does not anchor to a changed root file with the same name", () => {
  const files = parseDiff("--- a/README.md\n+++ b/README.md\n@@ -8,3 +8,3 @@\n ctx\n-old\n+new\n ctx\n");
  const nested = anchorFindings([{ agent: "a", file: "sandbox/README.md", line: 9, issue: "x" }], files, 2);
  assert.equal(nested.anchored.length, 0);
  assert.equal(nested.preExisting.length, 1);

  const absolute = anchorFindings([{ agent: "a", file: "B:\\repo\\README.md", line: 9, issue: "x" }], files, 2);
  assert.equal(absolute.anchored.length, 1, "an absolute citation still matches by suffix");
});

test("an unchanged-code finding survives only with an enablingChange on a changed line", () => {
  const files = parseDiff(DIFF);
  const withAnchor = anchorFindings(
    [{ agent: "a", file: "src/Bar.cs", line: 99, issue: "caller unguarded", enablingChange: "src/Foo.cs:15 — new return path" }],
    files,
    2
  );
  assert.equal(withAnchor.anchored[0].diffAnchor, "ENABLED_BY_DIFF");

  const bogusAnchor = anchorFindings(
    [{ agent: "a", file: "src/Bar.cs", line: 99, issue: "caller unguarded", enablingChange: "src/Foo.cs:900 — not a changed line" }],
    files,
    2
  );
  assert.equal(bogusAnchor.anchored.length, 0, "an enablingChange that is not in the diff must not rescue a finding");
  assert.equal(bogusAnchor.preExisting.length, 1);
});

test("parseRef reads file and line out of a reference with prose", () => {
  assert.deepEqual(parseRef("src/Foo.cs:15 — new return path"), { file: "src/Foo.cs", line: 15 });
  assert.deepEqual(parseRef("src/Foo.cs:15"), { file: "src/Foo.cs", line: 15 });
  assert.equal(parseRef("src/Foo.cs").line, null);
  for (const ref of ["src/Foo.cs:15 – why", "src/Foo.cs:15: why", "src/Foo.cs:15 (why)", "src/Foo.cs:15, why", "src/Foo.cs#L15"]) {
    assert.deepEqual(parseRef(ref), { file: "src/Foo.cs", line: 15 }, ref);
  }
});

test("dedupe merges the same defect found by two agents and keeps the higher severity", () => {
  const { kept, merges } = dedupe(
    [
      { agent: "correctness-review", file: "src/Foo.cs", line: 14, severity: "HIGH", issue: "Index out of range when input is empty", underlyingProblem: "idx equals Length" },
      { agent: "performance-review", file: "src/Foo.cs", line: 15, severity: "CRITICAL", issue: "Index out of range on empty input array", underlyingProblem: "idx equals Length so indexing overflows", instances: ["src/Foo.cs:15"] },
    ],
    2
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0].severity, "CRITICAL");
  assert.equal(merges.length, 1);
  assert.deepEqual(kept[0].instances, ["src/Foo.cs:15"]);
});

test("dedupe keeps genuinely different defects at the same location", () => {
  const { kept } = dedupe(
    [
      { agent: "a", file: "src/Foo.cs", line: 14, severity: "HIGH", issue: "Index out of range when input is empty", underlyingProblem: "idx equals Length" },
      { agent: "b", file: "src/Foo.cs", line: 14, severity: "LOW", issue: "Method allocates a new list on every call", underlyingProblem: "no caching of the projection" },
    ],
    2
  );
  assert.equal(kept.length, 2);
});

test("loadFindings accepts envelopes, a single envelope, and a bare finding array", () => {
  assert.equal(loadFindings([envelope("a", [{ file: "x", issue: "i" }])]).length, 1);
  assert.equal(loadFindings(envelope("a", [{ file: "x", issue: "i" }])).length, 1);
  assert.equal(loadFindings([{ file: "x", issue: "i" }])[0].agent, "unknown");
});

test("the per-agent cap keeps the most severe findings", () => {
  // Deliberately unrelated wording: findings that share vocabulary at the same
  // line are treated as one defect by dedupe, which is tested separately.
  const subjects = [
    { issue: "logger writes the raw password", underlyingProblem: "credential reaches telemetry" },
    { issue: "timer never disposed", underlyingProblem: "handle leaks per request" },
    { issue: "index out of range on empty input", underlyingProblem: "offset equals length" },
    { issue: "culture-sensitive parse of a wire value", underlyingProblem: "locale changes semantics" },
    { issue: "retry loop has no backoff", underlyingProblem: "hot spin under failure" },
    { issue: "transaction commits before validation", underlyingProblem: "bad state persists" },
  ];
  const many = ["LOW", "LOW", "CRITICAL", "LOW", "LOW", "HIGH"].map((severity, i) => ({
    file: "src/Foo.cs",
    line: 14,
    severity,
    ...subjects[i],
  }));
  const res = runFilter({ diffText: DIFF, findings: [envelope("noisy", many)], maxPerAgent: 2 });
  assert.equal(res.toVerify.length, 2);
  assert.deepEqual(res.toVerify.map((f) => f.severity), ["CRITICAL", "HIGH"]);
  assert.equal(res.stats.cappedOff, 4);
  assert.equal(res.dropped.length, 4);
});

test("runFilter reports a stat line that accounts for every received finding", () => {
  const res = runFilter({
    diffText: DIFF,
    findings: [
      envelope("correctness-review", [
        { file: "src/Foo.cs", line: 14, severity: "HIGH", issue: "Index out of range when input is empty", underlyingProblem: "idx equals Length" },
        { file: "src/Baz.cs", line: 3, severity: "LOW", issue: "unrelated old issue", underlyingProblem: "none" },
      ]),
      envelope("performance-review", [
        { file: "src/Foo.cs", line: 15, severity: "CRITICAL", issue: "Index out of range on empty input array", underlyingProblem: "idx equals Length so indexing overflows" },
      ]),
    ],
  });
  assert.equal(res.stats.received, 3);
  assert.equal(res.stats.preExisting, 1);
  assert.equal(res.stats.mergedDuplicates, 1);
  assert.equal(res.stats.toVerify, 1);
  assert.equal(res.toVerify.length + res.preExisting.length + res.stats.mergedDuplicates + res.stats.cappedOff, res.stats.received);
});

test("an empty finding set is not an error", () => {
  const res = runFilter({ diffText: DIFF, findings: [] });
  assert.equal(res.stats.received, 0);
  assert.deepEqual(res.toVerify, []);
});

// The CLI must fail closed: anything it cannot anchor becomes PRE_EXISTING,
// which never blocks, so unusable input must never exit 0.
test("the filter CLI exits 2 on unusable input and runs through a symlinked path", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "filter-cli-"));
  const write = (name, text) => { const p = path.join(dir, name); writeFileSync(p, text); return p; };
  const diff = write("d.patch", DIFF);
  const empty = write("empty.patch", "");
  const good = write("good.json", JSON.stringify([envelope("a", [{ file: "src/Foo.cs", line: 14, severity: "HIGH", issue: "x" }])]));
  const malformed = write("bad.json", JSON.stringify({ agent: "a", findings: { file: "src/Foo.cs" } }));
  const nullItem = write("null.json", JSON.stringify({ agent: "a", findings: [null] }));
  const run = (args) => spawnSync(process.execPath, args, { encoding: "utf8" });

  const ok = run([FILTER, "--diff", diff, "--findings", good]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).stats.toVerify, 1);

  for (const args of [
    ["--diff", empty, "--findings", good],
    ["--diff", path.join(dir, "missing.patch"), "--findings", good],
    ["--diff", diff, "--findings", malformed],
    ["--diff", diff, "--findings", nullItem],
    ["--diff", "-", "--findings", "-"],
  ]) {
    const res = run([FILTER, ...args]);
    assert.equal(res.status, 2, args.join(" "));
    assert.doesNotMatch(res.stderr, /\n\s+at /, "no stack trace");
  }

  const link = path.join(dir, "linked-scripts");
  try {
    symlinkSync(path.dirname(FILTER), link, "junction");
  } catch {
    return; // no permission to create links on this host
  }
  const linked = run([path.join(link, "filter-findings.mjs"), "--diff", diff, "--findings", good]);
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(JSON.parse(linked.stdout).stats.toVerify, 1);
});
