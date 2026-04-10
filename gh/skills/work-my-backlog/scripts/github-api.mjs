// =============================================================================
// GitHub API Client — zero dependencies, uses gh CLI + GraphQL
// =============================================================================

import { spawnSync, execSync } from "node:child_process";

function runGh(args, options = {}) {
  const { cwd, allowExitCodes = [0], env } = options;
  const result = spawnSync("gh", args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf-8",
  });

  if (result.error) {
    throw result.error;
  }

  if (!allowExitCodes.includes(result.status ?? 0)) {
    const stderr = (result.stderr || "").trim();
    throw new Error(stderr || `gh ${args.join(" ")} failed with exit code ${result.status}`);
  }

  return (result.stdout || "").trim();
}

function ghJson(args, options = {}) {
  const output = runGh(args, options);
  return output ? JSON.parse(output) : null;
}

function ghGraphQL(config, query, variables = {}) {
  const args = ["api", "graphql", "-f", `query=${query}`];

  for (const [name, value] of Object.entries(variables)) {
    if (value == null) continue;
    args.push("-F", `${name}=${value}`);
  }

  if (config.host && config.host !== "github.com") {
    args.push("--hostname", config.host);
  }

  return ghJson(args);
}

function parseGitRemote(url) {
  let match = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (match) {
    return {
      host: match[1],
      owner: match[2],
      repo: match[3],
    };
  }

  match = url.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
  if (match) {
    return {
      host: match[1],
      owner: match[2],
      repo: match[3],
    };
  }

  match = url.match(/^ssh:\/\/git@([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (match) {
    return {
      host: match[1],
      owner: match[2],
      repo: match[3],
    };
  }

  return null;
}

function normalizeRepository(host, owner, repo) {
  const repository = host && host !== "github.com"
    ? `${host}/${owner}/${repo}`
    : `${owner}/${repo}`;
  return { host: host || "github.com", owner, repo, repository };
}

export function resolveConfig(repoRoot) {
  const envHost = process.env.GITHUB_HOST || process.env.GH_HOST || "";
  const envRepo = process.env.GITHUB_REPOSITORY || process.env.GH_REPO || "";

  if (envRepo) {
    const parts = envRepo.split("/");
    if (parts.length === 3) {
      return normalizeRepository(parts[0], parts[1], parts[2]);
    }
    if (parts.length === 2) {
      return normalizeRepository(envHost || "github.com", parts[0], parts[1]);
    }
  }

  try {
    const remote = execSync("git remote get-url origin", {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();
    const parsed = parseGitRemote(remote);
    if (parsed) {
      return normalizeRepository(parsed.host, parsed.owner, parsed.repo);
    }
  } catch {
    // fall through
  }

  throw new Error(
    "Set GITHUB_REPOSITORY (owner/repo), GH_REPO, or use a git repo with a GitHub remote."
  );
}

export function getDevIdentity(cwd, config) {
  let name = "";
  let email = "";
  let login = "";

  try {
    name = execSync("git config user.name", { cwd, encoding: "utf-8" }).trim();
  } catch {
    // ignore
  }

  try {
    email = execSync("git config user.email", { cwd, encoding: "utf-8" }).trim();
  } catch {
    // ignore
  }

  try {
    const user = ghJson(["api", "user", ...(config.host && config.host !== "github.com" ? ["--hostname", config.host] : [])]);
    login = user?.login || "";
    name = name || user?.name || login;
  } catch {
    // ignore
  }

  return { name: name || login || "GitHub User", email, login };
}

export function inferWorkItemType(details) {
  const labels = new Set((details.labels || []).map((label) => label.toLowerCase()));

  if (["bug", "defect", "regression", "incident"].some((label) => labels.has(label))) {
    return "Bug";
  }

  if (["feature", "enhancement", "story"].some((label) => labels.has(label))) {
    return "Feature";
  }

  if (["task", "chore", "refactor", "cleanup"].some((label) => labels.has(label))) {
    return "Task";
  }

  return "Task";
}

function projectFieldValue(node) {
  const fieldName = node?.field?.name || "";

  switch (node?.__typename) {
    case "ProjectV2ItemFieldTextValue":
      return { name: fieldName, value: node.text ?? "" };
    case "ProjectV2ItemFieldNumberValue":
      return { name: fieldName, value: node.number ?? null };
    case "ProjectV2ItemFieldDateValue":
      return { name: fieldName, value: node.date ?? "" };
    case "ProjectV2ItemFieldSingleSelectValue":
      return { name: fieldName, value: node.name ?? "" };
    case "ProjectV2ItemFieldIterationValue":
      return {
        name: fieldName || "Iteration",
        value: {
          title: node.title ?? "",
          startDate: node.startDate ?? "",
          duration: node.duration ?? 0,
          isCurrent: isCurrentIteration(node.startDate, node.duration),
        },
      };
    default:
      return null;
  }
}

function isCurrentIteration(startDate, duration) {
  if (!startDate || !duration) return false;
  const start = new Date(startDate);
  const end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
  const now = new Date();
  return now >= start && now < end;
}

function normalizeProjectItems(projectItems) {
  return (projectItems?.nodes || []).map((item) => {
    const fields = {};
    for (const value of item?.fieldValues?.nodes || []) {
      const normalized = projectFieldValue(value);
      if (normalized?.name) {
        fields[normalized.name] = normalized.value;
      }
    }

    return {
      id: item?.id || "",
      projectTitle: item?.project?.title || "",
      projectNumber: item?.project?.number || null,
      projectUrl: item?.project?.url || "",
      fields,
    };
  });
}

function extractCurrentIteration(projectItems) {
  return projectItems
    .map((item) => item.fields?.Iteration)
    .find((iteration) => iteration?.isCurrent) || null;
}

function normalizeLinkedPrs(timelineNodes) {
  const linkedPrs = [];
  const seenPrs = new Set();

  for (const node of timelineNodes || []) {
    const pr = node?.source?.__typename === "PullRequest" ? node.source : null;
    if (!pr || seenPrs.has(pr.number)) continue;
    seenPrs.add(pr.number);
    linkedPrs.push({
      number: pr.number,
      title: pr.title || "",
      url: pr.url || "",
      state: pr.state || "",
      updatedAt: pr.updatedAt || "",
      isDraft: Boolean(pr.isDraft),
      headRefName: pr.headRefName || "",
      baseRefName: pr.baseRefName || "",
      mergeable: pr.mergeable || "UNKNOWN",
      mergeStateStatus: pr.mergeStateStatus || "UNKNOWN",
      reviewDecision: pr.reviewDecision || null,
    });
  }

  return linkedPrs;
}

function normalizeActor(actor) {
  const login = actor?.login || "unknown";
  const type = actor?.__typename || null;
  const isBot = type === "Bot"
    ? true
    : type
      ? false
      : /\[bot\]$/i.test(login);

  return {
    displayName: login,
    uniqueName: login,
    login,
    type,
    isBot,
  };
}

function toTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function computeLatestActivityTimestamp(issueUpdatedAt, linkedPrs = []) {
  let latest = issueUpdatedAt || "";
  let latestTimestamp = toTimestamp(latest);

  for (const linkedPr of linkedPrs || []) {
    if (linkedPr?.state && linkedPr.state !== "OPEN") continue;
    const candidate = linkedPr?.updatedAt || "";
    const candidateTimestamp = toTimestamp(candidate);
    if (candidateTimestamp > latestTimestamp) {
      latest = candidate;
      latestTimestamp = candidateTimestamp;
    }
  }

  return latest || new Date(0).toISOString();
}

function normalizeScanIssue(issue) {
  const projectItems = normalizeProjectItems(issue?.projectItems);
  const currentIteration = extractCurrentIteration(projectItems);
  const linkedPrs = normalizeLinkedPrs(issue?.timelineItems?.nodes);

  return {
    number: issue?.number ?? 0,
    title: issue?.title || "",
    updatedAt: issue?.updatedAt || "",
    url: issue?.url || "",
    currentIteration,
    linkedPrs,
    scanUpdatedAt: computeLatestActivityTimestamp(issue?.updatedAt || "", linkedPrs),
  };
}

function normalizeIssue(data) {
  const issue = data?.repository?.issue;
  if (!issue) {
    throw new Error("Issue not found.");
  }

  const projectItems = normalizeProjectItems(issue.projectItems);
  const currentIteration = extractCurrentIteration(projectItems);
  const linkedPrs = normalizeLinkedPrs(issue.timelineItems?.nodes);

  return {
    id: issue.number,
    number: issue.number,
    title: issue.title || "",
    body: issue.body || "",
    state: issue.state || "",
    updatedAt: issue.updatedAt || "",
    url: issue.url || "",
    labels: (issue.labels?.nodes || []).map((node) => node.name).filter(Boolean),
    assignees: (issue.assignees?.nodes || []).map((node) => ({
      login: node.login || "",
      name: node.name || "",
    })),
    milestone: issue.milestone?.title || "",
    projectItems,
    currentIteration,
    linkedPrs,
    scanUpdatedAt: computeLatestActivityTimestamp(issue.updatedAt || "", linkedPrs),
    type: inferWorkItemType({
      labels: (issue.labels?.nodes || []).map((node) => node.name).filter(Boolean),
    }),
  };
}

function normalizeIssueComments(data) {
  const issue = data?.repository?.issue;
  return (issue?.comments?.nodes || []).map((comment) => ({
    id: comment.databaseId ?? null,
    text: comment.body || "",
    createdDate: comment.createdAt || "",
    modifiedDate: comment.createdAt || "",
    createdBy: normalizeActor(comment.author),
  }));
}

export function queryAssignedWorkItems(config, viewerLogin = "") {
  if (!viewerLogin) {
    return (ghJson([
      "issue", "list",
      "--repo", config.repository,
      "--assignee", "@me",
      "--state", "open",
      "--limit", "100",
      "--json", "number,title,updatedAt",
    ]) || []).map((issue) => ({
      ...issue,
      currentIteration: null,
      linkedPrs: [],
      scanUpdatedAt: issue.updatedAt || new Date(0).toISOString(),
    }));
  }

  const query = `
    query($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 100) {
        nodes {
          ... on Issue {
            number
            title
            updatedAt
            url
            projectItems(first: 20) {
              nodes {
                id
                project {
                  title
                  number
                  url
                }
                fieldValues(first: 20) {
                  nodes {
                    __typename
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      startDate
                      duration
                      field { ... on ProjectV2FieldCommon { name } }
                    }
                  }
                }
              }
            }
            timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
              nodes {
                ... on CrossReferencedEvent {
                  source {
                    __typename
                    ... on PullRequest {
                      number
                      title
                      url
                      state
                      updatedAt
                      isDraft
                      headRefName
                      baseRefName
                      mergeable
                      mergeStateStatus
                      reviewDecision
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = ghGraphQL(config, query, {
    queryString: `repo:${config.owner}/${config.repo} is:issue is:open assignee:${viewerLogin} sort:updated-desc`,
  });

  return (data?.search?.nodes || [])
    .map((issue) => normalizeScanIssue(issue))
    .filter((issue) => issue.number);
}

export async function fetchWorkItemChangedDate(config, id) {
  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          updatedAt
          timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
            nodes {
              ... on CrossReferencedEvent {
                source {
                  __typename
                  ... on PullRequest {
                    number
                    state
                    updatedAt
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = ghGraphQL(config, query, {
    owner: config.owner,
    repo: config.repo,
    number: id,
  });

  const issue = data?.repository?.issue;
  const linkedPrs = normalizeLinkedPrs(issue?.timelineItems?.nodes);
  return computeLatestActivityTimestamp(issue?.updatedAt || "", linkedPrs);
}

export async function fetchWorkItemFull(config, id) {
  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          number
          title
          body
          state
          updatedAt
          url
          labels(first: 20) {
            nodes { name }
          }
          assignees(first: 10) {
            nodes { login name }
          }
          milestone {
            title
          }
          projectItems(first: 20) {
            nodes {
              id
              project {
                title
                number
                url
              }
              fieldValues(first: 20) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field { ... on ProjectV2FieldCommon { name } }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field { ... on ProjectV2FieldCommon { name } }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field { ... on ProjectV2FieldCommon { name } }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2FieldCommon { name } }
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    title
                    startDate
                    duration
                    field { ... on ProjectV2FieldCommon { name } }
                  }
                }
              }
            }
          }
          comments(first: 100) {
            nodes {
              databaseId
              body
              createdAt
              author {
                __typename
                login
              }
            }
          }
          timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
            nodes {
              ... on CrossReferencedEvent {
                source {
                  __typename
                    ... on PullRequest {
                      number
                      title
                      url
                      state
                      updatedAt
                      isDraft
                      headRefName
                      baseRefName
                      mergeable
                    mergeStateStatus
                    reviewDecision
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = ghGraphQL(config, query, {
    owner: config.owner,
    repo: config.repo,
    number: id,
  });

  return {
    details: normalizeIssue(data),
    comments: normalizeIssueComments(data),
  };
}

function summarizeReviewState(state) {
  switch (state) {
    case "APPROVED":
      return "approved";
    case "CHANGES_REQUESTED":
      return "changesRequested";
    case "COMMENTED":
      return "commented";
    case "DISMISSED":
      return "dismissed";
    case "PENDING":
      return "pending";
    default:
      return state || "unknown";
  }
}

function normalizeReviewerVotes(latestReviews) {
  const votesByReviewer = new Map();

  for (const review of latestReviews?.nodes || []) {
    const login = review?.author?.login;
    if (!login) continue;
    votesByReviewer.set(login, summarizeReviewState(review.state));
  }

  return [...votesByReviewer.entries()].map(([name, vote]) => ({ name, vote }));
}

export function normalizeActionableTopLevelFeedback(pr) {
  const reviewSummaries = (pr?.latestReviews?.nodes || [])
    .map((review) => {
      const actor = normalizeActor(review?.author);
      const text = (review?.body || "").trim();
      if (!text || actor.isBot) return null;

      return {
        author: actor.displayName,
        state: summarizeReviewState(review?.state),
        date: review?.submittedAt || "",
        text,
      };
    })
    .filter(Boolean);

  const conversationComments = (pr?.comments?.nodes || [])
    .map((comment) => {
      const actor = normalizeActor(comment?.author);
      const text = (comment?.body || "").trim();
      if (!text || actor.isBot) return null;

      return {
        author: actor.displayName,
        date: comment?.createdAt || "",
        text,
      };
    })
    .filter(Boolean);

  return { reviewSummaries, conversationComments };
}

function normalizeUnresolvedThreads(data) {
  const threads = data?.repository?.pullRequest?.reviewThreads?.nodes || [];
  return threads
    .filter((thread) => thread && !thread.isResolved && !thread.isOutdated)
    .map((thread) => ({
      threadId: thread.id,
      status: "active",
      filePath: thread.path || null,
      lineNumber: thread.line || null,
      comments: (thread.comments?.nodes || []).map((comment) => ({
        author: comment.author?.login || "unknown",
        date: comment.createdAt || "",
        text: comment.body || "",
      })),
    }));
}

export async function fetchPrContext(config, prId) {
  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          number
          title
          url
          state
          isDraft
          headRefName
          baseRefName
          mergeable
          mergeStateStatus
          reviewDecision
          latestReviews(first: 50) {
            nodes {
              author { __typename login }
              state
              body
              submittedAt
            }
          }
          comments(first: 50) {
            nodes {
              author { __typename login }
              body
              createdAt
            }
          }
          reviewThreads(first: 100) {
            nodes {
              id
              isResolved
              isOutdated
              path
              line
              comments(first: 20) {
                nodes {
                  author { login }
                  body
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `;

  const prData = ghGraphQL(config, query, {
    owner: config.owner,
    repo: config.repo,
    number: prId,
  });

  const pr = prData?.repository?.pullRequest;
  if (!pr) {
    throw new Error(`PR #${prId} not found.`);
  }

  const { reviewSummaries, conversationComments } = normalizeActionableTopLevelFeedback(pr);

  const checks = ghJson([
    "pr", "checks", String(prId),
    "--repo", config.repository,
    "--required",
    "--json", "bucket,completedAt,description,link,name,state,workflow",
  ], { allowExitCodes: [0, 8] }) || [];

  const builds = checks.map((check) => ({
    name: check.name || "",
    result: check.bucket || "unknown",
    state: check.state || "",
    description: check.description || "",
    workflow: check.workflow || "",
    link: check.link || "",
    completedAt: check.completedAt || "",
  }));

  return {
    details: {
      prId: pr.number,
      title: pr.title || "",
      url: pr.url || "",
      state: pr.state || "",
      isDraft: Boolean(pr.isDraft),
      sourceBranch: pr.headRefName || "",
      targetBranch: pr.baseRefName || "",
      mergeStatus: {
        hasConflicts: pr.mergeable === "CONFLICTING",
        status: pr.mergeable || "UNKNOWN",
        mergeStateStatus: pr.mergeStateStatus || "UNKNOWN",
      },
      reviewDecision: pr.reviewDecision || null,
      reviewerVotes: normalizeReviewerVotes(pr.latestReviews),
    },
    unresolvedThreads: normalizeUnresolvedThreads(prData),
    reviewSummaries,
    conversationComments,
    builds,
  };
}
