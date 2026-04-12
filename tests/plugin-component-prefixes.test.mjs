import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function listEntries(relativePath, predicate = () => true) {
  return readdirSync(path.join(repoRoot, relativePath), { withFileTypes: true })
    .filter(predicate)
    .map((entry) => entry.name)
    .sort();
}

function readSkillName(pluginName, skillDirName) {
  const skillPath = path.join(
    repoRoot,
    pluginName,
    "skills",
    skillDirName,
    "SKILL.md"
  );
  const content = readFileSync(skillPath, "utf8");
  const match = content.match(/^name:\s*(.+)$/m);
  assert.ok(match, `Expected a name field in ${skillPath}`);
  return match[1].trim();
}

function readRepoFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJsonFile(relativePath) {
  return JSON.parse(readRepoFile(relativePath));
}

function readFrontmatterName(relativePath) {
  const content = readRepoFile(relativePath);
  const match = content.match(/^name:\s*(.+)$/m);
  assert.ok(match, `Expected a name field in ${relativePath}`);
  return match[1].trim();
}

test("ado plugin component definitions are explicitly ado-prefixed", () => {
  assert.deepEqual(listEntries(path.join("ado", "commands")), [
    "ado-babysit-pr.md",
    "ado-draft-work-item.md",
    "ado-publish-pr.md",
    "ado-work-my-backlog.md",
    "ado-work-on.md",
    "setup-ado-mcp.md",
  ]);

  assert.deepEqual(listEntries(path.join("ado", "agents")), [
    "ado-babysit-pr-worker.md",
    "ado-devops-assistant.md",
    "ado-pr-tender.md",
  ]);

  assert.deepEqual(
    listEntries(path.join("ado", "skills"), (entry) => entry.isDirectory()),
    [
      "ado-babysit-pr",
      "ado-draft-work-item",
      "ado-mentions",
      "ado-publish-pr",
      "ado-work-items",
      "ado-work-my-backlog",
      "ado-work-on",
      "setup-ado-mcp",
    ]
  );

  for (const skillName of [
    "ado-babysit-pr",
    "ado-draft-work-item",
    "ado-mentions",
    "ado-publish-pr",
    "ado-work-items",
    "ado-work-my-backlog",
    "ado-work-on",
    "setup-ado-mcp",
  ]) {
    assert.equal(readSkillName("ado", skillName), skillName);
  }
});

test("gh plugin component definitions are explicitly gh-prefixed", () => {
  assert.deepEqual(listEntries(path.join("gh", "commands")), [
    "gh-babysit-pr.md",
    "gh-draft-work-item.md",
    "gh-publish-pr.md",
    "gh-work-my-backlog.md",
    "gh-work-on.md",
    "setup-gh-mcp.md",
  ]);

  assert.deepEqual(listEntries(path.join("gh", "agents")), [
    "gh-babysit-pr-worker.md",
    "gh-devops-assistant.md",
    "gh-pr-tender.md",
  ]);

  assert.deepEqual(
    listEntries(path.join("gh", "skills"), (entry) => entry.isDirectory()),
    [
      "gh-babysit-pr",
      "gh-draft-work-item",
      "gh-mentions",
      "gh-publish-pr",
      "gh-work-items",
      "gh-work-my-backlog",
      "gh-work-on",
      "setup-gh-mcp",
    ]
  );

  for (const skillName of [
    "gh-babysit-pr",
    "gh-draft-work-item",
    "gh-mentions",
    "gh-publish-pr",
    "gh-work-items",
    "gh-work-my-backlog",
    "gh-work-on",
    "setup-gh-mcp",
  ]) {
    assert.equal(readSkillName("gh", skillName), skillName);
  }
});

