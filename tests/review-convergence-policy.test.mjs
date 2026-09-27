import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function readRepoFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readRepoBytes(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath));
}

function extractPowerShellHereString(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(
    new RegExp(`"${escapedKey}"\\s*=\\s*@"\\r?\\n([\\s\\S]*?)\\r?\\n"@`)
  );
  assert.ok(match, `Missing PowerShell here-string template: ${key}`);
  return match[1];
}

// pr-review is a progressive-disclosure skill: SKILL.md is the workflow spine
// and per-step contracts live in reference files loaded at their step. The
// policy assertions apply to the skill as a whole, so concatenate the spine
// with the reference files that carry its contracts.
const prReview = [
  readRepoFile("code-reviewer/skills/pr-review/SKILL.md"),
  readRepoFile("code-reviewer/skills/pr-review/reference/agent-guidance.md"),
  readRepoFile("code-reviewer/skills/pr-review/reference/grading-rubric.md"),
  readRepoFile("code-reviewer/skills/pr-review/reference/publish-and-track.md"),
].join("\n");
const reviewGrader = readRepoFile("code-reviewer/agents/review-grader.md");
const reReview = readRepoFile(
  "code-reviewer/skills/pr-review/reference/re-review-workflow.md"
);
const postReview = readRepoFile(
  "code-reviewer/skills/post-pr-review/SKILL.md"
);
const outputFormat = readRepoFile(
  "code-reviewer/skills/pr-review/reference/output-format.md"
);
const setupScript = readRepoFile(
  "code-reviewer/skills/pr-review/scripts/Start-PRReview.ps1"
);
const setupShellScript = readRepoFile(
  "code-reviewer/skills/pr-review/scripts/Start-PRReview.sh"
);
const threadState = readRepoFile(
  "code-reviewer/references/review-thread-state-machine.md"
);
const adoThreadState = readRepoFile(
  "ado/references/review-thread-state-machine.md"
);

const intentFields = [
  "statedProblem",
  "acceptanceCriteria",
  "explicitNonGoals",
  "deliveredApproach",
  "goalCoverage",
  "solutionDirection",
  "evidence",
];

const findingFields = [
  "id",
  "severity",
  "blocker",
  "category",
  "file",
  "line",
  "issue",
  "whyItMatters",
  "requiredOutcome",
  "suggestedPath",
  "doneWhen",
];

const reviewThreadFields = [
  "findingId",
  "threadId",
  "status",
  "blocker",
  "authorAttemptCount",
  "lastAuthorAttemptCommit",
  "pendingAction",
  "actionId",
  "lastCompletedActionId",
  "requiredOutcome",
  "doneWhen",
  "evidence",
];

const closedThreadArchiveFields = [
  "findingId",
  "threadId",
  "status",
  "blocker",
  "closedAt",
  "lastCompletedActionId",
];

test("every scanning specialist has the concise hypothesis evidence contract", () => {
  const supporting = new Set([
    "code-reviewer", "pr-context-gatherer", "finding-verifier", "review-adjudicator",
    "review-grader", "review-performance-judge", "root-cause-synthesizer", "remediation-planner",
    "post-pr-review", "update-pr-tracking", "review-pending-prs",
    "review-retrospective", "apply-review-learning",
  ]);
  for (const file of readdirSync(path.join(repoRoot, "code-reviewer/agents")).filter((file) => file.endsWith(".md"))) {
    if (supporting.has(file.slice(0, -3))) continue;
    const prompt = readRepoFile(`code-reviewer/agents/${file}`);
    for (const term of ["claim", "trigger", "mechanism", "consequence", "disconfirmation", "evidence status"]) {
      assert.ok(prompt.includes(term), `${file}: missing ${term}`);
    }
    assert.match(prompt, /[Nn]o supported\s+finding/);
    assert.match(prompt, /unresolved/i);
  }
});

test("correctness keeps lifecycle traces intact and delegates only through the orchestrator", () => {
  const correctness = readRepoFile("code-reviewer/agents/correctness-review.md");
  const guidance = readRepoFile("code-reviewer/skills/pr-review/reference/agent-guidance.md");
  assert.match(correctness, /first invocation/i);
  assert.match(correctness, /captured before initialization/);
  assert.match(correctness, /Do not spawn reviewers/);
  assert.match(correctness, /investigationRequests\[\]/);
  for (const field of ["question", "scope", "reasonToSplit", "existingOwner", "stopCondition"]) {
    assert.ok(guidance.includes(field), field);
  }
  assert.match(guidance, /Split independent investigations/);
  assert.match(guidance, /do not recursively request another team/);
  assert.match(guidance, /per-lane finding cap/);
});

