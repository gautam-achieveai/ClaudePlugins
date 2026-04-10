import assert from "node:assert/strict";
import test from "node:test";
import * as scan from "./scan.mjs";

import {
  classifyWorkItem,
  extractHumanComments,
  lastHumanCommentTimestamp,
} from "./classify.mjs";
import {
  computeLatestActivityTimestamp,
  normalizeActionableTopLevelFeedback,
} from "./github-api.mjs";
import { buildStage3Packet, selectScanScope, shouldSkipStage3 } from "./scan.mjs";

test("sortActionablePackets prioritizes later-stage work while preserving in-stage order", () => {
  assert.equal(typeof scan.sortActionablePackets, "function");

  const ordered = scan.sortActionablePackets([
    { action: "plan", workItemId: 10 },
    { action: "implement", workItemId: 20, approvalSource: "human" },
    { action: "babysit_pr", workItemId: 30, prId: 300 },
    { action: "revise_plan", workItemId: 40, planVersion: 2, feedback: [{ text: "split rollout" }] },
    { action: "implement", workItemId: 21, approvalSource: "revision_cap" },
    { action: "plan", workItemId: 11 },
    { action: "babysit_pr", workItemId: 31, prId: 301 },
  ]);

  assert.deepEqual(
    ordered.map((packet) => `${packet.action}:${packet.workItemId}`),
    [
      "babysit_pr:30",
      "babysit_pr:31",
      "implement:20",
      "implement:21",
      "revise_plan:40",
      "plan:10",
      "plan:11",
    ]
  );
});

test("computeLatestActivityTimestamp uses linked PR activity for rescans", () => {
  const latest = computeLatestActivityTimestamp("2024-02-01T00:00:00Z", [
    { number: 12, state: "OPEN", updatedAt: "2024-02-04T00:00:00Z" },
  ]);

  assert.equal(latest, "2024-02-04T00:00:00Z");
});

test("comment classification prefers author metadata over body markers", () => {
  const comments = [
    {
      text: "Automated sync complete.",
      createdDate: "2024-03-02T00:00:00Z",
      createdBy: { displayName: "copilot", type: "Bot", isBot: true },
    },
    {
      text: "I reviewed the [bot] summary and it looks right.",
      createdDate: "2024-03-03T00:00:00Z",
      createdBy: { displayName: "alice", type: "User", isBot: false },
    },
  ];

  const humanComments = extractHumanComments(comments, "2024-03-01T00:00:00Z");

  assert.deepEqual(
    humanComments.map((comment) => comment.createdBy.displayName),
    ["alice"]
  );
  assert.equal(lastHumanCommentTimestamp(comments), "2024-03-03T00:00:00Z");
});

test("selectScanScope narrows processing to current iteration items", () => {
  const scope = selectScanScope([
    { number: 101, currentIteration: { title: "Sprint 9", isCurrent: true } },
    { number: 102, currentIteration: null },
    { number: 103, currentIteration: { title: "Sprint 8", isCurrent: false } },
  ]);

  assert.equal(scope.iteration, "Sprint 9");
  assert.deepEqual(scope.items.map((item) => item.number), [101]);
});

test("shouldSkipStage3 keeps draft and conflicted PRs actionable", () => {
  const healthyContext = {
    details: {
      isDraft: false,
      mergeStatus: { hasConflicts: false },
      reviewDecision: null,
    },
    builds: [],
    unresolvedThreads: [],
  };

  assert.deepEqual(shouldSkipStage3(42, healthyContext), {
    reason: "pr_waiting_on_humans",
    detail: "PR #42 has no actionable automation work left.",
  });

  assert.equal(
    shouldSkipStage3(42, {
      ...healthyContext,
      details: { ...healthyContext.details, isDraft: true },
    }),
    null
  );

  assert.equal(
    shouldSkipStage3(42, {
      ...healthyContext,
      details: {
        ...healthyContext.details,
        mergeStatus: { hasConflicts: true },
      },
    }),
    null
  );
});

test("classifyWorkItem routes a v3 plan to revision-cap implementation", () => {
  const comments = [
    {
      id: 1,
      text: "[copilot bot]\n<!-- BOT-PLAN v3 -->\nPlan text\n<!-- /BOT-PLAN -->",
      createdDate: "2024-04-01T00:00:00Z",
      createdBy: { displayName: "copilot", type: "Bot", isBot: true },
    },
  ];

  const result = classifyWorkItem(comments, false);

  assert.equal(result.stage, 2);
  assert.equal(result.subState, "2d");
  assert.equal(result.planVersion, 3);
});

