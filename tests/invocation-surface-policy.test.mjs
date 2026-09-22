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

// Three-way context-mode contract. Enrichment is the default (bare PR
// request, Pre-fetched Context, or Review-setup Context alone). Only the
// explicit pair `Context Mode: deterministic-offline` + `Pre-fetched Context:`
// selects closed-world rendering, and that rendering happens INLINE inside
// pr-context — no Agent dispatch, and no `remove_tools` (never a supported
// Agent-dispatch argument; runtime "tool sandboxing" was never real). This
// replaces two prior tests that pinned the broken contract: one asserted a
// literal `remove_tools:` list on pr-context (an unsupported API), the other
// asserted an Agent dispatch fires whenever a bare Pre-fetched Context block
// is present (the "unconditional prefetched trigger" bug that collided with
// enrichment mode).
test("Context Mode: deterministic-offline renders inline in pr-context, with no Agent dispatch or remove_tools", () => {
  const prContext = readRepoFile(path.join("code-reviewer", "skills", "pr-context", "SKILL.md"));

  assert.doesNotMatch(
    prContext,
    /remove_tools\s*:/,
    "pr-context/SKILL.md must not use remove_tools as an actual dispatch field — it is not a supported Agent-dispatch argument (explanatory prose naming it as unsupported is fine)"
  );

  const offlineSection = sectionBetween(
    prContext,
    "### Deterministic-offline mode",
    "## Output Interpretation Guide"
  );

  assert.doesNotMatch(
    offlineSection,
    /Agent:\s*\n\s*subagent_type/,
    "deterministic-offline mode must not dispatch an Agent from pr-context — it renders inline instead"
  );
  assert.doesNotMatch(
    offlineSection,
    /\bremove all\b[\s\S]{0,80}\btools\b/i,
    "deterministic-offline mode must not describe removing/stripping tools from a dispatched agent — there is no dispatch to restrict; rendering happens inline in pr-context itself"
  );
  assert.match(
    offlineSection,
    /inline/i,
    "deterministic-offline mode must render the supplied context inline"
  );
  assert.match(
    offlineSection,
    /Output Format/i,
    "inline rendering must reuse the gatherer's existing Output Format rather than inventing a second one"
  );
  assert.match(
    offlineSection,
    /Context Mode:\s*deterministic-offline[\s\S]{0,120}Pre-fetched Context/,
    "offline rendering must require Context Mode: deterministic-offline together with a Pre-fetched Context payload"
  );
});

// The offline mode is explicit-only: a bare Pre-fetched Context (or a bare PR
// request, or a Review-setup Context seed) without the Context Mode:
// deterministic-offline marker must land in enrichment, never silently
// upgrade to closed-world rendering.
test("a bare prefetched or review-setup seed without the explicit offline marker selects enrichment, not deterministic-offline", () => {
  const prContext = readRepoFile(path.join("code-reviewer", "skills", "pr-context", "SKILL.md"));

  const enrichmentSection = sectionBetween(
    prContext,
    "### Enrichment mode",
    "### Deterministic-offline mode"
  );
  assert.match(
    enrichmentSection,
    /default/i,
    "enrichment must be documented as the default context mode"
  );
  assert.match(
    enrichmentSection,
    /Review-setup\s+Context/,
    "enrichment mode must accept a Review-setup Context seed"
  );
  assert.match(
    enrichmentSection,
    /Pre-fetched Context[\s\S]{0,80}without[\s\S]{0,80}(offline|deterministic-offline)/i,
    "a bare Pre-fetched Context without the explicit offline marker must select enrichment"
  );

  const offlineSection = sectionBetween(
    prContext,
    "### Deterministic-offline mode",
    "## Output Interpretation Guide"
  );
  assert.match(
    offlineSection,
    /Pre-fetched Context[\s\S]{0,40}(alone|itself|by itself)[\s\S]{0,40}(not|does not|never)[\s\S]{0,40}(select|trigger)/i,
    "the offline section must itself state a bare Pre-fetched Context block does not, alone, select offline mode"
  );
});

