// =============================================================================
// ADO REST API Client — zero dependencies, uses Node.js built-in fetch()
//
// All Azure DevOps API calls go through this module.
// Auth: PAT via Basic auth header, or Bearer token from env.
// =============================================================================

import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Auth header
// ---------------------------------------------------------------------------

function getAuthHeader() {
  const pat = process.env.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_PERSONAL_ACCESS_TOKEN;
  if (pat) {
    return "Basic " + Buffer.from(":" + pat).toString("base64");
  }

  const token = process.env.AZURE_DEVOPS_BEARER_TOKEN;
  if (token) {
    return "Bearer " + token;
  }

  throw new Error(
    "No ADO auth configured. Set AZURE_DEVOPS_PAT or AZURE_DEVOPS_BEARER_TOKEN."
  );
}

// ---------------------------------------------------------------------------
// Base request helper
// ---------------------------------------------------------------------------

async function adoFetch(url, options = {}) {
  const auth = getAuthHeader();
  let resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Old .visualstudio.com orgs require -preview suffix on api-version.
  // Retry with -preview if we get a 400 about preview version.
  if (resp.status === 400) {
    const body = await resp.text().catch(() => "");
    if (body.includes("-preview")) {
      const previewUrl = url.replace(/api-version=(\d+\.\d+)(?!-preview)/, "api-version=$1-preview");
      if (previewUrl !== url) {
        resp = await fetch(previewUrl, {
          ...options,
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });
        if (resp.ok) return resp.json();
      }
    }
    throw new Error(`ADO API ${resp.status} ${resp.statusText}: ${url}\n${body.slice(0, 500)}`);
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`ADO API ${resp.status} ${resp.statusText}: ${url}\n${body.slice(0, 500)}`);
  }

  return resp.json();
}

function apiUrl(orgUrl, project, path, query = {}) {
  const base = orgUrl.replace(/\/+$/, "");
  const qs = new URLSearchParams(
    Object.entries({ "api-version": "7.2", ...query }).filter(([, v]) => v != null)
  ).toString();
  return `${base}/${encodeURIComponent(project)}/_apis/${path}?${qs}`;
}

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

export function resolveConfig(repoRoot) {
  let orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
  let project = process.env.AZURE_DEVOPS_PROJECT;
  let repository = process.env.AZURE_DEVOPS_REPOSITORY;

  if (!orgUrl || !project) {
    try {
      const remote = execSync("git remote get-url origin", {
        cwd: repoRoot, encoding: "utf-8",
      }).trim();
      const parsed = parseGitRemote(remote);
      if (parsed) {
        orgUrl = orgUrl || parsed.orgUrl;
        project = project || parsed.project;
        repository = repository || parsed.repository;
      }
    } catch { /* ignore */ }
  }

  if (!orgUrl || !project) {
    throw new Error(
      "Set AZURE_DEVOPS_ORG_URL and AZURE_DEVOPS_PROJECT, or use a git repo with an ADO remote."
    );
  }

  return { orgUrl, project, repository: repository || "" };
}

function parseGitRemote(url) {
  let m;
  // https://dev.azure.com/{org}/{project}/_git/{repo}
  m = url.match(/https?:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+?)(?:\.git)?$/);
  if (m) return { orgUrl: `https://dev.azure.com/${m[1]}`, project: m[2], repository: m[3] };

  // https://{org}.visualstudio.com/{project}/_git/{repo}
  m = url.match(/https?:\/\/([^.]+)\.visualstudio\.com\/([^/]+)\/_git\/(.+?)(?:\.git)?$/);
  if (m) return { orgUrl: `https://${m[1]}.visualstudio.com`, project: m[2], repository: m[3] };

  // SSH variants
  m = url.match(/git@ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/(.+?)$/);
  if (m) return { orgUrl: `https://dev.azure.com/${m[1]}`, project: m[2], repository: m[3] };

  m = url.match(/[^@]+@vs-ssh\.visualstudio\.com:v3\/([^/]+)\/([^/]+)\/(.+?)$/);
  if (m) return { orgUrl: `https://dev.azure.com/${m[1]}`, project: m[2], repository: m[3] };

  return null;
}

