---
name: azure-devops
description: >-
  ALWAYS use this FIRST — before any Azure DevOps operation — to authenticate the
  sandbox. Trigger this before any request to dev.azure.com or *.visualstudio.com:
  listing/creating PRs, querying work items, reading repos/builds/pipelines, or any
  ADO REST call. The sandbox blocks unauthenticated egress, so ADO calls will fail
  until this runs. It triggers the egress proxy's auth handshake (may need a browser
  Azure AD login / consent, which it relays). Do NOT make Azure DevOps API calls until
  this reports SUCCESS.
argument-hint: <organization name, e.g. "myorg">
allowed-tools: Bash Read
user-invocable: true
shell: bash
---

# Azure DevOps — sandbox auth setup

Set up Azure DevOps auth through the sandbox egress proxy before any ADO API call. This is a
**prerequisite** — the proxy must acquire and cache an OAuth token on the user's behalf.

This skill is a **thin wrapper**: it only picks the right ADO probe URL and reports the result.
The handshake itself — wire contract, polling through `auth_pending`, the login relay, token
injection, and exit-code handling — is owned by the **`sandbox-auth:egress-auth`** skill.
**Do not reimplement it here.**

## Choose the probe URL (this is the ADO-specific value of this skill)

Pick in this priority order, then hand the URL to `egress-auth`:

a. **A specific target the user named** (a repo, PR list, work-item query, build) — probe THAT
   URL, so you verify the exact permission they need. Example: PRs in `Weve_DA/_git/Zoran` →
   `https://o365exchange.visualstudio.com/Weve_DA/_apis/git/repositories/Zoran/pullrequests?api-version=7.0&searchCriteria.status=active`

b. **Otherwise, if an org name is given** — probe the **project-list** endpoint (project-level,
   accessible to any org member):
   `https://dev.azure.com/<ORG>/_apis/projects?api-version=7.0`
   (legacy hosts: `https://<ORG>.visualstudio.com/_apis/projects?api-version=7.0`)

c. **If no org** — probe the VSSPS profile (works for any signed-in user, no org permission):
   `https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0`

> **Avoid `/_apis?api-version=7.0` (org API-discovery).** Some orgs restrict it to admins
> (e.g. `o365exchange.visualstudio.com` returns `AccessCheckException` to non-admins). A
> successful login followed by a 403 there makes the agent wrongly report "auth failed" when
> auth actually worked. The `/_apis/projects` endpoint avoids this trap.

## Process

1. **Parse the org** from `$ARGUMENTS` (optional). Select the probe URL per the priority above.
2. **Tell the user** you're setting up ADO auth and a browser Azure AD login may be required,
   which you'll relay and wait for.
3. **Use `sandbox-auth:egress-auth`** — follow its **"set up auth for a probe URL"** procedure
   with `PROBE_URL = <selected URL>` and `BUDGET = 300`. It runs the engine
   (`${CLAUDE_PLUGIN_ROOT}/scripts/sandbox-auth-fetch.py`), polls internally, and relays any
   `[HITL_REQUIRED]` prompt. **Do not write your own retry loop.**
4. **Report** SUCCESS / FAILED / TIMEOUT per the `egress-auth` exit-code table. On SUCCESS the
   user can call `dev.azure.com` and `*.visualstudio.com`; the token is cached for the session.

## Scope

Azure DevOps default scope: `499b84ac-1321-427f-aa17-267ca6975798/.default` (set by the egress
policy, not by this skill). The user needs an ADO account with access to the target organization.
Everything else — never bypass the proxy, never call ADO before SUCCESS, one auth per session —
is enforced by `sandbox-auth:egress-auth`.