// A request that explicitly asks for offline rendering but supplies no (or
// an empty) Pre-fetched Context payload must fail closed — refuse and report
// the gap — rather than silently rendering nothing or quietly falling
// through to a live enrichment lookup.
test("a missing or empty deterministic-offline payload fails closed instead of rendering or silently enriching", () => {
  const prContext = readRepoFile(path.join("code-reviewer", "skills", "pr-context", "SKILL.md"));
  const offlineSection = sectionBetween(
    prContext,
    "### Deterministic-offline mode",
    "## Output Interpretation Guide"
  );

  assert.match(
    offlineSection,
    /fail(?:s|ed|ing)?[\s-]closed/i,
    "an offline request with a missing/empty payload must fail closed"
  );
  assert.match(
    offlineSection,
    /(missing|empty|absent)[\s\S]{0,60}(payload|Pre-fetched Context)/i,
    "the fail-closed behavior must be tied to a missing/empty Pre-fetched Context payload"
  );
  // Note: deliberately no doesNotMatch(/fall back to ... enrichment/) here —
  // that pattern is negation-blind: a *correct* fail-closed statement like
  // "must not fall back to enrichment" or "never falls back to enrichment"
  // contains the exact same substring as the bug it's meant to catch. The
  // positive assertions above (fail-closed + missing/empty payload) already
  // pin the required behavior without that false-positive risk.
});

// The gatherer's own Deterministic Context Mode (its instruction-only
// behavior when a Pre-fetched Context block is supplied) must still refuse
// to live-fallback for merely incomplete supplied data — distinct from the
// fail-closed case above, which is a wholly missing/empty payload. This
// preserves a correct pre-existing behavior untouched by the six findings.
test("gatherer's Deterministic Context Mode still refuses to live-fallback when supplied data is merely incomplete", () => {
  const gatherer = readRepoFile(path.join("code-reviewer", "agents", "pr-context-gatherer.md"));
  const detSection = sectionBetween(gatherer, "## Deterministic Context Mode", "## Workflow");

  assert.match(
    detSection,
    /never fall back to the live\s+workflow/i,
    "Deterministic Context Mode must still refuse to fall back to a live lookup for incomplete supplied data"
  );
  assert.match(
    detSection,
    /report the gap plainly/i,
    "Deterministic Context Mode must still instruct reporting missing pieces plainly instead of fetching them"
  );
});

// Stale-step bug: this section used to send the reader "directly to Step 6"
// after skipping "Steps 1-5" — but Step 6 is itself a collection step (the
// git-blame provenance walk), and the real render-only step is Step 7. The
// fix must retarget Step 7, widen the skip range to cover Step 6 too, and
// extend it to the collection steps described AFTER Step 7 (Steps 8 and 9 —
// skills search and KnowledgeBase search) which are equally live-provider
// work that offline rendering must not perform.
test("gatherer's deterministic rendering is instruction-only: Step 7 only, skipping Steps 1-6 and 8-9", () => {
  const gatherer = readRepoFile(path.join("code-reviewer", "agents", "pr-context-gatherer.md"));
  const detSection = sectionBetween(gatherer, "## Deterministic Context Mode", "## Workflow");

  assert.match(
    detSection,
    /Step\s*7/,
    "Deterministic Context Mode must point at Step 7 (Build the Context Tree) for rendering"
  );
  assert.doesNotMatch(
    detSection,
    /directly to Step\s*6/i,
    "Deterministic Context Mode must not still send the reader to Step 6 as the render target"
  );
  assert.doesNotMatch(
    detSection,
    /skip\s+Steps?\s*1[\s-]*(?:through|-|to)\s*5\b/i,
    "the skip range must cover Steps 1-6, not the old stale 1-5 range"
  );
  assert.match(
    detSection,
    /Steps?\s*1[\s-]*(?:through|-|to)\s*6\b/i,
    "Deterministic Context Mode must state it skips Steps 1 through 6"
  );
  assert.match(
    detSection,
    /Steps?\s*8[\s\S]{0,20}9\b/i,
    "Deterministic Context Mode must also state it skips Steps 8 and 9, not just the steps before Step 7"
  );

  const step7Section = sectionBetween(gatherer, "### Step 7", "### Step 8");
  assert.match(
    step7Section,
    /only step performed/i,
    "Step 7 must state it is the only step performed in Deterministic Context Mode"
  );
});

