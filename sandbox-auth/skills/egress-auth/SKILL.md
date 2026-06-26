---
name: egress-auth
description: >-
  Core sandbox egress authentication skill — the shared engine that the
  github / azure-devops / microsoft-graph / connect skills reference and invoke.
  Authentication is a REQUIRED FIRST STEP for any outbound call in the sandbox: the
  proxy blocks unauthenticated egress. Use whenever an outbound network call from inside
  a sandbox (git clone/fetch/push,
  gh, curl, wget, npm, pip, or a language HTTP client) targeting github.com,
  api.github.com, raw.githubusercontent.com, a package registry, or any external host
  returns an HTTP 511 (Network Authentication Required) with header
  `x-sandbox-proxy-status: auth_pending` or a body `{"status":"auth_pending",...}`,
  an HTTP 403 `{"error":"denied",...}`, or whenever a
  network command hangs, fails TLS, or behaves oddly behind the egress proxy. Also use
  PROACTIVELY before running token-unaware tools (git/gh/npm/pip) against GitHub to warm
  the auth cache. Owns the wire contract, the probe/poll engine, backoff polling,
  human-in-the-loop relay of login prompts, transparent server-side token injection, and
  the warm-then-run pattern. Other skills delegate the handshake mechanics here.
allowed-tools:
  - Read
  - Bash
---

# Authenticating outbound network calls inside the sandbox

You are running inside a network-isolated sandbox. You **cannot** reach the internet
directly. Every outbound HTTP(S) request is forced through an **egress forward proxy**
that terminates TLS (MITM, with a CA your tools already trust) and asks a **gateway**
whether to allow the request — and, if so, which credentials to inject.

## Mental model — read this first

1. **You never hold tokens.** Do not run `gh auth login`, do not ask the user for a PAT,
   and do not put `Authorization` headers in your requests. The gateway's auth webhook
   mints/fetches the token and the **proxy injects it into the upstream request
   server-side**. The token is invisible to you and must never appear in your output.
2. **Auth is transparent — except one case.** Almost every authenticated request "just
   works": you call `https://api.github.com/...` and a real response comes back. The one
   exception is **`auth_pending` — HTTP `511 Network Authentication Required`**, which
   happens while an out-of-band login (OAuth device-code, or a human approval) is still in
   progress. `511` is the captive-portal code: "authenticate to gain network access." It
   is deliberately **not** a `2xx`, so it can never be mistaken for a successful response.
3. **`auth_pending` is a handshake, not an answer.** When you see it, **poll** the same
   request until the gateway resolves it to Allow (real response) or Deny (403). If the
   pending `message` asks a human to do something (e.g. "visit a URL, enter a code"),
   **relay it to the human and wait**.
4. **The proxy env is already set for you.** `HTTP_PROXY`/`HTTPS_PROXY` carry a
   per-sandbox token as basic-auth userinfo; `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` /
   `CURL_CA_BUNDLE` point at the CA. Do not override or echo these — the helper scripts
   read them automatically.

## Use Python, not curl/git, to probe auth

The helper scripts are **Python** on purpose. On the Windows local backend, native
Schannel tools (`curl.exe`, `Invoke-WebRequest`, git-for-Windows) reject the proxy's MITM
CA and ignore `CURL_CA_BUNDLE`. Python honors `REQUESTS_CA_BUNDLE`/`SSL_CERT_FILE`, so it
is the single portable path across Docker/Linux **and** Windows-local sandboxes. Use the
helpers to probe/resolve auth; once warmed, native `git`/`gh` data transfers work because
the token injection is transparent.

## The decision table — classify EVERY response

Check, in this order: the **header**, then the **status + body shape**.

| Signal | Meaning | What you do |
|---|---|---|
| Header `x-sandbox-proxy-status: auth_pending` **OR** body `{"status":"auth_pending",...}` **OR** status `511` | **AUTH PENDING** — out-of-band login in progress. Body has `request_id`, `retry_after_seconds`, `message`. | Enter the **polling loop** (the helper does this). If `message` requires a user action, **relay it to the human** and keep polling. |
| Status `403` with body `{"error":"denied","reason":"..."}` | **DENIED by policy.** No token will be issued for this. | **Stop.** Report the `reason`. Do not retry. Do not try to bypass the proxy. |
| Status `2xx` (no auth_pending marker) | **ALLOWED.** Token was injected (or none needed). Real upstream response. | Proceed — use the body. |
| Status `4xx`/`5xx` that is **not** the `403 denied` shape and **not** auth_pending (e.g. a 401/404 from GitHub) | **Genuine upstream error.** | Handle as a normal API error. Do NOT treat as a proxy/auth problem. |
| Connection refused / TLS error / no response | Likely **proxy env missing** or CA not trusted. | Check `HTTPS_PROXY` and the CA bundle vars are set; use the Python helper (not curl.exe/IWR on Windows). |

