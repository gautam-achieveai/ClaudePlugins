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
import { pathToFileURL } from "node:url";

import {
  resolveConfig,
  getDevIdentity,
  queryAssignedWorkItems,
  fetchWorkItemChangedDate,
  fetchWorkItemFull,
  fetchPrContext,
} from "./github-api.mjs";

import { classifyWorkItem, lastHumanCommentTimestamp } from "./classify.mjs";

import {
  loadScanState, saveScanState, loadWorkItemState, saveWorkItemState,
  removeWorkItemState, listTrackedWorkItemIds, saveLastScanResult, logActivity,
  needsRescan,
} from "./state.mjs";

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

function buildStage1Packet(details) {
  return {
    action: "plan",
    workItemId: details.id,
    title: details.title,
    type: details.type,
    description: details.body,
    acceptanceCriteria: "",
    labels: details.labels,
    milestone: details.milestone,
    iteration: details.currentIteration?.title || null,
    projectItems: details.projectItems,
    url: details.url,
  };
}

function buildStage2bPacket(details, classification) {
  return {
    action: "revise_plan",
    workItemId: details.id,
    title: details.title,
    planVersion: classification.planVersion,
    planText: classification.planText,
    feedback: classification.humanFeedback.map((c) => ({
      author: c.createdBy.displayName,
      date: c.createdDate,
      text: c.text,
    })),
    url: details.url,
  };
}

function buildStage2cdPacket(details, classification) {
  return {
    action: "implement",
    workItemId: details.id,
    title: details.title,
    type: details.type,
    description: details.body,
    acceptanceCriteria: "",
    labels: details.labels,
    milestone: details.milestone,
    iteration: details.currentIteration?.title || null,
    projectItems: details.projectItems,
    planVersion: classification.planVersion,
    planText: classification.planText,
    approvalSource: classification.subState === "2d" ? "revision_cap" : "human",
    approverFeedback: classification.humanFeedback.map((c) => c.text).filter(Boolean),
    url: details.url,
  };
}

export function buildStage3Packet(details, prContext, addressedThreadIds) {
  return {
    action: "babysit_pr",
    workItemId: details.id,
    title: details.title,
    prId: prContext.details.prId,
    prUrl: prContext.details.url,
    sourceBranch: prContext.details.sourceBranch,
    targetBranch: prContext.details.targetBranch,
    mergeStatus: prContext.details.mergeStatus,
    isDraft: prContext.details.isDraft,
    reviewDecision: prContext.details.reviewDecision,
    reviewerVotes: prContext.details.reviewerVotes,
    builds: prContext.builds,
    unresolvedThreads: prContext.unresolvedThreads,
    reviewSummaries: prContext.reviewSummaries || [],
    conversationComments: prContext.conversationComments || [],
    addressedThreadIds,
    url: details.url,
  };
}

function buildSkipped(id, title, stage, subState, reason, detail) {
  return { workItemId: id, title, stage, subState, reason, detail };
}

function activeLinkedPr(details) {
  return (details.linkedPrs || [])
    .filter((pr) => pr.state === "OPEN")
    .sort((a, b) => b.number - a.number)[0] || null;
}

function summarizeIterationScope(workItems) {
  const titles = [...new Set(
    (workItems || [])
      .map((workItem) => workItem?.currentIteration?.title)
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));

  return titles.join(", ") || "current-iteration";
}

export function selectScanScope(workItems) {
  const currentIterationItems = (workItems || [])
    .filter((workItem) => workItem?.currentIteration?.isCurrent);

  if (currentIterationItems.length === 0) {
    return {
      items: workItems || [],
      iteration: "assigned-open-issues",
    };
  }

  return {
    items: currentIterationItems,
    iteration: summarizeIterationScope(currentIterationItems),
  };
}

