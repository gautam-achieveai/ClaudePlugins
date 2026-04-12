#!/usr/bin/env node
// =============================================================================
// Backlog Scanner — Main Orchestrator
// Zero dependencies. Run: node scan.mjs [--repo-root <path>]
//
// stdout = ScanResult JSON (for LLM/daemon)
// stderr = human-readable logs
// =============================================================================

import * as path from "node:path";
import { execSync } from "node:child_process";

import {
  resolveConfig, getDevIdentity, getCurrentSprint, querySprintWorkItems,
  fetchWorkItemChangedDate, fetchWorkItemFull, extractLinkedPrIds,
  isActivePr, fetchPrContext,
} from "./ado-api.mjs";

import { classifyWorkItem, lastHumanCommentTimestamp } from "./classify.mjs";

import {
  loadScanState, saveScanState, loadWorkItemState, saveWorkItemState,
  removeWorkItemState, listTrackedWorkItemIds, saveLastScanResult, logActivity,
  needsRescan,
} from "./state.mjs";

// ---------------------------------------------------------------------------
// Semaphore (concurrency limiter)
// ---------------------------------------------------------------------------

class Semaphore {
  #queue = [];
  #count;
  constructor(max) { this.#count = max; }

  acquire() {
    if (this.#count > 0) { this.#count--; return Promise.resolve(); }
    return new Promise((resolve) => this.#queue.push(resolve));
  }

  release() {
    const next = this.#queue.shift();
    if (next) next(); else this.#count++;
  }
}

// ---------------------------------------------------------------------------
// Work packet builders
// ---------------------------------------------------------------------------

function field(details, name) { return details.fields?.[name] ?? ""; }

function fieldStr(details, name) {
  const v = details.fields?.[name];
  if (!v) return "";
  return typeof v === "object" && v.displayName ? v.displayName : String(v);
}

function buildStage1Packet(details) {
  return {
    action: "plan",
    workItemId: details.id,
    title: fieldStr(details, "System.Title"),
    type: fieldStr(details, "System.WorkItemType"),
    description: field(details, "System.Description"),
    acceptanceCriteria: field(details, "Microsoft.VSTS.Common.AcceptanceCriteria"),
    areaPath: fieldStr(details, "System.AreaPath"),
    iterationPath: fieldStr(details, "System.IterationPath"),
    priority: details.fields?.["Microsoft.VSTS.Common.Priority"] ?? 0,
  };
}

function buildStage2bPacket(details, classification) {
  return {
    action: "revise_plan",
    workItemId: details.id,
    title: fieldStr(details, "System.Title"),
    planVersion: classification.planVersion,
    planText: classification.planText,
    feedback: classification.humanFeedback.map((c) => ({
      author: c.createdBy.displayName,
      date: c.createdDate,
      text: c.text,
    })),
  };
}

function buildStage2cdPacket(details, classification) {
  return {
    action: "implement",
    workItemId: details.id,
    title: fieldStr(details, "System.Title"),
    type: fieldStr(details, "System.WorkItemType"),
    description: field(details, "System.Description"),
    acceptanceCriteria: field(details, "Microsoft.VSTS.Common.AcceptanceCriteria"),
    planVersion: classification.planVersion,
    planText: classification.planText,
    approvalSource: classification.subState === "2d" ? "revision_cap" : "human",
    approverFeedback: classification.humanFeedback.map((c) => c.text).filter(Boolean),
  };
}

function buildStage3Packet(details, prContext, addressedThreadIds) {
  return {
    action: "babysit_pr",
    workItemId: details.id,
    prId: prContext.details.prId,
    sourceBranch: prContext.details.sourceBranch,
    targetBranch: prContext.details.targetBranch,
    mergeStatus: prContext.details.mergeStatus,
    reviewerVotes: prContext.details.reviewerVotes,
    builds: prContext.builds,
    unresolvedThreads: prContext.unresolvedThreads,
    addressedThreadIds,
  };
}

function buildSkipped(id, title, stage, subState, reason, detail) {
  return { workItemId: id, title, stage, subState, reason, detail };
}

// ---------------------------------------------------------------------------
// Process one work item
// ---------------------------------------------------------------------------

async function processWorkItem(wiId, config) {
  const { orgUrl, project, repository, stateDir } = config;
  const saved = loadWorkItemState(stateDir, wiId);

  try {
    // Quick check: anything changed?
    const changedDate = await fetchWorkItemChangedDate(orgUrl, project, wiId);

    if (!needsRescan(saved, changedDate) && saved) {
      return {
        packet: null,
        skipped: buildSkipped(
          wiId, saved.title, saved.stage, saved.subState,
          "no_changes", "No changes since last scan."
        ),
        updatedState: null,
      };
    }

    // Full fetch
    const { details, comments } = await fetchWorkItemFull(orgUrl, project, wiId);
    const title = fieldStr(details, "System.Title");
    const wiType = fieldStr(details, "System.WorkItemType");
    const adoState = fieldStr(details, "System.State");

    // Check linked PRs
    const linkedPrIds = extractLinkedPrIds(details.relations);
    let hasActiveLinkedPr = false;
    let activePrId = null;

    if (linkedPrIds.length > 0 && repository) {
      const checks = await Promise.all(
        linkedPrIds.map(async (prId) => ({
          prId,
          active: await isActivePr(orgUrl, project, repository, prId),
        }))
      );
      const found = checks.find((p) => p.active);
      if (found) { hasActiveLinkedPr = true; activePrId = found.prId; }
    }

    // Classify
    const classification = classifyWorkItem(comments, hasActiveLinkedPr);
    const lastHumanTs = lastHumanCommentTimestamp(comments);
    const now = new Date().toISOString();

    const updatedState = {
      id: wiId, title, type: wiType, adoState,
      stage: classification.stage,
      subState: classification.subState,
      planVersion: classification.planVersion,
      planPostedAt: classification.planPostedAt,
      lastHumanCommentAt: lastHumanTs,
      lastBotActionAt: saved?.lastBotActionAt ?? null,
      prId: activePrId ?? saved?.prId ?? null,
      worktreePath: saved?.worktreePath ?? null,
      branch: saved?.branch ?? null,
      addressedThreadIds: saved?.addressedThreadIds ?? [],
      errorCount: 0,
      lastScanAt: now,
    };

    const { stage, subState } = classification;

    // Stage 1: Fresh
    if (stage === 1) {
      return { packet: buildStage1Packet(details), skipped: null, updatedState };
    }

    // Stage 2a: Awaiting review — SKIP
    if (stage === 2 && subState === "2a") {
      return {
        packet: null,
        skipped: buildSkipped(wiId, title, stage, subState, "awaiting_plan_approval",
          `Plan v${classification.planVersion} posted, no human response yet.`),
        updatedState,
      };
    }

    // Stage 2b: Feedback
    if (stage === 2 && subState === "2b") {
      return { packet: buildStage2bPacket(details, classification), skipped: null, updatedState };
    }

    // Stage 2c/2d: Implement
    if (stage === 2 && (subState === "2c" || subState === "2d")) {
      return { packet: buildStage2cdPacket(details, classification), skipped: null, updatedState };
    }

    // Stage 3: PR babysitting
    if (stage === 3 && activePrId && repository) {
      const prContext = await fetchPrContext(orgUrl, project, repository, activePrId);

      // Quick healthy-PR check
      const allGreen = prContext.builds.every((b) => b.result === "succeeded");
      const noThreads = prContext.unresolvedThreads.length === 0;
      const allApproved = prContext.details.reviewerVotes.every(
        (v) => v.vote === "approved" || v.vote === "approvedWithSuggestions"
      );

      if (allGreen && noThreads && allApproved) {
        return {
          packet: null,
          skipped: buildSkipped(wiId, title, stage, null, "pr_healthy",
            `PR !${activePrId} — all builds green, threads resolved, approved.`),
          updatedState,
        };
      }

      return {
        packet: buildStage3Packet(details, prContext, updatedState.addressedThreadIds),
        skipped: null,
        updatedState,
      };
    }

    // Fallback
    return {
      packet: null,
      skipped: buildSkipped(wiId, title, stage, subState, "unhandled", `stage=${stage} subState=${subState}`),
      updatedState,
    };
  } catch (err) {
    const errorCount = (saved?.errorCount ?? 0) + 1;
    const title = saved?.title ?? `WI #${wiId}`;
    const now = new Date().toISOString();

    if (errorCount >= 3) {
      return {
        packet: null,
        skipped: buildSkipped(wiId, title, saved?.stage ?? 0, saved?.subState ?? null,
          "error_cap", `${errorCount} errors. Last: ${err.message}`),
        error: { workItemId: wiId, error: err.message },
        updatedState: saved ? { ...saved, errorCount, lastScanAt: now } : null,
      };
    }

    return {
      packet: null, skipped: null,
      error: { workItemId: wiId, error: err.message },
      updatedState: saved ? { ...saved, errorCount, lastScanAt: now } : null,
    };
  }
}

// ---------------------------------------------------------------------------
// Worktree inventory (read-only check)
// ---------------------------------------------------------------------------

function verifyWorktrees(stateDir, repoRoot) {
  let existing;
  try {
    const output = execSync("git worktree list --porcelain", {
      cwd: repoRoot, encoding: "utf-8",
    });
    existing = new Set(
      output.split("\n")
        .filter((l) => l.startsWith("worktree "))
        .map((l) => l.replace("worktree ", "").trim())
    );
  } catch { return; }

  for (const id of listTrackedWorkItemIds(stateDir)) {
    const state = loadWorkItemState(stateDir, id);
    if (!state?.worktreePath) continue;
    const resolved = path.resolve(repoRoot, state.worktreePath);
    if (!existing.has(resolved)) {
      console.error(`[Worktree] ${state.worktreePath} for WI #${id} gone, clearing.`);
      saveWorkItemState(stateDir, { ...state, worktreePath: null, branch: null });
    }
  }
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

function buildSummary(result) {
  const lines = [];
  lines.push(`Sprint: ${result.sprint} | Pass #${result.passCount} | ${result.timestamp}`);
  lines.push("");

  if (result.actionable.length > 0) {
    lines.push(`Actionable (${result.actionable.length}):`);
    for (const p of result.actionable) {
      switch (p.action) {
        case "plan":
          lines.push(`  #${p.workItemId}  ${p.title}  [Stage 1 — needs plan]`); break;
        case "revise_plan":
          lines.push(`  #${p.workItemId}  ${p.title}  [Stage 2b — v${p.planVersion}, ${p.feedback.length} feedback]`); break;
        case "implement":
          lines.push(`  #${p.workItemId}  ${p.title}  [Stage 2${p.approvalSource === "revision_cap" ? "d" : "c"} — ${p.approvalSource}]`); break;
        case "babysit_pr":
          lines.push(`  #${p.workItemId}  PR !${p.prId}  [Stage 3 — ${p.unresolvedThreads.length} threads, ${p.builds.filter((b) => b.result === "failed").length} failed]`); break;
      }
    }
    lines.push("");
  }

  if (result.skipped.length > 0) {
    lines.push(`Skipped (${result.skipped.length}):`);
    for (const s of result.skipped)
      lines.push(`  #${s.workItemId}  ${s.title}  [${s.reason}] ${s.detail}`);
    lines.push("");
  }

  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    for (const e of result.errors)
      lines.push(`  #${e.workItemId}  ${e.error}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();

  // Parse args
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf("--repo-root");
  const repoRoot = rootIdx >= 0 && args[rootIdx + 1]
    ? path.resolve(args[rootIdx + 1])
    : process.cwd();

  // Config
  const config = resolveConfig(repoRoot);
  config.stateDir = path.join(repoRoot, ".ai", "work-my-backlog");
  config.repoRoot = repoRoot;
  console.error(`[Scan] Org: ${config.orgUrl} | Project: ${config.project} | Repo: ${config.repository}`);
  console.error(`[Scan] State: ${config.stateDir}`);

  // State
  const scanState = loadScanState(config.stateDir);
  const dev = getDevIdentity(repoRoot);
  scanState.devName = dev.name;
  scanState.devEmail = dev.email;

  // Sprint
  const sprint = await getCurrentSprint(config.orgUrl, config.project);
  scanState.sprint = sprint.path;
  console.error(`[Scan] Sprint: ${sprint.path}`);

  // Query work items
  const wiIds = await querySprintWorkItems(config.orgUrl, config.project, sprint.path);
  console.error(`[Scan] Found ${wiIds.length} assigned work item(s).`);

  if (wiIds.length === 0) {
    const result = {
      timestamp: new Date().toISOString(), sprint: sprint.path,
      passCount: scanState.passCount + 1, devName: dev.name,
      actionable: [], skipped: [], errors: [],
      summary: "No open work items assigned to you.",
    };
    console.log(JSON.stringify(result, null, 2));
    scanState.passCount++;
    scanState.lastRun = new Date().toISOString();
    saveScanState(config.stateDir, scanState);
    saveLastScanResult(config.stateDir, result);
    return;
  }

  // Worktree check
  verifyWorktrees(config.stateDir, repoRoot);

  // Process all items (parallel, max 5)
  const sem = new Semaphore(5);
  const results = await Promise.allSettled(
    wiIds.map(async (wiId) => {
      await sem.acquire();
      try { return await processWorkItem(wiId, config); }
      finally { sem.release(); }
    })
  );

  // Collect
  const actionable = [];
  const skipped = [];
  const errors = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const wiId = wiIds[i];

    if (r.status === "rejected") {
      errors.push({ workItemId: wiId, error: r.reason?.message ?? "Unknown" });
      continue;
    }

    const { packet, skipped: skip, error, updatedState } = r.value;
    if (packet) actionable.push(packet);
    if (skip) skipped.push(skip);
    if (error) errors.push(error);
    if (updatedState) saveWorkItemState(config.stateDir, updatedState);
  }

  // Clean up items no longer in sprint
  const activeSet = new Set(wiIds);
  for (const id of listTrackedWorkItemIds(config.stateDir)) {
    if (!activeSet.has(id)) {
      console.error(`[Scan] WI #${id} no longer in sprint, removing.`);
      removeWorkItemState(config.stateDir, id);
    }
  }

  // Save state
  scanState.passCount++;
  scanState.lastRun = new Date().toISOString();
  saveScanState(config.stateDir, scanState);

  // Build result
  const scanResult = {
    timestamp: new Date().toISOString(), sprint: sprint.path,
    passCount: scanState.passCount, devName: dev.name,
    actionable, skipped, errors, summary: "",
  };
  scanResult.summary = buildSummary(scanResult);

  saveLastScanResult(config.stateDir, scanResult);
  logActivity(config.stateDir, {
    event: "scan_complete", pass: scanState.passCount,
    actionable: actionable.length, skipped: skipped.length,
    errors: errors.length, durationMs: Date.now() - startTime,
  });

  // Output
  console.log(JSON.stringify(scanResult, null, 2));
  console.error("\n" + scanResult.summary);
  console.error(`\n[Scan] Done in ${Date.now() - startTime}ms.`);
}

main().catch((err) => {
  console.error("[Scan] Fatal:", err);
  process.exit(1);
});
