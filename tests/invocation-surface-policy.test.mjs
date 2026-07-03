import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const targetPlugins = ["ado", "code-reviewer", "debugging", "development", "gh"];

const publicModelInvocableSkills = new Set([
  "code-reviewer/pr-review",
  "debugging/systematic-debugging",
]);

const publicManualOnlySkills = new Set([
  "ado/ado-babysit-pr",
  "ado/ado-publish-pr",
  "debugging/logging-enablement",
  "development/draft-work-item",
  "development/work-on",
  "gh/gh-babysit-pr",
  "gh/gh-publish-pr",
]);

function listFiles(relativeDir, predicate = () => true) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter(predicate)
    .map((entry) => entry.name)
    .sort();
}

function readRepoFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function parseFrontmatter(relativePath) {
  const content = readRepoFile(relativePath);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, `${relativePath} must start with YAML frontmatter`);

  const fields = new Map();
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let currentValue = [];

  function flush() {
    if (!currentKey) {
      return;
    }

    fields.set(currentKey, currentValue.join("\n").trim());
  }

  for (const line of lines) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) {
      flush();
      currentKey = field[1];
      currentValue = [field[2]];
    } else if (currentKey) {
      currentValue.push(line);
    }
  }

  flush();
  return fields;
}

function booleanField(fields, key, defaultValue) {
  const raw = fields.get(key);
  if (raw === undefined || raw === "") {
    return defaultValue;
  }

  return raw.trim().toLowerCase() === "true";
}

function skillFiles() {
  const files = [];
  for (const plugin of targetPlugins) {
    for (const skill of listFiles(path.join(plugin, "skills"), (entry) => entry.isDirectory())) {
      const skillFile = path.join(plugin, "skills", skill, "SKILL.md");
      if (existsSync(path.join(repoRoot, skillFile))) {
        files.push(skillFile);
      }
    }
  }
  return files;
}

function agentFiles() {
  const files = [];
  for (const plugin of targetPlugins) {
    for (const agent of listFiles(path.join(plugin, "agents"), (entry) => entry.isFile())) {
      if (agent.endsWith(".md")) {
        files.push(path.join(plugin, "agents", agent));
      }
    }
  }
  return files;
}

test("skill invocation policy keeps only the intended public surface", () => {
  for (const relativePath of skillFiles()) {
    const fields = parseFrontmatter(relativePath);
    const plugin = relativePath.split(path.sep)[0];
    const name = fields.get("name");
    const id = `${plugin}/${name}`;
    const userInvocable = booleanField(fields, "user-invocable", true);
    const disableModelInvocation = booleanField(
      fields,
      "disable-model-invocation",
      false
    );

    assert.ok(name, `${relativePath} must declare a skill name`);
    assert.ok(fields.get("description"), `${id} must keep a valid description`);

    if (publicModelInvocableSkills.has(id)) {
      assert.equal(userInvocable, true, `${id} should stay user-invocable`);
      assert.equal(disableModelInvocation, false, `${id} should stay model-invocable`);
    } else if (publicManualOnlySkills.has(id)) {
      assert.equal(userInvocable, true, `${id} should stay visible to users`);
      assert.equal(disableModelInvocation, true, `${id} should be manual-only`);
    } else {
      assert.equal(userInvocable, false, `${id} should be hidden from users`);
      assert.equal(disableModelInvocation, true, `${id} should be explicit-only`);
      assert.ok(
        fields.get("description").replace(/\s+/g, " ").trim().length <= 140,
        `${id} internal helper description should stay terse`
      );
    }
  }
});

test("specialist agents are hidden from direct invocation", () => {
  for (const relativePath of agentFiles()) {
    const fields = parseFrontmatter(relativePath);
    const name = fields.get("name");
    const userInvocable = booleanField(fields, "user-invocable", true);
    const disableModelInvocation = booleanField(
      fields,
      "disable-model-invocation",
      false
    );

    assert.ok(name, `${relativePath} must declare an agent name`);
    assert.ok(fields.get("description"), `${name} must keep a valid description`);
    assert.equal(userInvocable, false, `${name} should be hidden from users`);
    assert.equal(disableModelInvocation, true, `${name} should be explicit-only`);
  }
});