// Missing ADO discussion access: the gatherer's explicit (non-wildcard) tool
// allowlist omitted mcp__azure-devops__getPullRequestComments, leaving it
// unable to read PR discussion threads even though provider-resolution.md
// documents that tool as the ADO equivalent of GitHub PR comments.
test("gatherer's explicit tool allowlist includes mcp__azure-devops__getPullRequestComments", () => {
  const gathererPath = path.join("code-reviewer", "agents", "pr-context-gatherer.md");
  const fields = parseFrontmatter(gathererPath);
  const tools = fields.get("tools");

  assert.ok(tools, "pr-context-gatherer.md must declare a tools frontmatter field");
  assert.match(
    tools,
    /mcp__azure-devops__getPullRequestComments/,
    "pr-context-gatherer.md's explicit tool allowlist must include mcp__azure-devops__getPullRequestComments"
  );
  // The addition must not accidentally replace tools it already relies on.
  assert.match(tools, /mcp__azure-devops__getPullRequest\b/);
  assert.match(tools, /mcp__azure-devops__getWorkItemById/);
  assert.match(tools, /mcp__azure-devops__getWorkItemsBatch/);
});

// Provenance-cap propagation: provider-resolution.md already caps historical
// PR lookup at five unique provenance PRs (in addition to the current PR)
// and records selection/coverage status, but that limit was never carried
// into the gatherer's own Step 6 instructions (git-blame provenance walk),
// which just says "encouraged to use sub agents to parallelize this work"
// with no shared cap, no dedup step, and no budget-truncated coverage state
// — so parallel delegated workers could each independently re-discover and
// re-fetch the same or additional PRs well past the intended budget.
test("provenance PR history stays capped at five unique PRs, deduplicated and shared across delegated workers, with coverage recorded", () => {
  const providerResolution = readRepoFile(path.join("code-reviewer", "references", "provider-resolution.md"));
  const gatherer = readRepoFile(path.join("code-reviewer", "agents", "pr-context-gatherer.md"));

  const seededSection = sectionBetween(
    providerResolution,
    "## Seeded PR-context enrichment",
    "## Issue / Work-Item Hierarchy"
  );
  assert.match(
    seededSection,
    /\bfive\b[\s\S]{0,30}\bprovenance PRs\b/i,
    "provider-resolution.md must keep the five-provenance-PR cap in addition to the current PR"
  );
  assert.match(
    seededSection,
    /budget[\s-]?truncated/i,
    "provider-resolution.md's coverage recording must add a budget-truncated status alongside examined/absent/inaccessible/offline"
  );

  const step6Section = sectionBetween(gatherer, "### Step 6", "### Step 7");
  assert.match(
    step6Section,
    /five|5\b/,
    "gatherer Step 6 must carry the provenance-PR cap into its own delegation instructions"
  );
  assert.match(
    step6Section,
    /uniqu/i,
    "gatherer Step 6 must state the cap counts unique provenance PRs"
  );
  assert.match(
    step6Section,
    /(dedup|de-dup|deduplicat)/i,
    "gatherer Step 6 must deduplicate provenance PRs before delegating sub-agent work"
  );
  assert.match(
    step6Section,
    /(shared|global|across)[\s\S]{0,40}(sub\s*agent|worker|delegat)/i,
    "gatherer Step 6 must share the provenance-PR budget across delegated sub-agent workers, not apply it per worker"
  );
});

// Duplicate-metadata-fetch bug: Step 1 of pr-review already fetches PR
// details, but that fetch was never forwarded onward — it was only passed to
// pr-context when the hierarchy already "looked complete", so an incomplete
// fetch silently re-fetched from scratch. The fix forwards a Review-setup
// Context seed unconditionally (partial or complete), and enrichment reuses
// its fields instead of blanket re-reading the current PR.
test("pr-review always forwards available metadata as a verbatim Review-setup Context seed, and enrichment reuses it instead of refetching", () => {
  const prReview = readRepoFile(path.join("code-reviewer", "skills", "pr-review", "SKILL.md"));
  const prContext = readRepoFile(path.join("code-reviewer", "skills", "pr-context", "SKILL.md"));

  const setupSection = sectionBetween(prReview, "1. **Setup**", "2. **Classify changed files**");
  assert.match(
    setupSection,
    /Review-setup\s+Context/,
    "pr-review's Setup step must construct/forward a Review-setup Context seed"
  );
  assert.match(
    setupSection,
    /(partial|complete)[\s\S]{0,60}(partial|complete)/i,
    "forwarding must be documented as unconditional — whether the fetched metadata is partial or complete"
  );
  assert.doesNotMatch(
    setupSection,
    /already carry the complete hierarchy inline/i,
    "Setup must not gate Review-setup Context forwarding behind an already-complete-hierarchy check"
  );

  const enrichmentSection = sectionBetween(prContext, "### Enrichment mode", "### Deterministic-offline mode");
  assert.doesNotMatch(
    enrichmentSection,
    /Read the current PR, discussion, and linked-item hierarchy\./,
    "enrichment must not instruct blanket re-reading the current PR when it was already supplied"
  );
  assert.match(
    enrichmentSection,
    /(missing|not (?:already )?supplied|not provided)[\s\S]{0,80}(discussion|hierarchy)/i,
    "enrichment must fetch only the discussion/hierarchy data missing from the supplied seed"
  );
});

