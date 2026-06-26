#!/usr/bin/env python3
# sandbox-auth-fetch.py
#
# Auth-aware fetch + auth_pending poller for the SandboxedOstoolsMcpServer egress
# architecture. Portable across both sandbox backends:
#   - Docker/Linux containers
#   - Windows-native local sandboxes
#
# Why Python (and not curl/git)?
#   Windows Schannel (curl.exe, Invoke-WebRequest, git-for-windows) rejects the
#   egress proxy's MITM CA and ignores CURL_CA_BUNDLE. Python honors
#   REQUESTS_CA_BUNDLE / SSL_CERT_FILE, so it is the single portable path. This
#   script uses `requests` when available and otherwise falls back to the
#   standard-library `urllib` (no pip install required).
#
# What it does
#   Performs an HTTP(S) request through the injected egress proxy
#   (HTTP_PROXY/HTTPS_PROXY, which embed a per-sandbox token as basic-auth
#   userinfo), trusting the proxy's MITM CA, and classifies the response as:
#     - allowed  : a real upstream response (token, if any, was injected by the
#                  proxy server-side; the agent never sees it).
#     - pending  : the egress proxy is holding the request for an out-of-band
#                  login (OAuth device-code / browser / human approval). Detected
#                  by the header `x-sandbox-proxy-status: auth_pending`, a body
#                  `{"status":"auth_pending",...}`, an HTTP 511 Network
#                  Authentication Required (this repo's contract), or a sibling
#                  gateway's legacy 403 "login in progress" body.
#     - denied   : HTTP 403 whose JSON body is `{"error":"denied","reason":...}`.
#   On `pending` it polls the SAME idempotent request with capped exponential
#   backoff (the gateway's `retry_after_seconds` / `Retry-After` always wins)
#   until the auth resolves, the deadline passes, or attempts are exhausted.
#
# OUTPUT CONTRACT (relied on by the SKILL.md)
#   stdout : exactly one JSON object describing the final outcome (always).
#   stderr : human-readable progress, plus — whenever auth is pending and a
#            human action is required — a line that MUST be relayed verbatim:
#              [HITL_REQUIRED] <message from the auth system>
#   exit   : 0   allowed  AND upstream 2xx   (warm/cache success)
#            2   usage error (bad arguments)
#            10  denied by proxy policy       (do not retry; report reason)
#            11  auth-pending timeout / max attempts / refused unsafe retry
#            12  proxy env missing/misconfigured (sandbox egress not set up)
#            20  allowed but upstream returned non-2xx (e.g. 401/404/5xx)
#            30  transport / network / unexpected error
#
# SECURITY
#   The agent never receives or holds an Authorization token — the proxy injects
#   it server-side. This script refuses caller-supplied Authorization /
#   Proxy-Authorization headers and never prints injected credentials.

import argparse
import json
import os
import ssl
import sys
import time

RESULT_VERSION = "1.0.0"

EXIT_OK = 0
EXIT_USAGE = 2
EXIT_DENIED = 10
EXIT_PENDING_TIMEOUT = 11
EXIT_PROXY_MISSING = 12
EXIT_UPSTREAM_ERROR = 20
EXIT_TRANSPORT = 30

CA_ENV_VARS = ("REQUESTS_CA_BUNDLE", "SSL_CERT_FILE", "CURL_CA_BUNDLE")
SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
FORBIDDEN_HEADERS = ("authorization", "proxy-authorization")
HITL_MARKER = "[HITL_REQUIRED] "

# Legacy/sibling gateways that signal a pending handshake with a 403 + prose
# body (instead of 511 / a structured status). Only consulted for a 403 that is
# NOT the well-known deny shape, so a real deny is never read as pending.
LOGIN_IN_PROGRESS_MARKERS = (
    "login in progress",
    "auth in progress",
    "authentication in progress",
    "authentication is still in progress",
    "consent pending",
    "authorization pending",
)


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def emit_stdout(obj):
    obj.setdefault("v", RESULT_VERSION)
    print(json.dumps(obj, sort_keys=True), flush=True)


def find_proxies():
    proxies = {}
    for scheme in ("http", "https"):
        for var in (scheme.upper() + "_PROXY", scheme + "_proxy"):
            val = os.environ.get(var)
            if val:
                proxies[scheme] = val
                break
    return proxies


