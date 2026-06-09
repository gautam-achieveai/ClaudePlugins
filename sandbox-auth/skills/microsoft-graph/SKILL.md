---
name: microsoft-graph
description: >-
  ALWAYS use this FIRST — before any Microsoft Graph / Microsoft 365 operation — to
  authenticate the sandbox. Trigger this before any request to graph.microsoft.com:
  reading a user profile (/me), mail, calendar, OneDrive files, Teams, or any other
  M365/Graph data. The sandbox blocks unauthenticated egress, so Graph calls will fail
  until this runs. It triggers the egress proxy's auth handshake (may need a browser
  Azure AD login / consent or a ManualToken paste, which it relays). Do NOT make Graph
  API calls until this reports SUCCESS.
argument-hint: "[optional: space-separated Graph scopes, e.g. 'User.Read Mail.Read']"
allowed-tools: Bash Read
user-invocable: true
shell: bash
---

# Microsoft Graph (M365) — sandbox auth setup

Set up Microsoft Graph auth through the sandbox egress proxy before any Graph API call. This is
a **prerequisite** — the proxy must acquire and cache an OAuth token on the user's behalf.

This skill is a **thin wrapper**: it only picks the Graph probe URL and reports the result.
The handshake itself — wire contract, polling through `auth_pending`, the login relay (including
the Desktop **ManualToken** dialog), token injection, and exit-code handling — is owned by the
**`sandbox-auth:egress-auth`** skill. **Do not reimplement it here.**

## Probe URL

Use the default unless the user needs a specific resource:
`https://graph.microsoft.com/v1.0/me`

## Process

1. **Parse optional scopes** from `$ARGUMENTS` (the default `/v1.0/me` probe works for most
   cases; actual scopes are set by the egress policy, not by this skill).
2. **Tell the user** you're setting up Graph auth and a browser Azure AD login or a ManualToken
   paste may be required, which you'll relay and wait for.
3. **Invoke `sandbox-auth:egress-auth`** — follow its **"set up auth for a probe URL"** procedure
   with `PROBE_URL = https://graph.microsoft.com/v1.0/me` and `BUDGET = 300`. It runs the engine
   (`${CLAUDE_PLUGIN_ROOT}/scripts/sandbox-auth-fetch.py`), polls internally, and relays any
   `[HITL_REQUIRED]` prompt. **Do not write your own retry loop.**
4. **Report** SUCCESS / FAILED / TIMEOUT per the `egress-auth` exit-code table. On SUCCESS the
   user can call `graph.microsoft.com`; the token is cached for the session.

## Common Graph scopes

| Scope | Access |
|-------|--------|
| `User.Read` | Signed-in user's profile |
| `User.ReadBasic.All` | Basic profiles of all users |
| `Mail.Read` / `Mail.Send` | Read / send mail |
| `Files.Read` | OneDrive files |
| `Calendars.Read` | Calendar |

## Endpoints available after auth (subject to the egress policy)

- `GET /v1.0/me` — current user profile
- `GET /v1.0/me/messages` — mail
- `GET /v1.0/me/drive/root/children` — OneDrive
- `GET /v1.0/me/events` — calendar

Everything else — never bypass the proxy, never call Graph before SUCCESS, one auth per
session — is enforced by `sandbox-auth:egress-auth`.