> **The marker, not the status code, is authoritative.** Pending is identified by the
> `x-sandbox-proxy-status: auth_pending` header / `status: "auth_pending"` body; the helper
> also treats a bare `511` as pending. This keeps one client correct across gateways that
> emit `511` (this contract), a legacy `403 "login in progress"`, or an older `202` — and a
> real upstream `2xx`/`202 Accepted` is never mistaken for pending because it carries no
> marker. Deny is **only** the `403 {"error":"denied"}` shape.

## The helper — your primary tool

`/skills/egress-auth/scripts/sandbox-auth-fetch.py` performs a request through the injected
proxy + CA, classifies the response, and polls through `auth_pending` with capped exponential
backoff until Allow, Deny, or timeout.

NOTE: invoke the helper by its absolute sandbox path (below) — the skill mounts at
`/skills/egress-auth/`, and your working directory is the workspace, so a relative path will not
resolve.

```bash
python3 "/skills/egress-auth/scripts/sandbox-auth-fetch.py" \
  --url "https://api.github.com/" \
  --method GET \
  --timeout 300 \
  --max-attempts 20
```

(Use `python` if `python3` is not on PATH. Add `--once` to classify a single response
without polling.)

### Output contract — rely on this

- **stdout:** exactly **one JSON object** describing the final outcome (`status`,
  `http_status`, `attempts`, and `reason`/`message`/`request_id`/`verification_url`/`body`
  as applicable). Parse this.
- **stderr:** human-readable progress, plus — whenever a human must act — a line you MUST
  relay verbatim: `[HITL_REQUIRED] <message>`.
- **Exit codes:**

  | Code | Meaning | Your action |
  |---|---|---|
  | `0`  | **Allowed**, upstream `2xx`. Auth resolved and cached. | Proceed; warm succeeded. |
  | `10` | **Denied** by policy. | Stop; report `reason`. Do not retry or bypass. |
  | `11` | **Auth-pending timeout** (deadline / max attempts / refused unsafe retry). | Relay the last `[HITL_REQUIRED]` message + `verification_url` to the human, wait for them to finish login, then re-run the same command. |
  | `12` | **Proxy env missing/misconfigured.** | Report the environment problem; do not retry blindly or go direct. |
  | `20` | **Allowed but upstream non-2xx** (e.g. GitHub returned 401/404/5xx). | Handle as an upstream error; injected creds may be wrong or the endpoint failed. |
  | `30` | **Transport/other error.** | Treat as a normal network failure. |
  | `2`  | **Usage error** (bad args). | Fix the invocation. |

## The polling algorithm (what the helper does)

1. Send the request once; classify it.
2. If **auth_pending**: take the wait from body `retry_after_seconds` (else the
   `Retry-After` header, else the configured backoff). Sleep that long.
3. **Retry the SAME idempotent request.** Only `GET`/`HEAD`/`OPTIONS` are retried
   automatically. For unsafe methods (`POST`/`PUT`/`PATCH`/`DELETE`) the helper refuses to
   auto-retry and exits `11` — warm with a GET first, then issue the mutation once.
4. Backoff grows `×2`, capped at `--max-backoff`; the gateway's `retry_after_seconds`
   always takes precedence.
5. Stop on **Allowed** (`0`/`20`), **Denied** (`10`), `--max-attempts`, or the overall
   `--timeout` (`11`).

## Reusable procedure: "set up auth for a probe URL"

**Other skills in this plugin invoke this procedure** — `connect`, `azure-devops`, and
`microsoft-graph` are thin wrappers that only choose the right probe URL/scopes and then
delegate the handshake here. When you are sent here with a `PROBE_URL` (and optional
`BUDGET` seconds, default `300`), do exactly this:

1. Run the engine against the probe URL (it polls through `auth_pending` internally — do
   **not** wrap it in your own retry loop):

   ```bash
   python3 "/skills/egress-auth/scripts/sandbox-auth-fetch.py" \
     --url "$PROBE_URL" --method GET --timeout "${BUDGET:-300}" --max-body-bytes 0
   ```

2. While it runs, **relay every `[HITL_REQUIRED]` line verbatim** to the human (see the HITL
   section) so they can complete any browser/device-code login.