export function shouldSkipStage3(prId, prContext) {
  const failedChecks = prContext.builds.filter((build) => build.result === "fail");
  const pendingChecks = prContext.builds.filter((build) => build.result === "pending");
  const hasChangesRequested = prContext.details.reviewDecision === "CHANGES_REQUESTED";
  const noThreads = prContext.unresolvedThreads.length === 0;
  const noTopLevelFeedback =
    (prContext.reviewSummaries?.length ?? 0) === 0 &&
    (prContext.conversationComments?.length ?? 0) === 0;
  const isDraft = Boolean(prContext.details.isDraft);
  const hasConflicts = Boolean(prContext.details.mergeStatus?.hasConflicts);

  if (!isDraft && !hasConflicts && failedChecks.length === 0 && pendingChecks.length > 0 && noThreads && noTopLevelFeedback && !hasChangesRequested) {
    return {
      reason: "pr_waiting_on_checks",
      detail: `PR #${prId} has only pending checks.`,
    };
  }

  if (!isDraft && !hasConflicts && failedChecks.length === 0 && pendingChecks.length === 0 && noThreads && noTopLevelFeedback && !hasChangesRequested) {
    return {
      reason: "pr_waiting_on_humans",
      detail: `PR #${prId} has no actionable automation work left.`,
    };
  }

  return null;
}

const ACTION_PRIORITY = {
  babysit_pr: 0,
  implement: 1,
  revise_plan: 2,
  plan: 3,
};

export function sortActionablePackets(packets) {
  return (packets || [])
    .map((packet, index) => ({ packet, index }))
    .sort((left, right) => {
      const priorityDelta =
        (ACTION_PRIORITY[left.packet.action] ?? Number.MAX_SAFE_INTEGER) -
        (ACTION_PRIORITY[right.packet.action] ?? Number.MAX_SAFE_INTEGER);

      return priorityDelta !== 0 ? priorityDelta : left.index - right.index;
    })
    .map(({ packet }) => packet);
}

async function processWorkItem(workItem, config) {
  const wiId = typeof workItem === "number" ? workItem : workItem.number;
  const saved = loadWorkItemState(config.stateDir, wiId);

  try {
    const changedDate = typeof workItem === "object" && (workItem.scanUpdatedAt || workItem.updatedAt)
      ? (workItem.scanUpdatedAt || workItem.updatedAt)
      : await fetchWorkItemChangedDate(config, wiId);

    if (!needsRescan(saved, changedDate) && saved) {
      return {
        packet: null,
        skipped: buildSkipped(
          wiId,
          saved.title,
          saved.stage,
          saved.subState,
          "no_changes",
          "No changes since last scan."
        ),
        updatedState: null,
      };
    }

    const { details, comments } = await fetchWorkItemFull(config, wiId);
    const linkedPr = activeLinkedPr(details);
    const classification = classifyWorkItem(comments, Boolean(linkedPr));
    const lastHumanTs = lastHumanCommentTimestamp(comments);
    const now = new Date().toISOString();

    const updatedState = {
      id: wiId,
      title: details.title,
      type: details.type,
      issueState: details.state,
      stage: classification.stage,
      subState: classification.subState,
      planVersion: classification.planVersion,
      planPostedAt: classification.planPostedAt,
      lastHumanCommentAt: lastHumanTs,
      lastBotActionAt: saved?.lastBotActionAt ?? null,
      prId: linkedPr?.number ?? saved?.prId ?? null,
      worktreePath: saved?.worktreePath ?? null,
      branch: saved?.branch ?? null,
      addressedThreadIds: saved?.addressedThreadIds ?? [],
      errorCount: 0,
      lastScanAt: now,
      iteration: details.currentIteration?.title ?? null,
      url: details.url,
    };

    const { stage, subState } = classification;

    if (stage === 1) {
      return { packet: buildStage1Packet(details), skipped: null, updatedState };
    }

    if (stage === 2 && subState === "2a") {
      return {
        packet: null,
        skipped: buildSkipped(
          wiId,
          details.title,
          stage,
          subState,
          "awaiting_plan_approval",
          `Plan v${classification.planVersion} posted, no human response yet.`
        ),
        updatedState,
      };
    }

    if (stage === 2 && subState === "2b") {
      return { packet: buildStage2bPacket(details, classification), skipped: null, updatedState };
    }

    if (stage === 2 && (subState === "2c" || subState === "2d")) {
      return { packet: buildStage2cdPacket(details, classification), skipped: null, updatedState };
    }

    if (stage === 3 && linkedPr) {
      const prContext = await fetchPrContext(config, linkedPr.number);
      const stage3Skip = shouldSkipStage3(linkedPr.number, prContext);

      if (stage3Skip) {
        return {
          packet: null,
          skipped: buildSkipped(
            wiId,
            details.title,
            stage,
            null,
            stage3Skip.reason,
            stage3Skip.detail
          ),
          updatedState,
        };
      }

      return {
        packet: buildStage3Packet(details, prContext, updatedState.addressedThreadIds),
        skipped: null,
        updatedState,
      };
    }

    return {
      packet: null,
      skipped: buildSkipped(
        wiId,
        details.title,
        stage,
        subState,
        "unhandled",
        `stage=${stage} subState=${subState}`
      ),
      updatedState,
    };
  } catch (err) {
    const errorCount = (saved?.errorCount ?? 0) + 1;
    const title = saved?.title ?? `Issue #${wiId}`;
    const now = new Date().toISOString();

    if (errorCount >= 3) {
      return {
        packet: null,
        skipped: buildSkipped(
          wiId,
          title,
          saved?.stage ?? 0,
          saved?.subState ?? null,
          "error_cap",
          `${errorCount} errors. Last: ${err.message}`
        ),
        error: { workItemId: wiId, error: err.message },
        updatedState: saved ? { ...saved, errorCount, lastScanAt: now } : null,
      };
    }

    return {
      packet: null,
      skipped: null,
      error: { workItemId: wiId, error: err.message },
      updatedState: saved ? { ...saved, errorCount, lastScanAt: now } : null,
    };
  }
}

