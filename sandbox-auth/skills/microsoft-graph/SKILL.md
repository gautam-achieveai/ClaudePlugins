---
name: microsoft-graph
description: >-
  Set up Microsoft Graph authentication for the current sandbox session.
  This skill MUST be called before making any requests to the Microsoft Graph API
  (graph.microsoft.com). It triggers the sandbox egress proxy's auth handshake —
  which may prompt the user to log in via browser and approve access.
  Do NOT make Graph API calls until this skill reports SUCCESS.
argument-hint: "[optional: space-separated list of Graph scopes, e.g. 'User.Read Mail.Read']"
allowed-tools: Bash Read
user-invocable: true
shell: bash
---

# Microsoft Graph — Sandbox Authentication Setup

You are setting up Microsoft Graph authentication for the sandbox session. This is a **prerequisite step** — the sandbox cannot access the Graph API until authentication is established through the egress proxy.

## Why This Skill Exists

The sandbox runs inside an isolated container with no user credentials. All outbound HTTPS traffic goes through an egress proxy that enforces per-service authentication policies. Before making any Graph API call, you must trigger the proxy's auth handshake so it can acquire and cache an OAuth token on the user's behalf.

## What Happens During This Skill (and Why It Takes Time)

This skill runs a **two-phase auth probe**:

### Phase 1 — TRIGGER (~30 seconds)
A short-timeout request is sent to `graph.microsoft.com/v1.0/me` through the egress proxy. The proxy intercepts it, evaluates the egress policy, and **kicks off token acquisition**. If this is the first time the user is authenticating to Graph in this session:
- A **ManualToken dialog** may appear in the Desktop app asking the user to paste a Graph token
- Or the user's **browser opens** to the Azure AD login page
- The user must sign in and consent to the requested Graph scopes
- This happens outside the sandbox — the proxy holds the auth flow open

The trigger request will almost certainly return a non-200 status (403 "Login in progress", 407, or timeout). **This is expected** — the request's purpose is to start the auth flow, not to get data. The script automatically continues to Phase 2 polling.

### Phase 2 — VALIDATE (up to ~5 minutes by default, polling every 5 seconds)
The script polls the same endpoint with short-timeout requests. Each poll checks whether the token has been acquired and cached by the proxy:
- **403 "Login in progress" / 407 / timeout** = user is still logging in, keep waiting
- **2xx** = token is cached, auth is ready — **SUCCESS**
- **403 without "Login in progress"** = token acquired but Graph rejected it — **FAILED**

The script is patient — it keeps polling through transient 403 responses while the user completes login or pastes their token. Once done, the very next poll gets a 2xx.

**Total time**: If the token is already cached from a previous auth, this completes in under 5 seconds. If the user needs to log in, it takes as long as the user takes (typically 15-60 seconds). The default budget is 5 minutes (configurable via the second argument).

## Resolving Script Paths

This skill references `../../scripts/probe-auth.sh` — a path relative to this SKILL.md file. To resolve it in the sandbox:
1. This SKILL.md is loaded from a path like `/skills/sandbox-auth-microsoft-graph/SKILL.md`
2. The plugin root is the parent that contains both `skills/` and `scripts/` directories
3. Find the plugin root: strip the `skills/<skill-name>/` suffix from the SKILL.md directory, then look under `/plugin/` for the matching plugin
4. The script is at `<plugin-root>/scripts/probe-auth.sh` — e.g. `/plugin/sandbox-auth/scripts/probe-auth.sh`

If unsure, run `find /plugin -name probe-auth.sh` to locate it.

## Process

1. **Parse arguments** from `$ARGUMENTS`. Arguments are optional — the default probe endpoint (`/v1.0/me`) works for most scenarios.

2. **Inform the user** before running the probe:
   > Setting up Microsoft Graph authentication. This may open your browser for Azure AD login. Please complete the sign-in if prompted — I'll wait for it to finish.

3. **Run the auth probe** (default 5-minute budget — the script handles all retries internally):
   ```
   bash ../../scripts/probe-auth.sh "https://graph.microsoft.com/v1.0/me" 300 5
   ```
   The second argument is the poll budget in seconds (300 = 5 minutes). The third is the poll interval (5 seconds). **Do NOT implement your own retry loop around this script** — it already polls internally and handles transient 403 "Login in progress" responses from the proxy.

4. **Report the result based on script output**:
   - `AUTH_STATUS=SUCCESS`: Tell the user **Microsoft Graph authentication is ready.** They can now make API calls to `graph.microsoft.com`. Mention the elapsed time if it was more than a few seconds.
   - `AUTH_STATUS=FAILED`: Tell the user **Microsoft Graph authentication failed.** Include the HTTP code and any response hint. Suggest they check the desktop app for a consent prompt or verify the egress policy config.
   - `AUTH_STATUS=TIMEOUT`: Tell the user **Authentication timed out waiting for browser login.** Ask if they saw the browser prompt and want to retry.

## CRITICAL RULES

- **NEVER make Microsoft Graph API calls before this skill reports SUCCESS.** The egress proxy will block unauthenticated requests.
- **If this skill fails, do NOT retry silently.** Tell the user what happened and ask if they want to retry.
- **This skill only sets up auth — it does not make any data requests.** After success, use standard HTTP tools (curl, requests, etc.) to call Graph APIs.
- **Warn the user this may take a moment** — browser login is interactive and the script must wait for the user to complete it.
- The auth token is cached by the proxy. You do NOT need to re-run this skill for every request — only once per session (or when the token expires).

## Common Graph Scopes

The egress policy configuration determines which scopes are requested. Common scopes include:

| Scope | Access |
|-------|--------|
| `User.Read` | Read signed-in user's profile |
| `User.ReadBasic.All` | Read basic profiles of all users |
| `Mail.Read` | Read user's mail |
| `Mail.Send` | Send mail on behalf of user |
| `Files.Read` | Read user's files in OneDrive |
| `Calendars.Read` | Read user's calendar |

The actual scopes available depend on what is configured in the scenario's egress policy. If the probe succeeds, the token has the scopes required by the policy.

## Endpoints Available After Auth

Once authenticated, you can access any Graph API endpoint allowed by the egress policy:

- `GET https://graph.microsoft.com/v1.0/me` — current user profile
- `GET https://graph.microsoft.com/v1.0/me/messages` — user's emails
- `GET https://graph.microsoft.com/v1.0/me/drive/root/children` — OneDrive files
- `GET https://graph.microsoft.com/v1.0/me/events` — calendar events

The egress policy may restrict which paths and HTTP methods are allowed. If a request is blocked, check the scenario's egress policy configuration.