// The "final exactly-one Context Gatherer fix": a third, daemon-owned mode.
// The daemon can launch pr-context-gatherer directly (visibly, exactly once)
// and hand pr-review its already-rendered result via the literal marker
// `Context Gatherer Owner: daemon-direct`. This is mutually exclusive with
// pr-review's own `code-reviewer:pr-context` dispatch (the standalone/
// interactive path, and the Pre-fetched Context forwarding path pinned
// above) — pr-review must never double-launch the gatherer in this mode, and
// pr-context must refuse to launch it as defense-in-depth if the marker
// reaches there anyway.
test("daemon-direct mode is mutually exclusive with pr-review's own pr-context/pr-context-gatherer launch", () => {
  const prReview = readRepoFile(path.join("code-reviewer", "skills", "pr-review", "SKILL.md"));
  const prContext = readRepoFile(path.join("code-reviewer", "skills", "pr-context", "SKILL.md"));
  const catalog = readRepoFile(
    path.join("code-reviewer", "skills", "pr-review", "reference", "tool-catalog.md")
  );

  const marker = "Context Gatherer Owner: daemon-direct";

  // pr-review must document the literal marker, on one unbroken line so the
  // exact string is greppable rather than split by prose wrapping.
  assert.ok(
    prReview.includes(marker),
    "pr-review/SKILL.md must document the literal daemon-direct marker on one line"
  );

  const daemonDirectSection = sectionBetween(prReview, "**Daemon-direct mode**", "**Otherwise**");
  assert.match(
    daemonDirectSection,
    /do \*\*not\*\* dispatch\s*\n?\s*`skill:\s*"code-reviewer:pr-context"`/,
    "daemon-direct branch must forbid dispatching code-reviewer:pr-context"
  );
  assert.match(
    daemonDirectSection,
    /do \*\*not\*\* launch\s*\n?\s*`pr-context-gatherer`/,
    "daemon-direct branch must forbid launching pr-context-gatherer directly"
  );
  assert.match(
    daemonDirectSection,
    /mutually exclusive/i,
    "daemon-direct branch must state mutual exclusivity with the interactive/pre-fetched branch"
  );

  // The interactive/Pre-fetched-Context branch must remain present and still
  // dispatch code-reviewer:pr-context exactly as before this change.
  assert.match(
    prReview,
    /\*\*Otherwise\*\*[\s\S]*?skill:\s*"code-reviewer:pr-context"/,
    "the non-daemon-direct branch must still dispatch code-reviewer:pr-context"
  );
  assert.match(prReview, /Pre-fetched\s+Context/);

  // Step 1 must define a clear labeled delimiter for the daemon-supplied
  // gatherer result, so Step 3 (and the daemon's own prompt contract) has an
  // unambiguous boundary to hand off across.
  const delimiter = "## Context Gatherer Result (Daemon-Supplied):";
  assert.ok(
    daemonDirectSection.includes(delimiter),
    "daemon-direct branch must define the labeled Context Gatherer Result delimiter"
  );

  // Step 3 must treat the daemon-direct tree as equivalent to the
  // code-reviewer:pr-context hierarchy, and must explicitly prohibit
  // re-dispatching pr-context or re-launching pr-context-gatherer there —
  // the gap an independent review flagged: Step 3 previously named only the
  // pr-context hierarchy and said nothing about daemon-direct mode.
  const step3Section = sectionBetween(
    prReview,
    "3. **Understand the changes**",
    "<review_intent_gate>"
  );
  assert.ok(
    step3Section.includes(delimiter),
    "Step 3 must reference the labeled daemon-supplied delimiter as an equivalent input"
  );
  assert.match(
    step3Section,
    /equivalent/i,
    "Step 3 must state the daemon-direct tree and code-reviewer:pr-context hierarchy are equivalent inputs"
  );
  assert.match(
    step3Section,
    /never\s+re-dispatch\s+`skill:\s*"code-reviewer:pr-context"`/i,
    "Step 3 must explicitly prohibit re-dispatching code-reviewer:pr-context"
  );
  assert.match(
    step3Section,
    /(?:or\s+launch|launch)\s+`pr-context-gatherer`\s+here/i,
    "Step 3 must explicitly prohibit re-launching pr-context-gatherer"
  );

  // pr-context must refuse to launch the gatherer if the marker reaches it —
  // duplicate-dispatch defense-in-depth, independent of pr-review's own check.
  assert.ok(
    prContext.includes(marker),
    "pr-context/SKILL.md must document the literal daemon-direct marker for duplicate defense"
  );
  assert.match(
    prContext,
    /Daemon-Direct Duplicate Defense/,
    "pr-context/SKILL.md must name its duplicate-defense step"
  );
  assert.match(
    prContext,
    /do not launch\s*\n?\s*`pr-context-gatherer`/i,
    "pr-context/SKILL.md must refuse to launch pr-context-gatherer when the daemon-direct marker is present"
  );

  // Tool catalog must document the mutual exclusivity for pr-context-gatherer.
  assert.match(catalog, /Mutually exclusive launch ownership/);
  assert.ok(
    catalog.includes(marker),
    "tool-catalog.md must reference the literal daemon-direct marker"
  );

  // This mode adds no new tool surface at all: the duplicate-defense branch
  // stops before ever reaching an Agent dispatch, and the file must not rely
  // on the unsupported remove_tools mechanism to constrain it.
  assert.doesNotMatch(
    prContext,
    /remove_tools\s*:/,
    "pr-context/SKILL.md must not use remove_tools as an actual dispatch field"
  );
  const defenseSection = sectionBetween(
    prContext,
    "### 0. Daemon-Direct Duplicate Defense",
    "### 1. Identify the PR and Repository"
  );
  assert.doesNotMatch(
    defenseSection,
    /Agent:\s*\n\s*subagent_type/,
    "the daemon-direct duplicate defense must stop before dispatching any Agent"
  );
});