export function getDevIdentity(cwd) {
  const name = execSync("git config user.name", { cwd, encoding: "utf-8" }).trim();
  const email = execSync("git config user.email", { cwd, encoding: "utf-8" }).trim();
  return { name, email };
}

// ---------------------------------------------------------------------------
// Sprint
// ---------------------------------------------------------------------------

export async function getCurrentSprint(orgUrl, project, team) {
  const base = orgUrl.replace(/\/+$/, "");

  // Try multiple team name candidates — ADO default team varies by org
  const teamCandidates = team
    ? [team]
    : [project, `${project} Team`];

  for (const teamName of teamCandidates) {
    try {
      const url =
        `${base}/${encodeURIComponent(project)}/${encodeURIComponent(teamName)}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.2`;
      const data = await adoFetch(url);
      const iterations = data.value || [];

      if (iterations.length > 0) {
        const iter = iterations[0];
        return {
          path: iter.path,
          startDate: iter.attributes?.startDate || "",
          endDate: iter.attributes?.finishDate || "",
        };
      }

      // No current sprint — get all and return latest
      const allUrl =
        `${base}/${encodeURIComponent(project)}/${encodeURIComponent(teamName)}/_apis/work/teamsettings/iterations?api-version=7.2`;
      const allData = await adoFetch(allUrl);
      const all = allData.value || [];
      if (all.length > 0) {
        const latest = all[all.length - 1];
        return {
          path: latest.path,
          startDate: latest.attributes?.startDate || "",
          endDate: latest.attributes?.finishDate || "",
        };
      }
    } catch (err) {
      // Team not found — try next candidate
      console.error(`[API] Team "${teamName}" not found, trying next...`);
    }
  }

  // Last resort: list teams and use the first one
  try {
    const teamsUrl = `${base}/_apis/projects/${encodeURIComponent(project)}/teams?api-version=7.2`;
    const teamsData = await adoFetch(teamsUrl);
    const teams = teamsData.value || [];
    if (teams.length > 0) {
      const firstTeam = teams[0].name;
      console.error(`[API] Using discovered team: "${firstTeam}"`);
      const url =
        `${base}/${encodeURIComponent(project)}/${encodeURIComponent(firstTeam)}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.2`;
      const data = await adoFetch(url);
      const iterations = data.value || [];
      if (iterations.length > 0) {
        return {
          path: iterations[0].path,
          startDate: iterations[0].attributes?.startDate || "",
          endDate: iterations[0].attributes?.finishDate || "",
        };
      }
    }
  } catch { /* ignore */ }

  throw new Error("No sprint iterations found. Check team/project config.");
}

// ---------------------------------------------------------------------------
// WIQL Query
// ---------------------------------------------------------------------------

export async function querySprintWorkItems(orgUrl, project, sprintPath) {
  const url = apiUrl(orgUrl, project, "wit/wiql", { $top: "100" });
  const safePath = sprintPath.replace(/'/g, "''");
  const wiql = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.AssignedTo] = @Me
      AND [System.IterationPath] UNDER '${safePath}'
      AND [System.WorkItemType] IN ('Bug', 'Task', 'User Story')
      AND [System.State] NOT IN ('Closed', 'Done', 'Removed', 'Resolved')
    ORDER BY [System.ChangedDate] DESC
  `;

  const data = await adoFetch(url, {
    method: "POST",
    body: JSON.stringify({ query: wiql }),
  });

  const ids = (data.workItems || []).map((wi) => wi.id);
  if (ids.length > 0) return ids;

  // Fallback: stale sprint — query by state only
  console.error(`[API] No items in sprint "${sprintPath}", falling back to state query.`);
  const fallbackWiql = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.AssignedTo] = @Me
      AND [System.WorkItemType] IN ('Bug', 'Task', 'User Story')
      AND [System.State] IN ('New', 'Active')
    ORDER BY [System.ChangedDate] DESC
  `;

  const fallback = await adoFetch(url, {
    method: "POST",
    body: JSON.stringify({ query: fallbackWiql }),
  });
  return (fallback.workItems || []).map((wi) => wi.id);
}

// ---------------------------------------------------------------------------
// Work Items
// ---------------------------------------------------------------------------

