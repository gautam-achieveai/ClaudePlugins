# Egress auth architecture (reference)

This sandbox is network-isolated. All outbound HTTP(S) is forced through an egress
forward proxy that MITM-terminates TLS (using a CA your tools already trust) and delegates
every allow/deny/credential decision to a gateway policy engine.

```
sandbox tool ──HTTPS──▶ egress proxy (MITM, trusted CA) ──▶ upstream (github.com, ...)
                            │
                            └─ POST /api/v1/proxy/request-eval ─▶ gateway policy engine
                                                                     │ (priority rules,
                                                                     │  default-DENY; a
                                                                     │  matched ALLOW rule
                                                                     │  may name auth_provider)
                                                                     └─▶ app auth webhook
                                                                            ├ allow + headers (+expires/cache_ttl) ▶ proxy INJECTS upstream, caches
                                                                            ├ deny + reason                        ▶ 403 {"error":"denied","reason":...}
                                                                            └ pending (out-of-band login)          ▶ 511 auth_pending
```

## Injected sandbox env

- `HTTP_PROXY` / `HTTPS_PROXY` (and lowercase) = `http://sandbox:<proxy_token>@<host>:<port>`
  — a per-sandbox token as basic-auth userinfo. This is **not** a GitHub token.
- `REQUESTS_CA_BUNDLE`, `SSL_CERT_FILE`, `CURL_CA_BUNDLE` = path to the proxy's MITM CA.

## Transparent token injection

When a matched ALLOW rule names an `auth_provider`, the gateway calls the app's auth
webhook, which returns an `Authorization` header (e.g. `Bearer <token>`). The proxy injects
it into the upstream request **server-side** and caches it. The agent never sees or holds
the token. Cache key: session + provider + rule + host + port + scopes — so warming one
idempotent probe primes the cache for every subsequent call to that host.

## `auth_pending` (HTTP 511) contract

Emitted while an out-of-band login (OAuth device-code or human approval) is in progress.
The status is **`511 Network Authentication Required`** (RFC 6585 §6) — the captive-portal
code meaning "you must authenticate to gain network access." It is intentionally **not** a
`2xx` (so a naive client can never read it as success) and **not** a `401`/`407` (so HTTP
clients do not auto-resend cached credentials — a *human*, not the client, completes login).

- Headers: `x-sandbox-proxy-status: auth_pending`, `x-sandbox-auth-request-id: <id>`,
  `retry-after: <seconds>`, `cache-control: no-store`, `content-type: application/json`.
- Body: `{"status":"auth_pending","request_id":"<id>","retry_after_seconds":<N>,"message":"<human readable, may contain a device-code URL>"}`.

Resolution: poll the same idempotent request until the gateway flips it to Allow (real
upstream response) or Deny (403). The `message` may instruct a human to complete a login —
relay it verbatim and wait.

> **Identify pending by the marker, not the bare code.** Branch on the
> `x-sandbox-proxy-status: auth_pending` header / `status: "auth_pending"` body first; the
> `511` status is the secondary signal. The shipped helper additionally tolerates sibling
> gateways that emit a legacy `403 "login in progress"` prose body (matched only when the
> body is **not** the `{"error":"denied"}` deny shape) or an older `202 auth_pending`, so a
> single client stays correct across contract versions.

## deny (HTTP 403) contract

- Body: `{"error":"denied","reason":"<why>"}`. Final — no token will be issued for this
  destination. A 403 *without* this shape is a genuine upstream 403 (rate limit, repo
  permissions), not a proxy deny.

## Platform notes

- **Docker/Linux:** `curl` works (`CURL_CA_BUNDLE` honored), but the shipped helpers are
  Python for parity with Windows.
- **Windows-local:** Schannel (curl.exe, Invoke-WebRequest, git-for-Windows) rejects the
  MITM CA and ignores `CURL_CA_BUNDLE`. **Python** (`requests`/`urllib`) honors
  `REQUESTS_CA_BUNDLE`/`SSL_CERT_FILE` and sends preemptive proxy auth — use the Python
  helper to probe/warm. Once warmed, native `git`/`gh` data transfers succeed because the
  token injection is transparent.