test("renamed ado and gh command entrypoints invoke the prefixed skill names", () => {
  const expectations = new Map([
    [
      path.join("ado", "commands", "ado-work-on.md"),
      "Load and execute the **ado:ado-work-on** skill (`skills/ado-work-on/SKILL.md`).",
    ],
    [
      path.join("ado", "commands", "ado-work-my-backlog.md"),
      "Load and execute the **ado:ado-work-my-backlog** skill (`skills/ado-work-my-backlog/SKILL.md`).",
    ],
    [
      path.join("ado", "commands", "ado-draft-work-item.md"),
      "Load and execute the **ado:ado-draft-work-item** skill (`skills/ado-draft-work-item/SKILL.md`).",
    ],
    [
      path.join("ado", "commands", "ado-babysit-pr.md"),
      "Load and execute the **ado:ado-babysit-pr** skill (`skills/ado-babysit-pr/SKILL.md`).",
    ],
    [
      path.join("ado", "commands", "ado-publish-pr.md"),
      "Load and execute the **ado:ado-publish-pr** skill.",
    ],
    [
      path.join("gh", "commands", "gh-work-on.md"),
      "Load and execute the **gh:gh-work-on** skill (`skills/gh-work-on/SKILL.md`).",
    ],
    [
      path.join("gh", "commands", "gh-work-my-backlog.md"),
      "Load and execute the **gh:gh-work-my-backlog** skill (`skills/gh-work-my-backlog/SKILL.md`).",
    ],
    [
      path.join("gh", "commands", "gh-draft-work-item.md"),
      "Load and execute the **gh:gh-draft-work-item** skill (`skills/gh-draft-work-item/SKILL.md`).",
    ],
    [
      path.join("gh", "commands", "gh-babysit-pr.md"),
      "Load and execute the **gh:gh-babysit-pr** skill (`skills/gh-babysit-pr/SKILL.md`).",
    ],
    [
      path.join("gh", "commands", "gh-publish-pr.md"),
      "Load and execute the **gh:gh-publish-pr** skill.",
    ],
  ]);

  for (const [relativePath, expectedText] of expectations) {
    assert.ok(
      readRepoFile(relativePath).includes(expectedText),
      `Expected ${relativePath} to contain: ${expectedText}`
    );
  }
});

test("user-facing backlog and work-on docs use prefixed slash commands", () => {
  const expectations = new Map([
    [
      path.join("ado", "skills", "ado-work-my-backlog", "SKILL.md"),
      [
        "/loop 15m /ado-work-my-backlog",
        "/ado-work-on <id>",
        "/ado-babysit-pr <pr-id>",
        "/ado-draft-work-item",
        "/ado-work-items",
      ],
    ],
    [
      path.join("gh", "skills", "gh-work-my-backlog", "SKILL.md"),
      [
        "/loop 15m /gh-work-my-backlog",
        "/gh-work-on <id>",
        "/gh-babysit-pr <pr-id>",
        "/gh-draft-work-item",
        "/gh-work-items",
      ],
    ],
    [
      path.join("gh", "skills", "gh-work-on", "SKILL.md"),
      [
        "/gh-work-on <id>",
        "re-run `/gh-work-on <id>`.",
        "On the next `/gh-work-on <id>` invocation",
      ],
    ],
    [
      path.join("gh", "skills", "gh-draft-work-item", "SKILL.md"),
      ["Start `/gh-work-on <id>`"],
    ],
  ]);

  for (const [relativePath, snippets] of expectations) {
    const content = readRepoFile(relativePath);
    for (const snippet of snippets) {
      assert.ok(
        content.includes(snippet),
        `Expected ${relativePath} to contain: ${snippet}`
      );
    }
  }
});