export async function fetchWorkItemChangedDate(orgUrl, project, id) {
  const url = apiUrl(orgUrl, project, `wit/workitems/${id}`, {
    fields: "System.ChangedDate",
  });
  const data = await adoFetch(url);
  return data.fields?.["System.ChangedDate"] || new Date(0).toISOString();
}

export async function fetchWorkItemDetails(orgUrl, project, id) {
  const url = apiUrl(orgUrl, project, `wit/workitems/${id}`, {
    $expand: "Relations",
  });
  return adoFetch(url);
}

export async function fetchWorkItemComments(orgUrl, project, id) {
  const url = apiUrl(orgUrl, project, `wit/workItems/${id}/comments`, {
    $top: "200",
    $orderBy: "createdDate asc",
    "api-version": "7.2-preview.4",
  });
  const data = await adoFetch(url);
  return (data.comments || []).map((c) => ({
    id: c.id,
    text: c.text || "",
    createdDate: c.createdDate || "",
    modifiedDate: c.modifiedDate || "",
    createdBy: {
      displayName: c.createdBy?.displayName || "",
      uniqueName: c.createdBy?.uniqueName || "",
    },
  }));
}

export async function fetchWorkItemFull(orgUrl, project, id) {
  const [details, comments] = await Promise.all([
    fetchWorkItemDetails(orgUrl, project, id),
    fetchWorkItemComments(orgUrl, project, id),
  ]);
  return { details, comments };
}

// ---------------------------------------------------------------------------
// Work Item Relations
// ---------------------------------------------------------------------------

export function extractLinkedPrIds(relations) {
  const prIds = [];
  for (const rel of relations || []) {
    if (rel.rel !== "ArtifactLink" || !rel.url?.includes("Git/PullRequestId")) continue;
    const decoded = decodeURIComponent(rel.url);
    const match = decoded.match(/Git\/PullRequestId\/[^/]+\/[^/]+\/(\d+)/);
    if (match) prIds.push(parseInt(match[1], 10));
  }
  return prIds;
}

// ---------------------------------------------------------------------------
// Pull Requests
// ---------------------------------------------------------------------------

const VOTE_MAP = { 10: "approved", 5: "approvedWithSuggestions", 0: "noVote", "-5": "waitingForAuthor", "-10": "rejected" };
const THREAD_STATUS = { 0: "unknown", 1: "active", 2: "fixed", 3: "wontFix", 4: "closed", 5: "byDesign", 6: "pending" };

export async function fetchPrDetails(orgUrl, project, repository, prId) {
  const url = apiUrl(orgUrl, project, `git/repositories/${encodeURIComponent(repository)}/pullrequests/${prId}`);
  const pr = await adoFetch(url);

  return {
    prId: pr.pullRequestId,
    title: pr.title || "",
    status: pr.status,  // 1=active, 2=abandoned, 3=completed
    sourceBranch: (pr.sourceRefName || "").replace("refs/heads/", ""),
    targetBranch: (pr.targetRefName || "").replace("refs/heads/", ""),
    lastSourceCommitId: pr.lastMergeSourceCommit?.commitId || "",
    mergeStatus: {
      hasConflicts: pr.mergeStatus === 2,
      status: String(pr.mergeStatus ?? "unknown"),
    },
    reviewerVotes: (pr.reviewers || []).map((r) => ({
      name: r.displayName || r.uniqueName || "unknown",
      vote: VOTE_MAP[r.vote] || `unknown(${r.vote})`,
    })),
  };
}

export async function isActivePr(orgUrl, project, repository, prId) {
  try {
    const pr = await fetchPrDetails(orgUrl, project, repository, prId);
    return pr.status === 1;
  } catch {
    return false;
  }
}