def find_ca_bundle():
    for var in CA_ENV_VARS:
        path = os.environ.get(var)
        if path and os.path.exists(path):
            return path, var
    return None, None


def parse_json(body_bytes):
    if not body_bytes:
        return None
    try:
        return json.loads(body_bytes.decode("utf-8", "replace"))
    except (ValueError, TypeError):
        return None


def _looks_like_login_in_progress(body_json, body_bytes):
    haystacks = []
    if isinstance(body_json, dict):
        for key in ("status", "error", "message", "detail", "reason"):
            val = body_json.get(key)
            if isinstance(val, str):
                haystacks.append(val.lower())
    if not haystacks and body_bytes:
        haystacks.append(body_bytes.decode("utf-8", "replace").lower())
    text = " ".join(haystacks)
    return any(marker in text for marker in LOGIN_IN_PROGRESS_MARKERS)


def classify(status, headers_lower, body_json, body_bytes=b""):
    """One verdict that works against any sandbox gateway ("combine both patterns").

    PENDING is detected in priority order by:
      1. the authoritative header `x-sandbox-proxy-status: auth_pending`;
      2. a structured body `{"status": "auth_pending", ...}` (any status code);
      3. HTTP 511 Network Authentication Required — this repo's contract; the
         status code alone is conclusive even if the body did not parse;
      4. a legacy 403 "login in progress" prose body used by sibling gateways,
         matched ONLY when the body is not the deny shape.
    DENIED is HTTP 403 with `{"error": "denied", ...}` (and no pending header).
    Everything else is a real upstream response ("allowed"); a non-2xx upstream
    (a genuine 401/403/404/5xx from the origin) is surfaced as upstream_error by
    the caller, not confused with a proxy deny.
    """
    if headers_lower.get("x-sandbox-proxy-status", "").strip().lower() == "auth_pending":
        return "pending"
    if isinstance(body_json, dict) and body_json.get("status") == "auth_pending":
        return "pending"
    if status == 511:
        return "pending"
    if status == 403:
        # Terminal deny is checked before the legacy login-in-progress fallback
        # so a policy deny is never misread as a (retryable) pending state.
        if isinstance(body_json, dict) and body_json.get("error") == "denied":
            return "denied"
        if _looks_like_login_in_progress(body_json, body_bytes):
            return "pending"
    return "allowed"


def pending_wait_seconds(headers_lower, body_json, default_backoff, max_backoff):
    val = None
    if isinstance(body_json, dict) and isinstance(body_json.get("retry_after_seconds"), (int, float)):
        val = float(body_json["retry_after_seconds"])
    if val is None:
        ra = headers_lower.get("retry-after")
        if ra:
            try:
                val = float(ra)
            except ValueError:
                val = None
    if val is None:
        val = default_backoff
    return max(0.0, min(val, max_backoff))


def extract_pending_details(headers_lower, body_json):
    message, verification_url, request_id = None, None, None
    if isinstance(body_json, dict):
        message = body_json.get("message")
        request_id = body_json.get("request_id")
        for key in ("verification_url", "verification_uri", "verification_uri_complete"):
            if body_json.get(key):
                verification_url = body_json[key]
                break
    request_id = request_id or headers_lower.get("x-sandbox-auth-request-id")
    if not verification_url and isinstance(message, str):
        for token in message.replace("\n", " ").split():
            if token.startswith("http://") or token.startswith("https://"):
                verification_url = token.strip().rstrip(".,)\"'")
                break
    return message, verification_url, request_id


# ── Transport: prefer `requests`, fall back to stdlib `urllib` ───────────────

def _request_with_requests(url, method, headers, data, proxies, ca_bundle, sock_timeout):
    import requests  # noqa: WPS433 (deferred import; optional dependency)

    verify = ca_bundle if ca_bundle else True
    resp = requests.request(
        method=method,
        url=url,
        headers=headers,
        data=data,
        proxies={"http": proxies.get("http"), "https": proxies.get("https")},
        verify=verify,
        timeout=sock_timeout,
        allow_redirects=False,
    )
    headers_lower = {k.lower(): v for k, v in resp.headers.items()}
    return resp.status_code, headers_lower, resp.content


