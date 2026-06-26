# sandbox-auth

Authenticate outbound network calls from inside a sandbox that runs behind a **MITM
egress-proxy + gateway auth-webhook** architecture (e.g. SandboxedOstoolsMcpServer), where
**tokens are injected server-side and the agent never holds credentials**.

The agent does not run `gh auth login` or manage PATs. Authentication is transparent *except*
for the **`auth_pending` HTTP 511 handshake** that occurs while an out-of-band login (OAuth
device-code, Azure AD browser sign-in, or human approval) completes. This plugin gives the agent
the mental model, a precise response decision table (HTTP **511** = pending, **403
`{"error":"denied"}`** = deny), a backoff polling loop, a human-in-the-loop relay for login
prompts, and a **warm-then-run** pattern so token-unaware tools (`git`, `gh`, `npm`, `pip`)
succeed after a lightweight probe primes the gateway's cache.

> **Authenticate first.** The sandbox blocks unauthenticated egress. Before the first request to
> any protected service, set up auth with the matching skill below — the agent should treat this
> as a required first step, not an afterthought.

## Skills

One **common** skill owns all the mechanics; the **service skills are thin wrappers** that just
choose a probe URL / scopes and **invoke the common skill** (DRY — no duplicated handshake logic).

| Skill | Invocation | Role |
|-------|-----------|------|
| `egress-auth` | model-invoked (automatic) | **Common core.** Fires when any outbound call returns `511`/`auth_pending`/proxy weirdness. Owns the wire contract, the Python probe/poll engine, HITL relay, token-injection model, and the warm-then-run pattern. Exposes a reusable **"set up auth for a probe URL"** procedure the others call. |
| `github` | `/sandbox-auth:github [repo-url]` | Set up GitHub auth FIRST; warm REST or git smart-HTTP, then run `git`/`gh`. |
| `azure-devops` | `/sandbox-auth:azure-devops [org]` | Set up Azure DevOps auth FIRST; picks a safe probe URL (avoids the `/_apis` org-discovery ACL trap). |
| `microsoft-graph` | `/sandbox-auth:microsoft-graph [scopes]` | Set up Microsoft Graph (M365) auth FIRST. |
| `connect` | `/sandbox-auth:connect <probe-url>` | Generic FIRST-step setup for any other service configured in the egress policy. |

## Contents

| Path | Purpose |
|------|---------|
| `skills/egress-auth/SKILL.md` | The common skill: mental model, decision table, engine invocation, polling algorithm, HITL relay, warm-then-run, and the reusable per-URL procedure. |
| `skills/github,azure-devops,microsoft-graph,connect/SKILL.md` | Thin user-invocable service skills that reference and invoke `egress-auth`. |
| `scripts/sandbox-auth-fetch.py` | Auth-aware fetch + `auth_pending` poller. Single JSON result to stdout, `[HITL_REQUIRED]` lines to stderr, distinct exit codes. Uses `requests` if present, else stdlib `urllib`. |
| `scripts/warm-github-auth.py` | Warms GitHub (REST, web, or git smart-HTTP `info/refs`) and optionally runs a passthrough command (`-- <cmd>`). |
| `references/architecture.md` | The proxy -> gateway -> auth-webhook flow and the exact 511/403 wire contracts. |

## Why Python (not curl/git)

On the Windows local backend, native Schannel tools (`curl.exe`, `Invoke-WebRequest`,
git-for-Windows) reject the proxy's MITM CA and ignore `CURL_CA_BUNDLE`. Python honors
`REQUESTS_CA_BUNDLE`/`SSL_CERT_FILE`, making it the single portable path across both
Docker/Linux and Windows-local sandboxes. The helpers are stdlib-only by default (no
`pip install` required); `requests` is used automatically if it happens to be installed.

## Quick start (inside a sandbox)

```bash
# Probe + resolve auth for the GitHub API:
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/sandbox-auth-fetch.py" --url https://api.github.com/

# Warm auth, then clone (token injected transparently by the proxy):
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/warm-github-auth.py" \
  --git-url https://github.com/OWNER/REPO.git \
  -- git clone https://github.com/OWNER/REPO.git
```

Exit codes: `0` allowed * `10` denied * `11` auth-pending timeout * `12` proxy env missing *
`20` allowed-but-upstream-non-2xx * `30` transport error.

## License

MIT