export async function fetchUnresolvedThreads(orgUrl, project, repository, prId) {
  const url = apiUrl(orgUrl, project, `git/repositories/${encodeURIComponent(repository)}/pullrequests/${prId}/threads`);
  const data = await adoFetch(url);
  const result = [];

  for (const thread of data.value || []) {
    const status = thread.status || 0;
    if (status !== 1 && status !== 6) continue;  // Only active or pending

    const props = thread.properties || {};
    if (props.CodeReviewAutoClosedByPushId || props.CodeReviewVoteUpdatedByIdentity) continue;

    const comments = (thread.comments || []).filter((c) => c.commentType === 1);
    if (comments.length === 0) continue;

    result.push({
      threadId: thread.id,
      status: THREAD_STATUS[status] || "unknown",
      filePath: thread.threadContext?.filePath || null,
      lineNumber:
        thread.threadContext?.rightFileStart?.line ||
        thread.threadContext?.leftFileStart?.line ||
        null,
      comments: comments.map((c) => ({
        author: c.author?.displayName || "unknown",
        date: c.publishedDate || "",
        text: c.content || "",
      })),
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Builds
// ---------------------------------------------------------------------------

export async function fetchBuildStatus(orgUrl, project, sourceBranch, repository) {
  const branchRef = `refs/heads/${sourceBranch}`;
  const url = apiUrl(orgUrl, project, "build/builds", {
    branchName: branchRef,
    repositoryId: repository,
    repositoryType: "TfsGit",
    $top: "5",
    queryOrder: "startTimeDescending",
  });

  let data;
  try {
    data = await adoFetch(url);
  } catch {
    return [];
  }

  const builds = data.value || [];
  const result = [];
  let failureLogFetched = false;

  for (const build of builds) {
    const buildId = build.id;
    const status = build.status;  // 1=inProgress, 2=completed
    const buildResult = build.result; // 0=none, 2=succeeded, 8=failed, 32=canceled

    let resultStr = "unknown";
    if (status === 1) resultStr = "inProgress";
    else if (buildResult === 2) resultStr = "succeeded";
    else if (buildResult === 8) resultStr = "failed";
    else if (buildResult === 32) resultStr = "canceled";

    let failureSummary = null;

    // Fetch logs only for the most recent failed build
    if (resultStr === "failed" && !failureLogFetched) {
      failureSummary = await fetchBuildFailureLogs(orgUrl, project, buildId);
      failureLogFetched = true;
    }

    result.push({
      buildId,
      result: resultStr,
      definitionName: build.definition?.name || `build-${buildId}`,
      failureSummary,
    });
  }

  return result;
}

async function fetchBuildFailureLogs(orgUrl, project, buildId) {
  try {
    const timelineUrl = apiUrl(orgUrl, project, `build/builds/${buildId}/timeline`);
    const timeline = await adoFetch(timelineUrl);

    const failedRecords = (timeline.records || []).filter(
      (r) => r.result === "failed" && r.log?.id
    );
    if (failedRecords.length === 0) return null;

    const logId = failedRecords[0].log.id;

    // Get log metadata to know line count
    const logsUrl = apiUrl(orgUrl, project, `build/builds/${buildId}/logs`);
    const logs = await adoFetch(logsUrl);
    const logEntry = (logs.value || []).find((l) => l.id === logId);
    const lineCount = logEntry?.lineCount || 200;

    // Fetch last 150 lines
    const startLine = Math.max(1, lineCount - 150);
    const logLinesUrl = apiUrl(orgUrl, project,
      `build/builds/${buildId}/logs/${logId}`, {
        startLine: String(startLine),
        endLine: String(lineCount),
      }
    );

    // Build log lines return plain text, not JSON — use raw fetch with preview fallback
    let resp = await fetch(logLinesUrl, {
      headers: { Authorization: getAuthHeader() },
    });
    if (resp.status === 400) {
      const previewUrl = logLinesUrl.replace(/api-version=(\d+\.\d+)(?!-preview)/, "api-version=$1-preview");
      resp = await fetch(previewUrl, { headers: { Authorization: getAuthHeader() } });
    }
    if (!resp.ok) return null;
    return await resp.text();
  } catch (err) {
    console.error(`[API] Failed to fetch build logs for build ${buildId}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Full PR Context (combines all)
// ---------------------------------------------------------------------------

export async function fetchPrContext(orgUrl, project, repository, prId) {
  const details = await fetchPrDetails(orgUrl, project, repository, prId);
  const [unresolvedThreads, builds] = await Promise.all([
    fetchUnresolvedThreads(orgUrl, project, repository, prId),
    fetchBuildStatus(orgUrl, project, details.sourceBranch, repository),
  ]);
  return { details, unresolvedThreads, builds };
}
