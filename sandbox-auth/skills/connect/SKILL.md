---
name: connect
description: >-
  ALWAYS use this FIRST — before calling ANY external service that does not have a
  dedicated skill — to authenticate the sandbox. Trigger this before the first request
  to a third-party API (Slack, Salesforce, OpenAI, Stripe, an internal service, etc.).
  The sandbox blocks unauthenticated egress, so calls will fail until this runs. Provide
  the service's probe URL (an endpoint that returns 2xx when authenticated). For GitHub
  use sandbox-auth:github, for Azure DevOps use sandbox-auth:azure-devops, and for
  Microsoft Graph use sandbox-auth:microsoft-graph. Do NOT call the target API until this
  reports SUCCESS.
argument-hint: <probe URL, e.g. "https://api.github.com/user">
allowed-tools: Bash Read
user-invocable: true
shell: bash
---

# Connect — generic sandbox auth setup

Set up authentication for an external service through the sandbox egress proxy. This is a
**prerequisite** — the sandbox cannot reach a protected API until the proxy has acquired and
cached a token on the user's behalf.

This skill is a **thin wrapper**. It only picks the probe URL and reports the result. All
handshake mechanics — the wire contract, polling through `auth_pending`, the human-in-the-loop
login relay, token injection, and exit-code handling — live in the **`sandbox-auth:egress-auth`**
skill. **Do not reimplement them here.**

## Process

1. **Get the probe URL** from `$ARGUMENTS`. It must be an HTTPS endpoint on the target service
   that returns **2xx when authenticated**. If missing or not HTTPS, ask the user for one.
   Good probes:
   - GitHub: `https://api.github.com/user`
   - Slack: `https://slack.com/api/auth.test`
   - Salesforce: `https://login.salesforce.com/services/oauth2/userinfo`
   - OpenAI: `https://api.openai.com/v1/models`
   - Any service: a lightweight authenticated `GET`.

2. **Tell the user** you're setting up auth for the target host and that a browser/device-code
   login may be required, which you'll relay and wait for.

3. **Use `sandbox-auth:egress-auth`** — follow its **"set up auth for a probe URL"** procedure
   with `PROBE_URL = $ARGUMENTS`. That skill runs the probe engine
   (`${CLAUDE_PLUGIN_ROOT}/scripts/sandbox-auth-fetch.py`), polls internally, and relays any
   `[HITL_REQUIRED]` login prompt. **Do not write your own retry loop.**

4. **Report** the SUCCESS / FAILED / TIMEOUT verdict exactly as the `egress-auth` exit-code table
   defines. On SUCCESS, the user may make API calls to the host; the token is cached for the session.

## Rules (the rest are owned by `sandbox-auth:egress-auth`)

- **Never call the target API before SUCCESS.** **Never bypass the proxy** or disable CA verification.
- On **FAILED (denied)**, the service is not permitted by the egress policy — ask the user to add it
  to the scenario's `egressPolicy.services` rather than retrying.
- One auth per host per session — do not re-run before every request.
