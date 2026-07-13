import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const targetPlugins = ["ado", "code-reviewer", "debugging", "development", "gh"];

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

test("every skill stays launchable by both users and the model", () => {
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
    assert.equal(userInvocable, true, `${id} should stay user-invocable`);
    assert.equal(
      disableModelInvocation,
      false,
      `${id} should stay model-invocable`
    );
  }
});

test("every agent stays launchable by both users and the model", () => {
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
    assert.equal(userInvocable, true, `${name} should stay user-invocable`);
    assert.equal(
      disableModelInvocation,
      false,
      `${name} should stay model-invocable`
    );
  }
});