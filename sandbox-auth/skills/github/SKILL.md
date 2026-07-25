---
name: github
description: >-
  ALWAYS use this FIRST — before any GitHub operation — to authenticate the sandbox.
  Trigger this before: cloning/fetching/pushing a github.com repo (git), running `gh`,
  calling api.github.com / raw.githubusercontent.com via curl/wget/HTTP clients, or
  installing from GitHub with npm/pip. The sandbox blocks unauthenticated egress, so
  GitHub calls will fail until this runs. It triggers the egress proxy's auth handshake
  (may need an out-of-band / device-code login, which it relays) and warms the cache.
  Do NOT call GitHub or run git/gh until this reports SUCCESS.
argument-hint: "[optional: a repo URL to warm, e.g. https://github.com/OWNER/REPO.git]"
allowed-tools: Bash Read
user-invocable: true
shell: bash
---

# GitHub — sandbox auth setup (and warm-then-run)

Set up GitHub auth through the sandbox egress proxy before any GitHub call. This is a
**prerequisite** — the proxy must acquire and cache a token on the user's behalf, which it then
injects server-side (you never hold it).

This skill is a **thin wrapper**: it picks the right GitHub probe and reports the result. The
handshake itself — wire contract, polling through `auth_pending`, the device-code login relay,
token injection, exit-code handling, and the **warm-then-run** pattern — is owned by the
**`sandbox-auth:egress-auth`** skill. **Do not reimplement it here.**

## Which surface to warm

GitHub has two independently-authenticated surfaces — pick by what the user will do next:

- **REST/API work** (`gh api`, HTTP clients) → probe `https://api.github.com/user`
  (or `https://api.github.com/` for an unauthenticated-but-reachable check).
- **Git data transfer** (`git clone/fetch/push` of a specific repo) → warm that repo's
  smart-HTTP endpoint: `https://github.com/OWNER/REPO.git/info/refs?service=git-upload-pack`.

## Process

1. **Parse `$ARGUMENTS`** — if it's a repo URL, you're warming git for that repo; otherwise default
   to the REST API surface.
2. **Tell the user** you're setting up GitHub auth and that a device-code / browser login may be
   required, which you'll relay verbatim and wait for.
3. **Run the handshake by using `sandbox-auth:egress-auth`.** Two equivalent paths — prefer (b)
   when the user wants to run a git/gh command right after:

   a. **Probe only** — follow `egress-auth`'s **"set up auth for a probe URL"** procedure with the
      probe URL chosen above (`BUDGET = 300`).

   b. **Warm-then-run** — use `egress-auth`'s **warm-then-run** section, which drives
      `${CLAUDE_PLUGIN_ROOT}/scripts/warm-github-auth.py` and can execute the real command after the
      cache is primed, e.g.:
      ```bash
      python3 "${CLAUDE_PLUGIN_ROOT}/scripts/warm-github-auth.py" \
        --git-url "$ARGUMENTS" -- git clone "$ARGUMENTS"
      ```
      For the REST surface: `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/warm-github-auth.py" --api` then `gh api /user`.

   In both paths, **relay any `[HITL_REQUIRED]` line verbatim** and **do not write your own retry
   loop** — the engine polls internally.
4. **Report** SUCCESS / FAILED / TIMEOUT per the `egress-auth` exit-code table. On SUCCESS, native
   `git`/`gh`/`npm`/`pip` calls to GitHub then work transparently (token injected + cached for the
   session) — no need to re-warm before every command.

Everything else — never bypass the proxy, never echo tokens, never call GitHub before SUCCESS,
Windows Schannel TLS notes — is enforced/explained by `sandbox-auth:egress-auth`.