function verifyWorktrees(stateDir, repoRoot) {
  let existing;
  try {
    const output = execSync("git worktree list --porcelain", {
      cwd: repoRoot, encoding: "utf-8",
    });
    existing = new Set(
      output.split("\n")
        .filter((line) => line.startsWith("worktree "))
        .map((line) => line.replace("worktree ", "").trim())
    );
  } catch {
    return;
  }

  for (const id of listTrackedWorkItemIds(stateDir)) {
    const state = loadWorkItemState(stateDir, id);
    if (!state?.worktreePath) continue;
    const resolved = path.resolve(repoRoot, state.worktreePath);
    if (!existing.has(resolved)) {
      console.error(`[Worktree] ${state.worktreePath} for issue #${id} gone, clearing.`);
      saveWorkItemState(stateDir, { ...state, worktreePath: null, branch: null });
    }
  }
}

function buildSummary(result) {
  const lines = [];
  lines.push(`Scope: ${result.iteration} | Pass #${result.passCount} | ${result.timestamp}`);
  lines.push("");

  if (result.actionable.length > 0) {
    lines.push(`Actionable (${result.actionable.length}):`);
    for (const packet of result.actionable) {
      switch (packet.action) {
        case "plan":
          lines.push(`  #${packet.workItemId}  ${packet.title}  [Stage 1 - needs plan]`);
          break;
        case "revise_plan":
          lines.push(`  #${packet.workItemId}  ${packet.title}  [Stage 2b - v${packet.planVersion}, ${packet.feedback.length} feedback]`);
          break;
        case "implement":
          lines.push(`  #${packet.workItemId}  ${packet.title}  [Stage 2${packet.approvalSource === "revision_cap" ? "d" : "c"} - ${packet.approvalSource}]`);
          break;
        case "babysit_pr":
          lines.push(`  #${packet.workItemId}  PR #${packet.prId}  [Stage 3 - ${packet.unresolvedThreads.length} threads, ${packet.builds.filter((build) => build.result === "fail").length} failed]`);
          break;
      }
    }
    lines.push("");
  }

  if (result.skipped.length > 0) {
    lines.push(`Skipped (${result.skipped.length}):`);
    for (const skipped of result.skipped) {
      lines.push(`  #${skipped.workItemId}  ${skipped.title}  [${skipped.reason}] ${skipped.detail}`);
    }
    lines.push("");
  }

  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      lines.push(`  #${error.workItemId}  ${error.error}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf("--repo-root");
  const repoRoot = rootIdx >= 0 && args[rootIdx + 1]
    ? path.resolve(args[rootIdx + 1])
    : process.cwd();

  const config = resolveConfig(repoRoot);
  config.stateDir = path.join(repoRoot, ".ai", "work-my-backlog");
  config.repoRoot = repoRoot;

  console.error(`[Scan] Repo: ${config.repository}`);
  console.error(`[Scan] State: ${config.stateDir}`);

  const scanState = loadScanState(config.stateDir);
  const dev = getDevIdentity(repoRoot, config);
  scanState.devName = dev.name;
  scanState.devEmail = dev.email;
  scanState.devLogin = dev.login;

  const assignedWorkItems = queryAssignedWorkItems(config, dev.login);
  const scope = selectScanScope(assignedWorkItems);
  const workItems = scope.items;
  const allAssignedIds = new Set(assignedWorkItems.map((workItem) => workItem.number));

  console.error(`[Scan] Found ${assignedWorkItems.length} assigned issue(s).`);
  if (assignedWorkItems.length > 0 && workItems.length !== assignedWorkItems.length) {
    console.error(`[Scan] Scoped to ${workItems.length} issue(s) in current iteration: ${scope.iteration}`);
  }

  if (assignedWorkItems.length === 0) {
    const result = {
      timestamp: new Date().toISOString(),
      iteration: scope.iteration,
      passCount: scanState.passCount + 1,
      devName: dev.name,
      actionable: [],
      skipped: [],
      errors: [],
      summary: "No open GitHub issues assigned to you.",
    };
    console.log(JSON.stringify(result, null, 2));
    scanState.passCount++;
    scanState.lastRun = new Date().toISOString();
    scanState.sprint = scope.iteration;
    saveScanState(config.stateDir, scanState);
    saveLastScanResult(config.stateDir, result);
    return;
  }

  verifyWorktrees(config.stateDir, repoRoot);

  const sem = new Semaphore(5);
  const results = await Promise.allSettled(
    workItems.map(async (workItem) => {
      await sem.acquire();
      try { return await processWorkItem(workItem, config); }
      finally { sem.release(); }
    })
  );

  const actionable = [];
  const skipped = [];
  const errors = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const workItemId = workItems[i]?.number ?? workItems[i];

    if (result.status === "rejected") {
      errors.push({ workItemId, error: result.reason?.message ?? "Unknown" });
      continue;
    }

    const { packet, skipped: skip, error, updatedState } = result.value;
    if (packet) actionable.push(packet);
    if (skip) skipped.push(skip);
    if (error) errors.push(error);
    if (updatedState) {
      saveWorkItemState(config.stateDir, updatedState);
    }
  }

  for (const id of listTrackedWorkItemIds(config.stateDir)) {
    if (!allAssignedIds.has(id)) {
      console.error(`[Scan] Issue #${id} is no longer assigned/open, removing.`);
      removeWorkItemState(config.stateDir, id);
    }
  }

  scanState.passCount++;
  scanState.lastRun = new Date().toISOString();
  scanState.sprint = scope.iteration;
  saveScanState(config.stateDir, scanState);

  const orderedActionable = sortActionablePackets(actionable);

  const scanResult = {
    timestamp: new Date().toISOString(),
    iteration: scope.iteration,
    passCount: scanState.passCount,
    devName: dev.name,
    actionable: orderedActionable,
    skipped,
    errors,
    summary: "",
  };
  scanResult.summary = buildSummary(scanResult);

  saveLastScanResult(config.stateDir, scanResult);
  logActivity(config.stateDir, {
    event: "scan_complete",
    pass: scanState.passCount,
    actionable: actionable.length,
    skipped: skipped.length,
    errors: errors.length,
    durationMs: Date.now() - startTime,
  });

  console.log(JSON.stringify(scanResult, null, 2));
  console.error("\n" + scanResult.summary);
  console.error(`\n[Scan] Done in ${Date.now() - startTime}ms.`);
}

const entryPointHref = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entryPointHref && import.meta.url === entryPointHref) {
  main().catch((err) => {
    console.error("[Scan] Fatal:", err);
    process.exit(1);
  });
}
