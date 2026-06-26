---
name: connect
description: >-
  Set up authentication for any external service configured in the sandbox
  egress policy. Use this skill when you need to access an API that is NOT
  Azure DevOps or Microsoft Graph (use those dedicated skills instead).
  Provide the probe URL of the service. This triggers the sandbox egress proxy's
  auth handshake. Do NOT make API calls to the target service until this skill
  reports SUCCESS.
argument-hint: <probe URL of the service, e.g. "https://api.github.com/user">
allowed-tools: Bash Read
user-invocable: true
shell: bash
---

# Connect — Generic Sandbox Authentication Setup

You are setting up authentication for an external service through the sandbox egress proxy. This is a **prerequisite step** — the sandbox cannot access external APIs until authentication is established.

## Why This Skill Exists

The sandbox runs inside an isolated container with no user credentials. All outbound HTTPS traffic goes through an egress proxy that enforces per-service authentication policies. Before making API calls to a protected service, you must trigger the proxy's auth handshake so it can acquire and cache a token (OAuth, API key, etc.) on the user's behalf.

## What Happens During This Skill (and Why It Takes Time)

This skill runs a **two-phase auth probe**:

### Phase 1 — TRIGGER (~30 seconds)
A short-timeout request is sent to the target service through the egress proxy. The proxy intercepts it, evaluates the egress policy, and **kicks off token acquisition**. Depending on the service's auth type:
- **Azure AD / OAuth2**: The user's **browser opens** for login/consent
- **API Key**: Token is injected silently from an environment variable (near-instant)

The trigger request may return 407, timeout, or another non-200 status. **This is expected for interactive auth flows** — the request's purpose is to start the auth flow, not to get data.

### Phase 2 — VALIDATE (up to ~3 minutes, polling every 5 seconds)
The script polls the same endpoint with short-timeout requests. Each poll checks whether the token has been acquired and cached by the proxy:
- **407 / timeout** = user is still completing browser login, keep waiting
- **2xx** = token is cached, auth is ready — **SUCCESS**
- **401/403** = token was acquired but the service rejected it — **FAILED**

Once the user completes browser login (or the API key is injected), the very next poll gets a 2xx. The proxy caches the token via a flow rule, so all subsequent requests to the service are fast.

**Total time**: API key auth completes in under 5 seconds. OAuth/Azure AD takes as long as the user takes to complete browser login (typically 15-60 seconds). If the token is already cached, this completes in under 5 seconds regardless of auth type.

## Process

1. **Parse the probe URL** from `$ARGUMENTS`. This is required — the URL must point to an endpoint on the target service that returns a 2xx response when authenticated.

   Good probe URLs:
   - GitHub: `https://api.github.com/user`
   - Slack: `https://slack.com/api/auth.test`
   - Salesforce: `https://login.salesforce.com/services/oauth2/userinfo`
   - OpenAI: `https://api.openai.com/v1/models`
   - Any service: a lightweight GET endpoint that validates auth

2. **Validate the URL**: Ensure `$ARGUMENTS` is a valid HTTPS URL. If not, report an error and ask the user to provide a probe URL.

3. **Inform the user** before running the probe:
   > Setting up authentication for [service host]. This may open your browser for login depending on the auth type configured. Please complete the sign-in if prompted — I'll wait for it to finish.

4. **Run the auth probe**:
   ```
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/probe-auth.sh" "$PROBE_URL"
   ```

5. **Report the result based on script output**:
   - `AUTH_STATUS=SUCCESS`: Tell the user **Authentication for [service host] is ready.** They can now make API calls. Mention the elapsed time if it was more than a few seconds.
   - `AUTH_STATUS=FAILED`: Tell the user **Authentication for [service host] failed.** Include the HTTP code and any response hint. Suggest checking:
     - The desktop app for a consent prompt
     - The egress policy configuration for the current scenario
     - Whether the service is listed in the scenario's `egressPolicy.services`
   - `AUTH_STATUS=TIMEOUT`: Tell the user **Authentication timed out.** Ask if they saw a browser prompt and want to retry.

## CRITICAL RULES

- **NEVER make API calls to the target service before this skill reports SUCCESS.** The egress proxy will block unauthenticated requests or requests to unconfigured services.
- **If this skill fails, do NOT retry silently.** Tell the user what happened and ask if they want to retry.
- **This skill only sets up auth — it does not make any data requests.** After success, use standard HTTP tools to call the service.
- **Warn the user this may take a moment** — browser login is interactive and the script must wait for the user to complete it.
- The auth token is cached by the proxy. You do NOT need to re-run this skill for every request — only once per session (or when the token expires).
- **For Azure DevOps, use `sandbox-auth:azure-devops` instead.** For Microsoft Graph, use `sandbox-auth:microsoft-graph`. This skill is for all other services.

## Supported Auth Types

The egress policy can configure different auth types per service:

| Auth Type | How It Works | User Interaction | Typical Time |
|-----------|-------------|-----------------|-------------|
| **Azure AD** | Browser-based Azure AD login, token injected as `Authorization: Bearer` | Browser opens for login | 15-60s |
| **OAuth2** | Authorization Code + PKCE flow, opens browser for consent | Browser opens for login | 15-60s |
| **API Key** | Static key from environment variable, injected as configured header | None (silent) | < 5s |
| **None** | No auth — request passes through if allowed by policy | None | < 5s |

The auth type is determined by the egress policy configuration, not by this skill. The skill just triggers whatever auth flow is configured for the target service.

## Troubleshooting

If authentication fails:
1. **AUTH_STATUS=TIMEOUT** — User didn't complete browser login within the time budget. Ask them to check for a browser tab/popup and retry.
2. **HTTP 401/403** — Token was acquired but lacks required permissions. Check scopes in the egress policy.
3. **HTTP 000 / network error** — The egress proxy may not be running, or the webhook endpoint is unreachable.
4. **Denied by policy** — The service is not configured in the scenario's egress policy. Ask the user to add it to the scenario's `egressPolicy.services` config.
