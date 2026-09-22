import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("branch completion never offers discard or forces worktree removal on its own", () => {
  const guide = read("development/reference/branch-completion-guide.md");
  const menu = guide.match(/present exactly these 3 options[\s\S]*?```text([\s\S]*?)```/i)?.[1];

  assert.ok(menu, "guide must present an exact 3-option menu");
  assert.doesNotMatch(menu, /discard/i, "discard must not be a menu option");
  assert.match(guide, /explicit(ly)? (request|asks?)/i, "discard happens only on explicit request");
  assert.match(guide, /Never `--force`/, "refused worktree removal must not be forced");
  assert.match(guide, /gh:gh-publish-pr/, "PR creation keeps the GitHub provider route");
  assert.match(guide, /ado:ado-publish-pr/, "PR creation keeps the Azure DevOps provider route");
});

test("worktree guide prefers native tools and has no global superpowers path", () => {
  const guide = read("development/reference/git-worktrees-guide.md");

  assert.doesNotMatch(guide, /\.config\/superpowers/, "global superpowers worktree path must be gone");
  assert.match(guide, /EnterWorktree/, "native worktree tools must be preferred");
  assert.match(guide, /show-superproject-working-tree/, "submodule guard must exist");
});

test("role agents carry the Agile manual-test, regression, and scope rules", () => {
  assert.match(read("development/agents/manual-tester.md"), /aftermath/i);
  assert.match(read("development/agents/manual-tester.md"), /could not run.*fail/i);
  assert.match(read("development/agents/developer.md"), /fails when the fix is reverted/i);
  assert.match(read("development/agents/critic.md"), /more than 8 files/i);
});

test("verification skill forbids ending a turn on an unperformed promise", () => {
  const skill = read("development/skills/verification-before-completion/SKILL.md");
  assert.match(skill, /## Finish your turn/);
  assert.match(skill, /promise/i);
});