// Live run 345: Step 3 ("Understand the changes") said only `<Launch agent>`
// with no subagent_type, and the model reused the Step 1 context gatherer's
// `pr-context-gatherer` template for it — wrong role, wrong tool surface, and
// a silent skip of the intent/scope analysis Step 3 exists to do. Step 3 must
// name its own stable, non-gatherer role and pin subagent_type explicitly;
// pr-context-gatherer must be documented as off-limits for any role but the
// Step 1 context gather, in both the spine and the catalog.
test("Step 3 dispatches a stable general-purpose intent/scope agent, never pr-context-gatherer", () => {
  const prReview = readRepoFile(path.join("code-reviewer", "skills", "pr-review", "SKILL.md"));
  const catalog = readRepoFile(
    path.join("code-reviewer", "skills", "pr-review", "reference", "tool-catalog.md")
  );

  const step3Section = sectionBetween(
    prReview,
    "3. **Understand the changes**",
    "<review_intent_gate>"
  );

  // Step 3 must pin an explicit, non-gatherer subagent_type — the exact gap
  // that let live run 345 silently reuse pr-context-gatherer.
  assert.match(
    step3Section,
    /subagent_type:\s*general-purpose/,
    "Step 3 must explicitly dispatch subagent_type: general-purpose"
  );

  // Step 3 must carry a stable, distinct role name (not gatherer-named) so
  // the dispatch is identifiable across runs and prompts.
  assert.match(
    step3Section,
    /PR Intent & Scope Analyst/,
    "Step 3 must name its agent with a stable, non-gatherer role"
  );

  // The actual dispatch block (not the surrounding prohibition prose) must
  // be the one that pins subagent_type — and it must never be gatherer.
  const dispatchBlock = step3Section.match(/```\s*\n\s*Agent:\n([\s\S]*?)```/);
  assert.ok(dispatchBlock, "Step 3 must include a fenced Agent dispatch block");
  assert.match(
    dispatchBlock[1],
    /subagent_type:\s*general-purpose/,
    "Step 3's dispatch block must pin subagent_type: general-purpose"
  );
  assert.doesNotMatch(
    dispatchBlock[1],
    /pr-context-gatherer/,
    "Step 3's dispatch block must not name pr-context-gatherer"
  );
  assert.match(
    step3Section,
    /\*\*Never\*\*\s+dispatch this step with\s*\n?\s*`subagent_type:\s*pr-context-gatherer`/,
    "Step 3 must explicitly prohibit dispatching itself as pr-context-gatherer"
  );

  // The prohibition must name pr-context-gatherer's one legitimate role
  // (Step 1's daemon-required deterministic context gather) so the ban reads
  // as scoped, not arbitrary.
  assert.match(
    step3Section,
    /pr-context-gatherer.{0,200}reserved for the daemon-required deterministic context gather/is,
    "Step 3 must explain pr-context-gatherer is reserved for Step 1's daemon-required context gather"
  );

  // The catalog (single source of truth for agent roles) must carry the
  // reciprocal prohibition: pr-context-gatherer is for Step 1 only, named
  // against the actual Step 3 role so the two files cannot drift apart.
  const gathererEntry = sectionBetween(
    catalog,
    "## Context Agents (dispatched once in step 1)",
    "## External Review Agents"
  );
  assert.match(
    gathererEntry,
    /Reserved for this role only/i,
    "tool-catalog.md's pr-context-gatherer entry must state it is reserved for its one role"
  );
  assert.match(
    gathererEntry,
    /PR Intent & Scope Analyst/,
    "tool-catalog.md must name Step 3's actual role when prohibiting pr-context-gatherer reuse"
  );

  // Preserve the pre-existing daemon-direct / interactive behaviors: this
  // narrow fix must not touch Step 1's own gather-ownership contract.
  assert.match(prReview, /Context Gatherer Owner: daemon-direct/);
  assert.match(prReview, /\*\*Otherwise\*\*[\s\S]*?skill:\s*"code-reviewer:pr-context"/);
});

