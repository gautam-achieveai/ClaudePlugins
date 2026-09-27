import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, "code-reviewer", file), "utf8");
const owners = {
  "pr-review": "code-reviewer",
  "pr-context": "pr-context-gatherer",
  "nscript-review": "nscript-review",
  "orleans-review": "orleans-review",
  "over-engineering-review": "over-engineering-review",
  "schema-compatibility-review": "schema-compatibility-review",
  "post-pr-review": "post-pr-review",
  "update-pr-tracking": "update-pr-tracking",
  "review-pending-prs": "review-pending-prs",
  "review-retrospective": "review-retrospective",
  "apply-review-learning": "apply-review-learning",
};

test("every delegatable review skill has an associated agent, not a recursive wrapper", () => {
  const skills = readdirSync(path.join(root, "code-reviewer", "skills")).filter(
    (name) => existsSync(path.join(root, "code-reviewer", "skills", name, "SKILL.md"))
  );
  assert.deepEqual(skills.sort(), [...Object.keys(owners), "codebase-search-discipline"].sort());
  for (const [skill, agent] of Object.entries(owners)) {
    const prompt = read(`agents/${agent}.md`);
    assert.match(prompt, new RegExp(`(?:- |code-reviewer:)${skill}\\b`), `${agent} must use ${skill}`);
    assert.ok(read("references/review-handoffs.md").includes(`| \`${skill}\` | \`${agent}\` |`));
  }
  for (const name of ["post-pr-review", "update-pr-tracking", "apply-review-learning", "review-retrospective", "review-pending-prs"]) {
    const prompt = read(`agents/${name}.md`);
    assert.match(prompt, /do not dispatch this\s+wrapper again/i);
    assert.match(prompt, /review-handoffs\.md/);
  }
});

test("router delegates substantive judgments and captures native results", () => {
  const router = read("skills/pr-review/SKILL.md");
  const wrapper = read("agents/code-reviewer.md");
  const handoff = read("references/review-handoffs.md");
  assert.match(router, /do not run a duplicate parent-side code review/i);
  assert.match(router, /dispatch the `code-reviewer:post-pr-review` agent/);
  assert.match(router, /dispatch the `code-reviewer:update-pr-tracking` agent/);
  assert.match(router, /dispatch the `code-reviewer:review-retrospective` agent/);
  assert.match(wrapper, /do not independently regrade/);
  assert.doesNotMatch(wrapper, /Read the acceptance criteria and the complete diff first/);
  assert.match(handoff, /If nested\s+delegation is unavailable/);
  assert.match(handoff, /Host\/controller|host\/controller/);
  assert.match(handoff, /literal byte-preserving save/);
  assert.match(handoff, /Do not grant reviewers broad Write permissions/);
  assert.match(handoff, /daemon's schema-v1 response/);
  assert.match(handoff, /unknown,\s+duplicate or absent IDs fail validation/);
  assert.match(handoff, /Raw claims are evidence, not reusable\s+policy/);
  assert.match(read("agents/review-grader.md"), /return exactly one JSON object/);
  assert.match(read("agents/root-cause-synthesizer.md"), /"foldedFindings": \[\]/);
  const plannerFrontmatter = read("agents/remediation-planner.md").split("---")[1];
  assert.doesNotMatch(plannerFrontmatter, /- (?:Write|Edit|Bash)/);
});

// Pre-refactor ceilings: keep entrypoints compact, including unchanged skills.
const ceilings = {
  "apply-review-learning": [4105, 573, 76],
  "codebase-search-discipline": [1483, 218, 41],
  "nscript-review": [1484, 190, 42],
  "orleans-review": [1428, 193, 43],
  "over-engineering-review": [33511, 4990, 570],
  "post-pr-review": [44570, 6156, 919],
  "pr-context": [13925, 2043, 273],
  "pr-review": [34457, 4645, 538],
  "review-pending-prs": [9976, 1352, 291],
  "review-retrospective": [5092, 697, 90],
  "schema-compatibility-review": [32153, 4761, 589],
  "update-pr-tracking": [9053, 1262, 251],
};

test("no review skill grows in bytes, words or lines", () => {
  for (const [name, limits] of Object.entries(ceilings)) {
    const content = read(`skills/${name}/SKILL.md`).replaceAll("\r\n", "\n");
    const actual = [Buffer.byteLength(content), content.split(/\s+/).length, content.split("\n").length];
    for (const [i, metric] of ["bytes", "words", "lines"].entries()) {
      assert.ok(actual[i] <= limits[i], `${name} ${metric}: ${actual[i]} exceeds ${limits[i]}`);
    }
  }
});