def _request_with_urllib(url, method, headers, data, proxies, ca_bundle, sock_timeout):
    import urllib.error
    import urllib.request

    ctx = ssl.create_default_context()
    if ca_bundle:
        try:
            ctx.load_verify_locations(cafile=ca_bundle)
        except Exception as exc:  # noqa: BLE001
            log("WARN: failed to load CA bundle %s: %s" % (ca_bundle, exc))
    handlers = [
        urllib.request.ProxyHandler(proxies),
        urllib.request.HTTPSHandler(context=ctx),
    ]
    opener = urllib.request.build_opener(*handlers)
    req = urllib.request.Request(url=url, data=data, method=method)
    for key, value in headers.items():
        req.add_header(key, value)
    try:
        resp = opener.open(req, timeout=sock_timeout)
        status = getattr(resp, "status", resp.getcode())
        headers_lower = {k.lower(): v for k, v in resp.getheaders()}
        return status, headers_lower, resp.read()
    except urllib.error.HTTPError as exc:
        # 4xx/5xx (including the proxy's 403 deny) arrive here with a body.
        try:
            headers_lower = {k.lower(): v for k, v in exc.headers.items()}
        except Exception:  # noqa: BLE001
            headers_lower = {}
        try:
            body = exc.read()
        except Exception:  # noqa: BLE001
            body = b""
        return exc.code, headers_lower, body


def do_request(url, method, headers, data, proxies, ca_bundle, sock_timeout):
    """Return (status, headers_lower, body_bytes) or raise on transport error."""
    try:
        import requests  # noqa: F401
        has_requests = True
    except Exception:  # noqa: BLE001
        has_requests = False
    if has_requests:
        return _request_with_requests(url, method, headers, data, proxies, ca_bundle, sock_timeout)
    return _request_with_urllib(url, method, headers, data, proxies, ca_bundle, sock_timeout)


def decode_body(body_bytes, max_body_bytes):
    if not body_bytes:
        return "", False
    truncated = len(body_bytes) > max_body_bytes
    clipped = body_bytes[:max_body_bytes]
    return clipped.decode("utf-8", "replace"), truncated


def build_parser():
    p = argparse.ArgumentParser(
        prog="sandbox-auth-fetch.py",
        description="Auth-aware fetch + auth_pending poller for the sandbox egress proxy.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--url", "-u", required=True, help="Target URL, e.g. https://api.github.com/")
    p.add_argument("--method", "-X", default="GET", help="HTTP method.")
    p.add_argument("--header", "-H", action="append", default=[], metavar="K:V",
                   help="Extra request header (repeatable). Do NOT pass Authorization — it is injected server-side.")
    p.add_argument("--data", "-d", default=None, help="Request body (string).")
    p.add_argument("--data-file", default=None, help="Read request body from this file.")
    p.add_argument("--output", "-o", default=None, help="Write the raw upstream body to this file on success.")
    p.add_argument("--max-body-bytes", type=int, default=65536,
                   help="Max body bytes echoed into the stdout JSON (raw body via --output is never truncated).")
    p.add_argument("--timeout", type=float, default=300.0, help="Overall deadline across all polling attempts (seconds).")
    p.add_argument("--max-attempts", type=int, default=20, help="Max attempts (0 = unlimited until --timeout).")
    p.add_argument("--initial-backoff", type=float, default=2.0, help="Initial pending backoff (seconds).")
    p.add_argument("--max-backoff", type=float, default=30.0, help="Max single backoff/sleep (seconds).")
    p.add_argument("--sock-timeout", type=float, default=30.0, help="Per-request socket timeout (seconds).")
    p.add_argument("--once", action="store_true",
                   help="Send a single request and classify it without polling (returns exit 11 if pending).")
    p.add_argument("--allow-unsafe-retry", action="store_true",
                   help="Permit auto-retry on pending for non-idempotent methods (use only if truly idempotent).")
    return p