3. Map the exit code to a verdict and report it to the user:

   | Exit | Verdict | Tell the user |
   |---|---|---|
   | `0`  | **SUCCESS** | Auth for `<host>` is ready; subsequent calls are transparent. Mention elapsed time if notable. |
   | `10` | **FAILED (denied)** | Policy denied this host; report `reason`. Do not retry/bypass. |
   | `11` | **TIMEOUT** | Login did not complete in time; relay the pending `message`/`verification_url` and ask to retry. |
   | `12` | **FAILED (proxy env)** | Egress proxy env is missing/misconfigured — an environment problem. |
   | `20` | **FAILED (upstream)** | Token injected but the service returned non-2xx; likely scopes/permissions or a bad probe URL. |
   | `30`/`2` | **FAILED** | Transport or usage error; fix and retry. |

4. **Never make real API calls before this reports SUCCESS**, and after SUCCESS you do **not**
   re-run per request — the proxy caches the token for the host.


## HITL relay of device-code / login prompts

When the helper prints `[HITL_REQUIRED] ...` (typically a device-code flow), surface it to
the human **verbatim and prominently**, then pause:

- Quote the `message`, the `verification_url`, and any code exactly. Do not summarize away
  URLs, codes, request IDs, or org-approval instructions.
  > Example relay: "GitHub authentication is pending. Please visit
  > https://github.com/login/device and enter `CODE-1234`, then tell me to continue."
- Never invent codes or URLs. If the `message` has no actionable URL, report that the
  gateway is waiting on an out-of-band approval, give the `request_id`, and ask the human
  to approve on their side.
- After the human confirms, re-run the helper (or the warm wrapper). Tokens are cached on
  success, so the next call resolves immediately.

## Warm-then-run (for git / gh / npm / pip)

These tools cannot parse `auth_pending`, so **warm the cache first** with an idempotent
probe, then run the real command — which now sails through because the token is injected
transparently and cached (keyed on session+provider+rule+host+port+scopes).

`/skills/egress-auth/scripts/warm-github-auth.py` drives the probes for you:

```bash
# Warm the REST API surface (default probe = https://api.github.com/):
python3 "/skills/egress-auth/scripts/warm-github-auth.py" --api
gh api /user

# Warm the git smart-HTTP endpoint for a specific repo, then clone:
python3 "/skills/egress-auth/scripts/warm-github-auth.py" --git-url https://github.com/OWNER/REPO.git
git clone https://github.com/OWNER/REPO.git

# Warm AND run the real command in one call (everything after `--`):
python3 "/skills/egress-auth/scripts/warm-github-auth.py" \
  --git-url https://github.com/OWNER/REPO.git \
  -- git clone https://github.com/OWNER/REPO.git

# Warm an arbitrary host before installing from it:
python3 "/skills/egress-auth/scripts/warm-github-auth.py" --no-api --probe-url https://<registry>/
```

Rules for warming:
- The probe must be **idempotent and cheap** (a `GET` to a root/metadata endpoint).
- If warming exits **`10` (denied)**, do **not** run the real command — it will also be
  denied. Report the reason.
- If warming exits **`11` (pending-timeout)**, do the **HITL relay**, wait, then warm again.
- Warm once per host per session — you need not re-warm before every command.

## Failure & edge cases

- **Timeout exhausted (exit 11):** treat as "needs a human". Relay the message +
  `request_id` + `verification_url`, pause, and retry after confirmation. Never silently
  give up or fabricate success.
- **Looping pending with no change:** after the human says they finished login, warm once
  more. If it still times out, report that the gateway never resolved the pending auth and
  surface the `request_id` for an operator. Do not spin forever.
- **Deny (exit 10):** final. Report `reason`. Never bypass the proxy, disable CA
  verification, hit raw IPs, or use a different egress path.
- **Proxy env missing (exit 12):** report that `HTTP_PROXY`/`HTTPS_PROXY` and the CA bundle
  vars are not set — an environment/config problem, not something you fix by retrying.
- **Windows TLS rejection:** if a native tool fails TLS against the proxy, that is expected
  (Schannel rejects the MITM CA). Use the Python helper to probe/warm; native `git`/`gh`
  data transfers then work via transparent injection.
- **Never echo secrets:** you never receive an `Authorization` token, and you must never
  print, log, or store one. The helpers strip caller-supplied `Authorization` /
  `Proxy-Authorization` headers as defense-in-depth.

## Reference

For the full architecture (proxy → gateway → auth-webhook flow, the exact 511/403 wire
contracts, and the injected env vars), read `references/architecture.md`.