test("platform claims need version evidence rather than specialist agreement", () => {
  for (const file of ["agent-contract-review", "schema-compatibility-review", "finding-verifier", "nscript-review", "orleans-review"]) {
    const prompt = readRepoFile(`code-reviewer/agents/${file}.md`);
    assert.match(prompt, /authoritative documentation|authoritative\s+documentation|authoritative version-specific documentation/);
    assert.match(prompt, /minimal\s+reproduction/);
    assert.match(prompt, /unresolved|UNPROVEN/);
  }
  const verifier = readRepoFile("code-reviewer/agents/finding-verifier.md");
  assert.doesNotMatch(verifier, /Default to `FALSE_POSITIVE`/);
  assert.match(verifier, /incomplete search or inaccessible dependency is `UNPROVEN`/);
});

test("split verification retains every check before any candidate is discarded", () => {
  const filter = readRepoFile("code-reviewer/skills/pr-review/reference/filter-and-verify.md");
  const schema = readRepoFile("code-reviewer/skills/pr-review/reference/finding-schema.md");
  const adjudicator = readRepoFile("code-reviewer/agents/review-adjudicator.md");
  assert.match(filter, /even if the first refutes it/);
  assert.match(filter, /before\s+dropping or grading, at any review size/);
  assert.match(filter, /verification\.checks\[\]/);
  assert.match(schema, /FALSE_POSITIVE`\/`UNPROVEN` split/);
  assert.match(schema, /All required checks must be\s+`TRUE_POSITIVE`/);
  assert.match(adjudicator, /Never use `WITHDRAWN` for missing evidence/);
  assert.match(prReview, /Do not repeat an unresolved adjudication without new evidence/);
});

test("test coverage uses escaped regressions without empty-review padding", () => {
  const prompt = readRepoFile("code-reviewer/agents/test-coverage-review.md");
  assert.match(prompt, /shared\/inherited/);
  assert.match(prompt, /plausible broken implementation/);
  assert.match(prompt, /protection the proposed assertion adds/);
  assert.doesNotMatch(prompt, /Include 3-4 rated items only if/);
  assert.doesNotMatch(prompt, /Every change deserves at least a basic test/);
  assert.doesNotMatch(prReview, /Flag new public methods without tests/);
});

test("merge decisions depend on deferral risk rather than small fixes or schema defaults", () => {
  const schemaSkill = readRepoFile("code-reviewer/skills/schema-compatibility-review/SKILL.md");
  const schemaAgent = readRepoFile("code-reviewer/agents/schema-compatibility-review.md");
  const wrapper = readRepoFile("code-reviewer/agents/code-reviewer.md");
  assert.match(reviewGrader, /Deferral risk, not remediation size/);
  assert.match(reviewGrader, /pre-enablement prerequisite is not\s+automatically a merge blocker/);
  assert.doesNotMatch(reviewGrader, /Remediation size routes borderline Mediums/);
  for (const text of [schemaSkill, schemaAgent]) {
    assert.doesNotMatch(text, /Default backward-incompatible|\*\*CRITICAL\*\* by default|cheapest\s+moment to fix/);
  }
  assert.doesNotMatch(wrapper, /Assume one defect is hiding|block by default/);
});

test("publication keeps corrected qualifiers and unresolved claims separate from finding threads", () => {
  const publication = readRepoFile("code-reviewer/skills/pr-review/reference/publish-and-track.md");
  for (const field of ["trigger", "disconfirmation", "exposure", "evidenceStatus", "candidateSources"]) {
    assert.ok(reviewGrader.includes(field), `grader: ${field}`);
    assert.ok(publication.includes(field), `publication: ${field}`);
    assert.ok(postReview.includes(field), `posting: ${field}`);
  }
  assert.match(publication, /Only supported final findings require new thread records/);
  assert.match(postReview, /unresolvedClaims\[\]/);
  assert.match(postReview, /no new inline-thread action/);
  assert.match(outputFormat, /Material Unresolved Claims/);
  assert.match(outputFormat, /Exact Missing Evidence/);
});

test("small-delta publication preserves unresolved claim state across re-reviews", () => {
  const delta = postReview.match(/<small_delta_summary>([\s\S]*?)<\/small_delta_summary>/)?.[1];
  assert.ok(delta, "missing small-delta publication policy");
  assert.match(delta, /unresolvedClaims/);
  for (const transition of ["additions", "changes", "resolutions", "empty"]) {
    assert.ok(delta.includes(transition), `missing ${transition} transition guard`);
  }
  assert.match(delta, /cannot be recovered or compared[\s\S]*?disable small-delta/);
  assert.match(delta, /unchanged[\s\S]*?small-delta mode/);
  assert.match(delta, /On GitHub[\s\S]*?Latest Delta/);
  assert.match(delta, /On ADO, use `smallDeltaSummary`/);
  assert.match(reReview, /Recover[\s\S]*?`unresolvedClaims\[\]`/);
  const callerGuard = reReview.match(/Disable small-delta mode when state changes[\s\S]*?(?=\n- \*\*)/)?.[0];
  assert.ok(callerGuard);
  assert.match(callerGuard, /unresolvedClaims/);
  assert.match(callerGuard, /unknown[\s\S]*?full/);
  assert.match(postReview, /Persist[\s\S]*?`unresolvedClaims\[\]`[\s\S]*?explicit empty array/);
  assert.match(outputFormat, /"unresolvedClaims": \[\]/);
});

test("offline review evaluation includes paired controls and valid fixture references", () => {
  const skillPath = "code-reviewer/skills/pr-review";
  const suite = JSON.parse(readRepoFile(`${skillPath}/evals/evals.json`));
  assert.equal(suite.skill_name, "pr-review");
  for (const evaluation of suite.evals) {
    assert.ok(evaluation.expectations.length > 0);
    for (const file of evaluation.files) {
      const { cases } = JSON.parse(readRepoFile(`${skillPath}/${file}`));
      const ids = new Set(cases.map(({ id }) => id));
      assert.equal(ids.size, cases.length);
      for (const id of [
        "export-first-use", "export-safe-order", "platform-supported", "platform-unknown",
        "shared-tests", "test-escaped-regression", "development-token", "disabled-unconditional-effect",
        "split-verification", "single-causal-trace", "independent-investigations",
      ]) assert.ok(ids.has(id), id);
      assert.ok(cases.every(({ evidence, candidate, task }) => evidence && candidate && task));
    }
  }
});

test("review decisions stay anchored to problem and solution fit", () => {
  const skillSpine = readRepoFile("code-reviewer/skills/pr-review/SKILL.md");
  assert.match(skillSpine, /## Rigorous Reviews That Converge/);
  assert.match(skillSpine, /guardians of engineering quality and constructive\s+mentors/);
  assert.match(skillSpine, /evidence over preference/);
  assert.match(skillSpine, /agents own substantive judgments/);
  assert.match(skillSpine, /Does the code solve the stated problem\?/);
  assert.match(skillSpine, /Is the solution in the right ballpark\?/);
  assert.match(skillSpine, /What must change before merge\?/);
  assert.match(skillSpine, /How can each blocker close\?/);

  for (const content of [prReview, reviewGrader]) {
    assert.match(content, /Does the (?:code|PR) solve (?:the|its) stated problem\?/i);
    assert.match(content, /right ballpark/i);
    assert.match(content, /Review Intent/);
    assert.match(content, /SOLVED \| PARTIALLY_SOLVED \| NOT_SOLVED \| UNCLEAR/);
    assert.match(
      content,
      /RIGHT_BALLPARK \| FUNDAMENTALLY_MISALIGNED \| UNCLEAR/
    );
  }

  assert.match(prReview, /review comments themselves never redefine it/i);
  assert.match(reviewGrader, /Severity and blocking are separate/);
  assert.match(reviewGrader, /OUT_OF_SCOPE/);
  assert.match(reviewGrader, /UNSUBSTANTIATED/);
});

test("blocking feedback has an objective closure contract", () => {
  for (const content of [
    prReview,
    reviewGrader,
    postReview,
    outputFormat,
    setupScript,
    setupShellScript,
    threadState,
    adoThreadState,
  ]) {
    assert.match(content, /Required Outcome/i);
    assert.match(content, /Done When/i);
  }

  assert.match(postReview, /\[NON-BLOCKING\]/);
  assert.match(postReview, /Low findings[^\n]*do not post inline/i);
  assert.match(postReview, /do not reclassify findings while posting/i);
  assert.match(outputFormat, /Shortest Path to Approval/);
});

test("review contracts round-trip without reconstructing fields", () => {
  for (const content of [
    prReview,
    reviewGrader,
    postReview,
    outputFormat,
    setupScript,
    setupShellScript,
  ]) {
    for (const field of intentFields) {
      assert.ok(content.includes(field), `Missing Review Intent field: ${field}`);
    }
  }

  for (const content of [prReview, reviewGrader, postReview]) {
    for (const field of findingFields) {
      assert.ok(content.includes(field), `Missing final finding field: ${field}`);
    }
  }

  for (const content of [
    prReview,
    postReview,
    outputFormat,
    setupScript,
    setupShellScript,
  ]) {
    for (const field of reviewThreadFields) {
      assert.ok(content.includes(field), `Missing review-thread field: ${field}`);
    }
  }

  assert.match(prReview, /Merge by stable `id`/);
  assert.match(reviewGrader, /exact posting schema/);
  assert.match(
    postReview,
    /Every final finding ID is unique and has exactly one\s+`reviewThreads\[\]` record/i
  );
});

test("blocker states have deterministic verdict and approval outcomes", () => {
  const substantiveBlockerStates = new Set([
    "NEW",
    "ACTIVE",
    "RESOLVED",
    "HANDOFF_REQUIRED",
  ]);
  const closureCandidateStates = new Set(["VERIFIED", "WONT_FIX_ACCEPTED"]);

  for (const [state, blocksVerdict, permitsProviderApproval] of [
    ["NEW", true, false],
    ["ACTIVE", true, false],
    ["RESOLVED", true, false],
    ["VERIFIED", false, false],
    ["WONT_FIX_ACCEPTED", false, false],
    ["HANDOFF_REQUIRED", true, false],
    ["CLOSED", false, true],
  ]) {
    assert.equal(substantiveBlockerStates.has(state), blocksVerdict, state);
    assert.equal(state === "CLOSED", permitsProviderApproval, state);
    assert.equal(
      closureCandidateStates.has(state),
      state === "VERIFIED" || state === "WONT_FIX_ACCEPTED",
      state
    );
  }

  assert.match(
    postReview,
    /`substantiveBlockers`:[\s\S]*`NEW`, `ACTIVE`, `RESOLVED`, or\s+`HANDOFF_REQUIRED`/i
  );
  assert.match(
    reReview,
    /every blocker is `VERIFIED`, `WONT_FIX_ACCEPTED`, or `CLOSED`/i
  );
  assert.match(
    reReview,
    /different\s+from\s+`lastAuthorAttemptCommit`/i
  );
  assert.match(reReview, /status = HANDOFF_REQUIRED/i);
  assert.match(postReview, /Apply each pending action exactly once/i);
  assert.match(postReview, /`NONE`: do nothing/i);
  assert.match(
    postReview,
    /No blocker remains in `reviewThreads\[\]`[\s\S]*newly closed blocker is in\s+`closedThreadArchive\[\]`/i
  );
  assert.match(threadState, /`RESOLVED` remains blocking/i);
  assert.match(adoThreadState, /`RESOLVED` remains blocking/i);
});

test("provider posting preserves one canonical summary", () => {
  assert.match(postReview, /GraphQL pullRequest\.reviewThreads/);
  assert.match(postReview, /REST pulls\/<prNumber>\/comments alone does not expose/);
  assert.match(postReview, /Retain every unresolved thread even when\s+`isOutdated` is true/i);
  assert.match(postReview, /gh api --paginate/);
  assert.match(postReview, /mcp__azure-devops__replyToComment/);
  assert.match(
    postReview,
    /PATCH repos\/<owner>\/<repo>\/issues\/comments\/<summaryCommentId>/
  );
  assert.doesNotMatch(
    postReview,
    /pulls\/<prNumber>\/comments\/<rootCommentId>\/replies/
  );
  assert.match(
    postReview,
    /Require `reviewIntent`, `reviewThreads`, `closedThreadArchive`,\s+`unresolvedClaims\[\]`, and verdict to\s+be unchanged/i
  );
  assert.match(postReview, /summary persistence fails[\s\S]*do not approve/i);
  assert.match(postReview, /at or below 60,000 characters/i);
  assert.match(postReview, /`closedThreadArchive\[\]`/);
  assert.match(postReview, /Remove already-posted `Optional Follow-up` prose/i);
  assert.match(
    postReview,
    /remove exactly one compact archive entry[\s\S]*re-render, and re-measure[\s\S]*Stop pruning\s+immediately/i
  );
  assert.match(postReview, /`closedThreadArchiveOmittedCount`/);
  assert.match(postReview, /specific `summary-body-overflow` error/i);
  assert.match(
    postReview,
    /After the bounded pruning loop, measure the complete final comment body/i
  );
  assert.match(reReview, /Never reset or decrement the recovered omission count/i);
  for (const content of [prReview, postReview, reReview, outputFormat]) {
    assert.match(content, /closedThreadArchiveOmittedCount/);
  }
  for (const field of closedThreadArchiveFields) {
    assert.ok(outputFormat.includes(field), `Missing archive field: ${field}`);
  }
  assert.match(postReview, /sort ascending\s+by\s+`closedAt`[\s\S]*tie-break by `findingId`/i);
  assert.match(
    postReview,
    /Never truncate[\s\S]*active blocker closure\s+criteria/i
  );
  assert.match(outputFormat, /<summary>Review state \(machine-readable\)<\/summary>/);
  assert.match(outputFormat, /## Closed Thread Archive/);
  assert.match(outputFormat, /"closedThreadArchiveOmittedCount": 0/);
  assert.match(outputFormat, /"closedAt": "2026-08-06T12:00:00Z"/);
  assert.match(
    reReview,
    /on GitHub, PATCH the canonical flat issue comment in place/i
  );
  assert.doesNotMatch(reReview, /always reply to the existing review summary/i);
  assert.match(postReview, /GitHub: new issue comment \| updated canonical issue comment/i);
});

test("finding parity and provider actions are retry-safe", () => {
  assert.match(postReview, /Every final finding ID is unique/i);
  assert.match(
    postReview,
    /has exactly one `reviewThreads\[\]` record/i
  );
  assert.match(
    postReview,
    /identical `blocker`,\s+`requiredOutcome`, and `doneWhen`/i
  );
  assert.match(postReview, /review-action:<actionId>/);
  assert.match(postReview, /Reject `status = CLOSED` in `reviewThreads\[\]`/i);
  assert.doesNotMatch(
    postReview,
    /status: NEW \| ACTIVE \| RESOLVED \| VERIFIED \| WONT_FIX_ACCEPTED \| CLOSED/
  );
  assert.match(postReview, /actionId == lastCompletedActionId/);
  assert.match(postReview, /already-resolved provider thread as successful/i);
  assert.match(postReview, /clear `actionId`/i);
  assert.match(
    postReview,
    /provider already contains the action marker[\s\S]*reset `pendingAction` to `NONE`/i
  );
  assert.match(
    postReview,
    /`pendingAction = NONE` requires `actionId = null`/i
  );
  assert.match(
    postReview,
    /one atomic canonical-state\s+transition:[\s\S]*`lastCompletedActionId`[\s\S]*`pendingAction = NONE`[\s\S]*`actionId = null`/i
  );
  for (const content of [threadState, adoThreadState]) {
    assert.match(content, /Provider actions are reconciled atomically/i);
  }
  assert.match(reReview, /lastCompletedActionId/);
  assert.match(
    outputFormat,
    /"pendingAction": "NONE",\s+"actionId": null,\s+"lastCompletedActionId": "F-001:REPLY:abc123:1"/i
  );
});

test("canonical and ADO question threads share a non-blocking lifecycle", () => {
  for (const content of [threadState, adoThreadState]) {
    assert.match(content, /\*\*Question\*\*/);
    assert.match(content, /\*\*Answered\*\*/);
    assert.match(content, /## Question Thread Lifecycle/);
    assert.match(content, /### Question → Answered/);
    assert.match(content, /### Answered → Closed/);
    assert.match(content, /questions are (?:ALWAYS|always) non-blocking/i);
    assert.match(content, /separate finding/i);
  }

  assert.equal(
    adoThreadState,
    threadState,
    "ADO lifecycle reference drifted from the canonical copy"
  );
  assert.deepEqual(
    readRepoBytes("ado/references/review-thread-state-machine.md"),
    readRepoBytes("code-reviewer/references/review-thread-state-machine.md"),
    "ADO lifecycle reference differs at the byte level"
  );
});

test("verdicts use one enum and optional comments can still approve", () => {
  for (const content of [prReview, reviewGrader, postReview, outputFormat]) {
    assert.match(content, /APPROVE_WITH_COMMENTS/);
    assert.match(content, /REQUEST_CHANGES/);
  }

  assert.match(
    postReview,
    /Verdict is `APPROVE` or `APPROVE_WITH_COMMENTS`/
  );
  assert.match(postReview, /Never accept `COMMENT` as\s+a verdict value/i);
  assert.match(prReview, /Do not invent a fourth `COMMENT` verdict/);
});

test("re-review converges without severity-only or repeated gates", () => {
  assert.match(reReview, /Two-attempt convergence limit per blocker/);
  assert.match(reReview, /do not start a\s+third asynchronous AI loop/i);
  assert.match(
    reReview,
    /Severity\s+alone\s+does\s+not\s+determine\s+this\s+gate/i
  );
  assert.match(threadState, /Stop repeated asynchronous debate/);
  assert.match(adoThreadState, /Stop repeated asynchronous debate/);

  const activePolicy = [
    prReview,
    reviewGrader,
    reReview,
    postReview,
    outputFormat,
    threadState,
    adoThreadState,
  ].join("\n");

  for (const obsoleteRule of [
    "default posture is **skeptical**",
    "Max 5 re-review iterations",
    "If ANY CRITICAL, HIGH, or MEDIUM thread",
    "LOW findings** → post last",
    "convention violations should default toward REQUEST CHANGES",
    "Significant simplification available",
    "No Critical/High/Medium issues",
  ]) {
    assert.ok(
      !activePolicy.toLowerCase().includes(obsoleteRule.toLowerCase()),
      `Obsolete review rule remains: ${obsoleteRule}`
    );
  }
});

test("Linux setup script preserves the review artifact contract", () => {
  for (const option of [
    "--pr-number",
    "--source-branch",
    "--base-branch",
    "--pr-title",
    "--pr-author",
    "--pr-description",
    "--skip-worktree",
  ]) {
    assert.ok(setupShellScript.includes(option), `Missing Bash option: ${option}`);
  }

  for (const artifact of [
    "README.md",
    "full_diff.patch",
    "changed_files.txt",
    "code_quality_analysis.md",
    "security_concerns.md",
    "performance_review.md",
    "testing_assessment.md",
    "pr_feedback.md",
    "recommendations.md",
  ]) {
    assert.ok(
      setupShellScript.includes(artifact),
      `Missing Bash review artifact: ${artifact}`
    );
  }

  assert.match(setupShellScript, /^#!\/usr\/bin\/env bash/);
  assert.match(setupShellScript, /set -Eeuo pipefail/);
  assert.match(
    setupShellScript,
    /source_branch=\$\{source_branch#refs\/heads\/\}/
  );
  assert.match(setupShellScript, /Could not refresh base branch from origin/);
  assert.match(setupShellScript, /Could not refresh source branch from origin/);
  assert.doesNotMatch(setupShellScript, /using any existing remote-tracking ref/i);
  assert.match(setupShellScript, /git -C "\$\{repo_root\}" worktree add --detach/);
  assert.match(setupShellScript, /Existing path is not the registered review worktree/);
  assert.match(setupShellScript, /git -C "\$\{repo_root\}" worktree list --porcelain/);
  assert.match(setupShellScript, /Existing path is not registered by the parent repository/);
  assert.match(setupShellScript, /Existing worktree HEAD does not match/);
  assert.match(setupShellScript, /Current HEAD differs from origin\/\$\{source_branch\}/);
  assert.match(setupShellScript, /HEAD must already equal\s+the fetched source-branch tip/i);
  assert.match(setupShellScript, /bash \.\/Start-PRReview\.sh/);
  assert.match(setupShellScript, /if \(\(\$\{#changed_files\[@\]\} > 0\)\); then/);
  assert.match(setupShellScript, /if \(\(\$\{#changed_files\[@\]\} == 0\)\); then/);
  for (const content of [setupScript, setupShellScript]) {
    assert.match(content, /<summary>Review state \(machine-readable\)<\/summary>/);
    assert.match(content, /Closed Thread Archive/);
  }
  const powerShellFeedback = extractPowerShellHereString(
    setupScript,
    "pr_feedback.md"
  );
  assert.match(
    powerShellFeedback,
    /~~~json\r?\n\{\r?\n\s+"closedThreadArchiveOmittedCount"/
  );
  assert.doesNotMatch(powerShellFeedback, /\\`\\`\\`/);
});