test("classifyWorkItem keeps revision-cap semantics even when v3 has feedback", () => {
  const comments = [
    {
      id: 1,
      text: "[copilot bot]\n<!-- BOT-PLAN v3 -->\nPlan text\n<!-- /BOT-PLAN -->",
      createdDate: "2024-04-01T00:00:00Z",
      createdBy: { displayName: "copilot", type: "Bot", isBot: true },
    },
    {
      id: 2,
      text: "Please split the rollout step from the refactor.",
      createdDate: "2024-04-02T00:00:00Z",
      createdBy: { displayName: "alice", type: "User", isBot: false },
    },
  ];

  const result = classifyWorkItem(comments, false);

  assert.equal(result.stage, 2);
  assert.equal(result.subState, "2d");
  assert.equal(result.humanFeedback.length, 1);
});

test("normalizeActionableTopLevelFeedback captures human review summaries and conversation comments", () => {
  const pr = {
    latestReviews: {
      nodes: [
        {
          author: { __typename: "User", login: "alice" },
          state: "CHANGES_REQUESTED",
          submittedAt: "2024-04-01T00:00:00Z",
          body: "Please add the null guard to the packet builder.",
        },
        {
          author: { __typename: "Bot", login: "copilot[bot]" },
          state: "COMMENTED",
          submittedAt: "2024-04-01T01:00:00Z",
          body: "Automated reminder",
        },
      ],
    },
    comments: {
      nodes: [
        {
          author: { __typename: "User", login: "bob" },
          createdAt: "2024-04-02T00:00:00Z",
          body: "Please link the follow-up issue before merge.",
        },
        {
          author: { __typename: "Bot", login: "ci[bot]" },
          createdAt: "2024-04-02T01:00:00Z",
          body: "CI rerun requested",
        },
      ],
    },
  };

  assert.deepEqual(normalizeActionableTopLevelFeedback(pr), {
    reviewSummaries: [
      {
        author: "alice",
        state: "changesRequested",
        date: "2024-04-01T00:00:00Z",
        text: "Please add the null guard to the packet builder.",
      },
    ],
    conversationComments: [
      {
        author: "bob",
        date: "2024-04-02T00:00:00Z",
        text: "Please link the follow-up issue before merge.",
      },
    ],
  });
});

test("shouldSkipStage3 keeps top-level PR feedback actionable", () => {
  const healthyContext = {
    details: {
      isDraft: false,
      mergeStatus: { hasConflicts: false },
      reviewDecision: null,
    },
    builds: [],
    unresolvedThreads: [],
    reviewSummaries: [
      {
        author: "alice",
        state: "changesRequested",
        date: "2024-04-01T00:00:00Z",
        text: "Please add the null guard to the packet builder.",
      },
    ],
    conversationComments: [],
  };

  assert.equal(shouldSkipStage3(42, healthyContext), null);
});

test("buildStage3Packet carries draft state and top-level feedback to the worker", () => {
  const packet = buildStage3Packet(
    {
      id: 77,
      title: "Keep review context intact",
      url: "https://example.test/issues/77",
    },
    {
      details: {
        prId: 19,
        url: "https://example.test/pr/19",
        sourceBranch: "feature/review-context",
        targetBranch: "main",
        mergeStatus: { hasConflicts: false, status: "MERGEABLE" },
        reviewDecision: "CHANGES_REQUESTED",
        reviewerVotes: [{ name: "alice", vote: "changesRequested" }],
        isDraft: true,
      },
      builds: [],
      unresolvedThreads: [],
      reviewSummaries: [
        {
          author: "alice",
          state: "changesRequested",
          date: "2024-04-01T00:00:00Z",
          text: "Please add the null guard to the packet builder.",
        },
      ],
      conversationComments: [
        {
          author: "bob",
          date: "2024-04-02T00:00:00Z",
          text: "Please link the follow-up issue before merge.",
        },
      ],
    },
    ["thread-1"]
  );

  assert.equal(packet.isDraft, true);
  assert.equal(packet.reviewSummaries.length, 1);
  assert.equal(packet.conversationComments.length, 1);
});