function sectionBetween(content, startHeading, endHeading) {
  const startIdx = content.indexOf(startHeading);
  assert.ok(startIdx !== -1, `Missing heading: ${startHeading}`);
  const from = startIdx + startHeading.length;
  const endIdx = content.indexOf(endHeading, from);
  assert.ok(endIdx !== -1, `Missing heading: ${endHeading}`);
  return content.slice(from, endIdx);
}

test("tool-catalog Specialized Review Agents stay in lock-step with agent-dispatch's Domain Agents and real agent files", () => {
  const toolCatalog = readRepoFile(
    path.join(
      "code-reviewer",
      "skills",
      "pr-review",
      "reference",
      "tool-catalog.md"
    )
  );
  const agentDispatch = readRepoFile(
    path.join(
      "code-reviewer",
      "skills",
      "pr-review",
      "reference",
      "agent-dispatch.md"
    )
  );

  const catalogSection = sectionBetween(
    toolCatalog,
    "## Specialized Review Agents (dispatched in step 7)",
    "## Context Agents (dispatched once in step 1)"
  );
  const catalogAgents = new Set(
    [...catalogSection.matchAll(/^- `([a-z][\w:-]*)` - /gm)].map((m) => m[1])
  );

  const dispatchSection = sectionBetween(
    agentDispatch,
    "## Domain Agents (Step 7)",
    "<mandatory_dispatch>"
  );
  const dispatchAgents = new Set(
    [...dispatchSection.matchAll(/^- \*\*`([a-z][\w:-]*)`\*\*: /gm)].map(
      (m) => m[1]
    )
  );

  assert.ok(catalogAgents.size > 5, "Failed to parse tool-catalog.md agent names");
  assert.ok(dispatchAgents.size > 5, "Failed to parse agent-dispatch.md agent names");

  for (const name of dispatchAgents) {
    assert.ok(
      catalogAgents.has(name),
      `agent-dispatch.md dispatches '${name}' but tool-catalog.md's Specialized Review Agents list omits it`
    );
  }

  // Agents cataloged here but wired into the spine outside the Step 7 file-
  // classification dispatch matrix (e.g. dispatched directly by a later step).
  const catalogedButDispatchedElsewhere = new Set(["review-grader"]);
  for (const name of catalogAgents) {
    if (catalogedButDispatchedElsewhere.has(name)) {
      continue;
    }
    assert.ok(
      dispatchAgents.has(name),
      `tool-catalog.md catalogs '${name}' under Specialized Review Agents but agent-dispatch.md's Domain Agents list omits it`
    );
  }

  for (const name of catalogAgents) {
    if (name.includes(":")) {
      const [plugin, agentName] = name.split(":");
      assert.ok(
        existsSync(path.join(repoRoot, plugin, "agents", `${agentName}.md`)),
        `Catalogued agent '${name}' has no agent file at ${plugin}/agents/${agentName}.md`
      );
    } else {
      assert.ok(
        existsSync(path.join(repoRoot, "code-reviewer", "agents", `${name}.md`)),
        `Catalogued agent '${name}' has no agent file at code-reviewer/agents/${name}.md`
      );
    }
  }
});