test("internal delegation references use renamed prefixed skill and agent ids", () => {
  const expectations = new Map([
    [
      path.join("ado", "skills", "ado-work-my-backlog", "SKILL.md"),
      [
        "ado:ado-work-on <workItemId>",
        "ado:ado-babysit-pr-worker",
      ],
    ],
    [
      path.join("ado", "skills", "ado-publish-pr", "SKILL.md"),
      ["ado:ado-babysit-pr", "ado:ado-pr-tender", "ado:ado-mentions"],
    ],
    [
      path.join("gh", "skills", "gh-work-my-backlog", "SKILL.md"),
      [
        "gh:gh-work-on <workItemId>",
        "gh:gh-babysit-pr-worker",
      ],
    ],
    [
      path.join("gh", "skills", "gh-publish-pr", "SKILL.md"),
      ["gh:gh-babysit-pr", "gh:gh-pr-tender", "gh:gh-mentions"],
    ],
    [
      path.join("code-reviewer", "skills", "review-pending-prs", "SKILL.md"),
      [
        "ado:ado-publish-pr",
        "ado:ado-babysit-pr",
        "ado:ado-work-on",
        "ado:ado-draft-work-item",
      ],
    ],
  ]);

  for (const [relativePath, snippets] of expectations) {
    const content = readRepoFile(relativePath);
    for (const snippet of snippets) {
      assert.ok(
        content.includes(snippet),
        `Expected ${relativePath} to contain: ${snippet}`
      );
    }
  }
});

test("renamed agents keep frontmatter names and helper-skill wiring aligned", () => {
  const expectations = new Map([
    [
      path.join("ado", "agents", "ado-pr-tender.md"),
      'skill: "ado:ado-mentions"',
    ],
    [
      path.join("ado", "agents", "ado-devops-assistant.md"),
      'skill: "ado:ado-mentions"',
    ],
    [
      path.join("ado", "agents", "ado-babysit-pr-worker.md"),
      'skill: "ado:ado-mentions"',
    ],
    [
      path.join("gh", "agents", "gh-pr-tender.md"),
      'skill: "gh:gh-mentions"',
    ],
    [
      path.join("gh", "agents", "gh-devops-assistant.md"),
      'skill: "gh:gh-mentions"',
    ],
    [
      path.join("gh", "agents", "gh-babysit-pr-worker.md"),
      'skill: "gh:gh-mentions"',
    ],
  ]);

  for (const [relativePath, helperSkillSnippet] of expectations) {
    const baseName = path.basename(relativePath, ".md");
    const content = readRepoFile(relativePath);
    assert.equal(readFrontmatterName(relativePath), baseName);
    assert.ok(
      content.includes(helperSkillSnippet),
      `Expected ${relativePath} to contain: ${helperSkillSnippet}`
    );
  }
});

test("eval manifests point at renamed work-my-backlog skill names", () => {
  assert.equal(
    readJsonFile(path.join("ado", "skills", "ado-work-my-backlog", "evals", "evals.json"))
      .skill_name,
    "ado-work-my-backlog"
  );

  assert.equal(
    readJsonFile(path.join("gh", "skills", "gh-work-my-backlog", "evals", "evals.json"))
      .skill_name,
    "gh-work-my-backlog"
  );
});

test("plan-comment-format reference docs use prefixed commands and explicit HITL approval", () => {
  const refFiles = [
    {
      path: path.join("ado", "skills", "ado-work-on", "reference", "plan-comment-format.md"),
      expectedCommand: "/ado-work-on",
    },
    {
      path: path.join("gh", "skills", "gh-work-on", "reference", "plan-comment-format.md"),
      expectedCommand: "/gh-work-on",
    },
  ];

  for (const { path: relPath, expectedCommand } of refFiles) {
    const content = readRepoFile(relPath);

    // Must not contain bare /work-on as a command reference
    assert.ok(
      !/ \/work-on[ \n]/.test(content),
      `${relPath} still contains bare '/work-on' — should use '${expectedCommand}'`
    );

    // Must not teach implicit approval as the behavior
    assert.ok(
      !content.includes("IMPLICIT APPROVAL"),
      `${relPath} still teaches 'IMPLICIT APPROVAL' — should describe explicit HITL checkpoint`
    );

    // Must not say silence/no-comments means approval
    assert.ok(
      !content.includes("treated as implicit approval"),
      `${relPath} says 'treated as implicit approval' — contradicts SKILL.md HITL requirement`
    );

    // Must contain the prefixed command form
    assert.ok(
      content.includes(expectedCommand),
      `${relPath} should reference '${expectedCommand}'`
    );
  }
});

