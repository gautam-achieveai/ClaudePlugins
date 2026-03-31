// =============================================================================
// Classification Engine — pure functions, no API calls
// Determines stage/sub-state from pre-fetched comments
// =============================================================================

// ---------------------------------------------------------------------------
// Approval signals (case-insensitive)
// Source: skills/work-on/reference/plan-comment-format.md
// ---------------------------------------------------------------------------

const APPROVAL_SIGNALS = [
  "approved", "lgtm", "looks good", "go ahead", "proceed",
  "ship it", "good to go", "start implementation", "greenlight",
  "let's do it", "lets do it",
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const APPROVAL_REGEX = new RegExp(
  "\\b(" + APPROVAL_SIGNALS.map(escapeRegex).join("|") + ")\\b", "i"
);

// ---------------------------------------------------------------------------
// BOT-PLAN detection
// ---------------------------------------------------------------------------

const BOT_PLAN_OPEN = /<!-- BOT-PLAN v(\d+)/;
const BOT_PLAN_CLOSE = "<!-- /BOT-PLAN -->";

/**
 * Find the latest BOT-PLAN comment by version number.
 * @param {Array} comments — array of { id, text, createdDate, createdBy }
 * @returns {{ version: number, text: string, timestamp: string, commentId: number } | null}
 */
export function findLatestBotPlan(comments) {
  let latest = null;

  for (const comment of comments) {
    const match = comment.text.match(BOT_PLAN_OPEN);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    if (latest && version <= latest.version) continue;

    const openEnd = comment.text.indexOf("-->", match.index) + 3;
    const closeStart = comment.text.indexOf(BOT_PLAN_CLOSE);
    const planText =
      closeStart > openEnd
        ? comment.text.substring(openEnd, closeStart).trim()
        : comment.text.substring(openEnd).trim();

    latest = {
      version,
      text: planText,
      timestamp: comment.createdDate,
      commentId: comment.id,
    };
  }

  return latest;
}

// ---------------------------------------------------------------------------
// Human comment extraction
// ---------------------------------------------------------------------------

/**
 * Get human comments posted after a given timestamp.
 * Filters out bot comments (containing [bot] in text).
 */
export function extractHumanComments(comments, afterTimestamp) {
  const cutoff = new Date(afterTimestamp).getTime();

  return comments
    .filter((c) => {
      if (new Date(c.createdDate).getTime() <= cutoff) return false;
      if (/\[bot\]/i.test(c.text)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));
}

// ---------------------------------------------------------------------------
// Approval / Feedback detection
// ---------------------------------------------------------------------------

export function hasApprovalSignal(text) {
  return APPROVAL_REGEX.test(text);
}

function extractApprovalSignal(text) {
  const match = text.match(APPROVAL_REGEX);
  return match ? match[0] : null;
}

/**
 * Check if text has substantive feedback alongside an approval signal.
 * "LGTM but fix the naming" → true (feedback takes priority)
 * "LGTM" → false (clean approval)
 */
export function hasSubstantiveFeedback(text) {
  const signal = extractApprovalSignal(text);
  if (!signal) return true;  // No approval signal = all feedback

  const remaining = text
    .replace(new RegExp(escapeRegex(signal), "i"), "")
    .replace(/[^a-zA-Z0-9]/g, "");

  return remaining.length > 20;
}

// ---------------------------------------------------------------------------
// Main classifier
// ---------------------------------------------------------------------------

/**
 * Classify a work item into stage/sub-state.
 *
 * @param {Array} comments — all comments on the work item
 * @param {boolean} hasActivePr — whether the WI has an active linked PR
 * @returns {{ stage, subState, planVersion, planText, planPostedAt, humanFeedback }}
 */
export function classifyWorkItem(comments, hasActivePr) {
  // Stage 3: Has active PR
  if (hasActivePr) {
    const plan = findLatestBotPlan(comments);
    return {
      stage: 3,
      subState: null,
      planVersion: plan?.version ?? null,
      planText: plan?.text ?? null,
      planPostedAt: plan?.timestamp ?? null,
      humanFeedback: [],
    };
  }

  const plan = findLatestBotPlan(comments);

  // Stage 1: No plan
  if (!plan) {
    return {
      stage: 1, subState: null,
      planVersion: null, planText: null, planPostedAt: null,
      humanFeedback: [],
    };
  }

  // Stage 2: Has plan — determine sub-state
  const humanComments = extractHumanComments(comments, plan.timestamp);

  // 2d: Revision cap (v3+)
  if (plan.version >= 3) {
    return {
      stage: 2, subState: "2d",
      planVersion: plan.version, planText: plan.text, planPostedAt: plan.timestamp,
      humanFeedback: humanComments,
    };
  }

  // 2a: Awaiting review (no human comments)
  if (humanComments.length === 0) {
    return {
      stage: 2, subState: "2a",
      planVersion: plan.version, planText: plan.text, planPostedAt: plan.timestamp,
      humanFeedback: [],
    };
  }

  // Check latest human comment for approval
  const latest = humanComments[humanComments.length - 1];
  if (hasApprovalSignal(latest.text) && !hasSubstantiveFeedback(latest.text)) {
    // 2c: Approved
    return {
      stage: 2, subState: "2c",
      planVersion: plan.version, planText: plan.text, planPostedAt: plan.timestamp,
      humanFeedback: humanComments,
    };
  }

  // 2b: Feedback pending
  return {
    stage: 2, subState: "2b",
    planVersion: plan.version, planText: plan.text, planPostedAt: plan.timestamp,
    humanFeedback: humanComments,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function lastHumanCommentTimestamp(comments) {
  for (let i = comments.length - 1; i >= 0; i--) {
    if (!/\[bot\]/i.test(comments[i].text)) {
      return comments[i].createdDate;
    }
  }
  return null;
}