def main(argv):
    args = build_parser().parse_args(argv)
    method = args.method.upper()

    # Request body.
    data = None
    if args.data_file:
        try:
            with open(args.data_file, "rb") as fh:
                data = fh.read()
        except OSError as exc:
            emit_stdout({"status": "usage_error", "detail": "cannot read --data-file: %s" % exc})
            return EXIT_USAGE
    elif args.data is not None:
        data = args.data.encode("utf-8")

    # Headers (strip server-owned auth headers).
    headers = {}
    for raw in args.header:
        if ":" not in raw:
            emit_stdout({"status": "usage_error", "detail": "bad --header (need K:V): %r" % raw})
            return EXIT_USAGE
        name, value = raw.split(":", 1)
        name, value = name.strip(), value.strip()
        if name.lower() in FORBIDDEN_HEADERS:
            log("WARN: ignoring caller-supplied %s; auth is injected by the proxy server-side." % name)
            continue
        headers[name] = value
    headers.setdefault("User-Agent", "sandbox-auth/%s" % RESULT_VERSION)

    proxies = find_proxies()
    if not proxies:
        emit_stdout({"status": "proxy_not_configured",
                     "detail": "No HTTP_PROXY/HTTPS_PROXY in env; sandbox egress is not configured."})
        return EXIT_PROXY_MISSING

    ca_bundle, ca_var = find_ca_bundle()
    if ca_bundle:
        log("INFO: trusting proxy CA from %s=%s" % (ca_var, ca_bundle))
    else:
        log("WARN: no CA bundle env (%s) found; MITM cert verification may fail." % "/".join(CA_ENV_VARS))

    auto_retry = method in SAFE_METHODS or args.allow_unsafe_retry
    if not auto_retry:
        log("INFO: %s is non-idempotent; auto-retry on pending is DISABLED "
            "(warm with a GET probe, then run the mutation once)." % method)

    start = time.monotonic()
    deadline = start + args.timeout
    backoff = max(0.1, args.initial_backoff)
    attempt = 0

    while True:
        attempt += 1
        log("INFO: attempt %d %s %s" % (attempt, method, args.url))
        try:
            status, headers_lower, body = do_request(
                args.url, method, headers, data, proxies, ca_bundle, args.sock_timeout)
        except Exception as exc:  # noqa: BLE001 (any transport failure)
            emit_stdout({"status": "error", "attempts": attempt, "message": str(exc)})
            return EXIT_TRANSPORT

        body_json = parse_json(body)
        kind = classify(status, headers_lower, body_json, body)

        if kind == "allowed":
            text, truncated = decode_body(body, args.max_body_bytes)
            if args.output:
                try:
                    with open(args.output, "wb") as fh:
                        fh.write(body or b"")
                except OSError as exc:
                    log("WARN: failed to write --output %s: %s" % (args.output, exc))
            ok = 200 <= status < 300
            emit_stdout({
                "status": "allowed" if ok else "upstream_error",
                "http_status": status,
                "attempts": attempt,
                "url": args.url,
                "body": text,
                "body_truncated": truncated,
            })
            return EXIT_OK if ok else EXIT_UPSTREAM_ERROR

        if kind == "denied":
            reason = body_json.get("reason") if isinstance(body_json, dict) else None
            log("DENIED by policy: %s" % (reason or "(no reason given)"))
            emit_stdout({"status": "denied", "http_status": status, "attempts": attempt, "reason": reason})
            return EXIT_DENIED

        # kind == "pending"
        message, verification_url, request_id = extract_pending_details(headers_lower, body_json)
        wait = pending_wait_seconds(headers_lower, body_json, backoff, args.max_backoff)
        # HITL: always surface the pending message so the agent can relay it verbatim.
        log(HITL_MARKER + (message or "Out-of-band authentication is in progress (request_id=%s)." % request_id))
        if verification_url:
            log("AUTH_PENDING action URL: %s" % verification_url)

        pending_payload = {
            "status": "pending_timeout",
            "http_status": status,
            "attempts": attempt,
            "request_id": request_id,
            "message": message,
            "verification_url": verification_url,
        }

        if args.once:
            pending_payload["reason"] = "once"
            emit_stdout(pending_payload)
            return EXIT_PENDING_TIMEOUT
        if not auto_retry:
            pending_payload["reason"] = "unsafe_method"
            log("Refusing to auto-retry non-idempotent %s on pending." % method)
            emit_stdout(pending_payload)
            return EXIT_PENDING_TIMEOUT
        if args.max_attempts and attempt >= args.max_attempts:
            pending_payload["reason"] = "max_attempts"
            emit_stdout(pending_payload)
            return EXIT_PENDING_TIMEOUT
        if time.monotonic() + wait >= deadline:
            pending_payload["reason"] = "deadline"
            emit_stdout(pending_payload)
            return EXIT_PENDING_TIMEOUT

        log("INFO: waiting %.1fs before retry (capped at %.1fs)..." % (wait, args.max_backoff))
        time.sleep(wait)
        backoff = min(backoff * 2.0, args.max_backoff)


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        log("INTERRUPTED")
        sys.exit(EXIT_TRANSPORT)