test("repo-relative work-on reference strings resolve to renamed plugin paths", () => {
  const expectations = new Map([
    [
      path.join("ado", "skills", "ado-work-my-backlog", "scripts", "classify.mjs"),
      "ado/skills/ado-work-on/reference/plan-comment-format.md",
    ],
    [
      path.join("gh", "skills", "gh-work-my-backlog", "scripts", "classify.mjs"),
      "gh/skills/gh-work-on/reference/plan-comment-format.md",
    ],
  ]);

  for (const [relativePath, referencedPath] of expectations) {
    const content = readRepoFile(relativePath);

    assert.ok(
      content.includes(referencedPath),
      `Expected ${relativePath} to contain repo-relative reference path: ${referencedPath}`
    );

    assert.ok(
      existsSync(path.join(repoRoot, referencedPath)),
      `Expected ${relativePath} to reference an existing repo path: ${referencedPath}`
    );
  }
});

test("no old unprefixed component names survive in commands, agents, or delegation", () => {
  // Old unprefixed names that must NOT appear as component references
  const stalePatterns = [
    /\bado:work-on\b/,
    /\bado:publish-pr\b/,
    /\bado:babysit-pr\b/,
    /\bado:draft-work-item\b/,
    /\bado:work-my-backlog\b/,
    /\bado:work-items\b/,
    /\bado:pr-tender\b/,
    /\bado:devops-assistant\b/,
    /\bado:babysit-pr-worker\b/,
    /\bgh:work-on\b/,
    /\bgh:publish-pr\b/,
    /\bgh:babysit-pr\b/,
    /\bgh:draft-work-item\b/,
    /\bgh:work-my-backlog\b/,
    /\bgh:work-items\b/,
    /\bgh:pr-tender\b/,
    /\bgh:devops-assistant\b/,
    /\bgh:babysit-pr-worker\b/,
  ];

  // Collect all command, agent, and SKILL.md files from both plugins
  const filesToCheck = [];
  for (const plugin of ["ado", "gh"]) {
    for (const entry of listEntries(path.join(plugin, "commands"))) {
      filesToCheck.push(path.join(plugin, "commands", entry));
    }
    for (const entry of listEntries(path.join(plugin, "agents"))) {
      filesToCheck.push(path.join(plugin, "agents", entry));
    }
    for (const entry of listEntries(path.join(plugin, "skills"), (e) => e.isDirectory())) {
      const skillMd = path.join(plugin, "skills", entry, "SKILL.md");
      if (existsSync(path.join(repoRoot, skillMd))) {
        filesToCheck.push(skillMd);
      }
    }
  }

  for (const relPath of filesToCheck) {
    const content = readRepoFile(relPath);
    for (const pattern of stalePatterns) {
      assert.ok(
        !pattern.test(content),
        `${relPath} contains stale unprefixed delegation '${pattern.source}'`
      );
    }
  }
});

test("reference docs do not use bare /work-on command form", () => {
  // Check all reference .md files in both work-on skills for bare /work-on commands
  const refDirs = [
    { dir: path.join("ado", "skills", "ado-work-on", "reference"), prefix: "/ado-work-on" },
    { dir: path.join("gh", "skills", "gh-work-on", "reference"), prefix: "/gh-work-on" },
  ];

  for (const { dir, prefix } of refDirs) {
    const entries = listEntries(dir).filter((f) => f.endsWith(".md"));
    for (const entry of entries) {
      const relPath = path.join(dir, entry);
      const content = readRepoFile(relPath);
      // Bare /work-on as a command (preceded by space/backtick, followed by space/newline/angle)
      const bareCommandHits = content.match(/(?:[ `])\/work-on(?=[ \n<`])/g);
      assert.ok(
        !bareCommandHits,
        `${relPath} uses bare '/work-on' command form (${bareCommandHits?.length} hits) — should use '${prefix}'`
      );
    }
  }
});
