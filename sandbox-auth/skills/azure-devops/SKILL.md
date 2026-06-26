---
name: azure-devops
description: >-
  Set up Azure DevOps authentication for the current sandbox session.
  This skill MUST be called before making any requests to Azure DevOps APIs
  (dev.azure.com, *.visualstudio.com). It triggers the sandbox egress proxy's
  auth handshake — which may prompt the user to log in via browser and approve
  access. Do NOT make Azure DevOps API calls until this skill reports SUCCESS.
argument-hint: <organization name, e.g. "myorg">
allowed-tools: Bash Read
user-invocable: true
shell: bash
---

# Azure DevOps — Sandbox Authentication Setup

You are setting up Azure DevOps authentication for the sandbox session. This is a **prerequisite step** — the sandbox cannot access Azure DevOps APIs until authentication is established through the egress proxy.

## Why This Skill Exists

The sandbox runs inside an isolated container with no user credentials. All outbound HTTPS traffic goes through an egress proxy that enforces per-service authentication policies. Before making any Azure DevOps API call, you must trigger the proxy's auth handshake so it can acquire and cache an OAuth token on the user's behalf.

## What Happens During This Skill (and Why It Takes Time)

This skill runs a **two-phase auth probe**:

### Phase 1 — TRIGGER (~30 seconds)
A short-timeout request is sent to Azure DevOps through the egress proxy. The proxy intercepts it, evaluates the egress policy, and **kicks off token acquisition**. If this is the first time the user is authenticating to ADO in this session:
- The user's **browser opens** to the Azure AD login page (or a ManualToken dialog appears in the Desktop app)
- The user must sign in and (possibly) approve consent
- This happens outside the sandbox — the proxy holds the auth flow open

The trigger request will almost certainly return a non-200 status (403 "Login in progress", 407, or timeout). **This is expected** — the request's purpose is to start the auth flow, not to get data. The script automatically continues to Phase 2 polling.

### Phase 2 — VALIDATE (up to ~5 minutes by default, polling every 5 seconds)
The script polls the same endpoint with short-timeout requests. Each poll checks whether the token has been acquired and cached by the proxy:
- **403 "Login in progress" / 407 / timeout** = user is still logging in, keep waiting
- **2xx** = token is cached, auth is ready — **SUCCESS**
- **403 without "Login in progress"** = token acquired but service rejected it — **FAILED**

The script is patient — it keeps polling through transient 403 responses while the user completes login. Once the user finishes, the very next poll gets a 2xx.

**Total time**: If the token is already cached from a previous auth, this completes in under 5 seconds. If the user needs to log in, it takes as long as the user takes (typically 15-60 seconds). The default budget is 5 minutes (configurable via the second argument).

## Resolving Script Paths

This skill references `../../scripts/probe-auth.sh` — a path relative to this SKILL.md file. To resolve it in the sandbox:
1. This SKILL.md is loaded from a path like `/skills/sandbox-auth-azure-devops/SKILL.md`
2. The plugin root is the parent that contains both `skills/` and `scripts/` directories
3. Find the plugin root: strip the `skills/<skill-name>/` suffix from the SKILL.md directory, then look under `/plugin/` for the matching plugin
4. The script is at `<plugin-root>/scripts/probe-auth.sh` — e.g. `/plugin/sandbox-auth/scripts/probe-auth.sh`

If unsure, run `find /plugin -name probe-auth.sh` to locate it.

## Process

1. **Parse the organization name** from `$ARGUMENTS`. If not provided, use the VSSPS profile endpoint.

2. **Inform the user** before running the probe:
   > Setting up Azure DevOps authentication. This may open your browser for Azure AD login. Please complete the sign-in if prompted — I'll wait for it to finish.

3. **Run the auth probe** (default 5-minute budget — the script handles all retries internally).

   **Pick the probe URL in this priority order:**

   a. **If the user gave a specific target URL** (a repo, PR list, work-item query, build, etc.) — probe THAT URL directly. The probe verifies the actual permission the user needs:
      ```
      bash ../../scripts/probe-auth.sh "${USER_TARGET_URL}" 300 5
      ```
      Example: user asks about PRs in `Weve_DA/_git/Zoran` → probe
      `https://o365exchange.visualstudio.com/Weve_DA/_apis/git/repositories/Zoran/pullrequests?api-version=7.0&searchCriteria.status=active`

   b. **Otherwise, if an organization name is provided** — probe the project-list endpoint. This is project-level and accessible to any org member, unlike `/_apis?api-version=7.0` (org-discovery) which requires elevated permissions in some orgs:
      ```
      bash ../../scripts/probe-auth.sh "https://dev.azure.com/${ORG}/_apis/projects?api-version=7.0" 300 5
      ```
      Substitute the org name for `${ORG}`. For legacy `*.visualstudio.com` hosts, use
      `https://${ORG}.visualstudio.com/_apis/projects?api-version=7.0` instead.

   c. **If no organization** — probe the VSSPS profile endpoint (works for any signed-in user with no org-specific permission required):
      ```
      bash ../../scripts/probe-auth.sh "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0" 300 5
      ```

   ### Why we no longer use `/_apis?api-version=7.0`
   The org-level API-discovery endpoint requires permissions some org admins restrict (e.g., `o365exchange.visualstudio.com` denies it with `AccessCheckException` to non-admins). A successful auth flow followed by a 403 here is misleading — it makes the agent report "auth failed" when authentication actually worked and only this specific endpoint's ACL rejected. The project-list endpoint (`/_apis/projects`) avoids this trap.

   The second argument is the poll budget in seconds (300 = 5 minutes). The third is the poll interval (5 seconds). **Do NOT implement your own retry loop around this script** — it already polls internally and handles transient 403 "Login in progress" responses from the proxy.

4. **Report the result based on script output**:
   - `AUTH_STATUS=SUCCESS`: Tell the user **Azure DevOps authentication is ready.** They can now make API calls to `dev.azure.com` and `*.visualstudio.com`. Mention the elapsed time if it was more than a few seconds.
   - `AUTH_STATUS=FAILED`: Tell the user **Azure DevOps authentication failed.** Include the HTTP code and any response hint. Suggest they check for a consent prompt in the desktop app, or verify the egress policy config.
   - `AUTH_STATUS=TIMEOUT`: Tell the user **Authentication timed out waiting for browser login.** Ask if they saw the browser prompt and want to retry.

## CRITICAL RULES

- **NEVER make Azure DevOps API calls before this skill reports SUCCESS.** The egress proxy will block unauthenticated requests.
- **If this skill fails, do NOT retry silently.** Tell the user what happened and ask if they want to retry.
- **This skill only sets up auth — it does not make any data requests.** After success, use standard HTTP tools (curl, requests, etc.) to call ADO APIs.
- **Warn the user this may take a moment** — browser login is interactive and the script must wait for the user to complete it.
- The auth token is cached by the proxy. You do NOT need to re-run this skill for every request — only once per session (or when the token expires).

## Scopes

This skill requests the Azure DevOps default scope: `499b84ac-1321-427f-aa17-267ca6975798/.default`

This grants access to Azure DevOps REST APIs based on the user's permissions. The user must have an Azure DevOps account with access to the target organization.
