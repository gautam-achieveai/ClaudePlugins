#!/usr/bin/env python3
# warm-github-auth.py
#
# Warm the gateway's auth-token cache for GitHub (or any host) by driving one or
# more lightweight, idempotent probes through sandbox-auth-fetch.py. After the
# probes succeed, token-UNAWARE tools — `git clone/fetch/push`, `gh`, `npm`,
# `pip` — work transparently, because the egress proxy injects the cached
# Authorization header server-side. Those tools cannot understand the
# `auth_pending` HTTP 511 handshake themselves, so they must be "warmed" first.
#
# Usage:
#   # Warm the REST API surface (default):
#   python3 warm-github-auth.py --api
#
#   # Warm the git smart-HTTP endpoint for a specific repo, then clone:
#   python3 warm-github-auth.py --git-url https://github.com/OWNER/REPO.git
#   git clone https://github.com/OWNER/REPO.git
#
#   # Warm and run the real command in a single call (everything after `--`):
#   python3 warm-github-auth.py --git-url https://github.com/OWNER/REPO.git \
#       -- git clone https://github.com/OWNER/REPO.git
#
# Probe selection (repeatable / combinable):
#   --api               probe https://api.github.com/                 (on by default)
#   --web               probe https://github.com/
#   --git-url URL       probe URL's /info/refs?service=git-upload-pack (git smart-HTTP)
#   --probe-url URL     probe an arbitrary idempotent GET URL (any host)
#
# Exit codes mirror sandbox-auth-fetch.py and short-circuit on the first failing
# probe:
#   0   all probes warm (and any passthrough command's own exit code if it ran)
#   10  denied by policy        -> do NOT run the real command; report the reason
#   11  auth-pending timeout     -> a human must finish the login; relay + retry
#   12  proxy env missing
#   20  allowed but upstream non-2xx (e.g. injected creds rejected by GitHub)
#   30  transport error
#   2   usage error

import argparse
import os
import subprocess
import sys
import urllib.parse


def eprint(*parts):
    print(*parts, file=sys.stderr, flush=True)


def script_dir():
    return os.path.dirname(os.path.abspath(__file__))


def fetch_script_path():
    return os.path.join(script_dir(), "sandbox-auth-fetch.py")


def git_probe_url(git_url):
    """Turn a clone URL into its git smart-HTTP discovery URL.

    https://github.com/OWNER/REPO(.git) -> .../REPO.git/info/refs?service=git-upload-pack
    """
    parsed = urllib.parse.urlparse(git_url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("only HTTP(S) git URLs can be warmed, got %r" % git_url)
    path = parsed.path
    if not path.endswith(".git") and not path.endswith("/info/refs"):
        path = path.rstrip("/") + ".git"
    if not path.endswith("/info/refs"):
        path = path.rstrip("/") + "/info/refs"
    return urllib.parse.urlunparse(
        (parsed.scheme, parsed.netloc, path, "", "service=git-upload-pack", "")
    )


def run_probe(url, timeout, max_attempts, sock_timeout):
    cmd = [
        sys.executable, fetch_script_path(),
        "--url", url,
        "--method", "GET",
        "--timeout", str(timeout),
        "--max-attempts", str(max_attempts),
        "--sock-timeout", str(sock_timeout),
        # The probe is only for warming; discard its (potentially large) body.
        "--max-body-bytes", "0",
        "--output", os.devnull,
    ]
    eprint("WARM_PROBE: %s" % url)
    # stdout of the probe (the result JSON) is suppressed; stderr (progress +
    # [HITL_REQUIRED] lines) flows through so the agent can relay device-code prompts.
    return subprocess.call(cmd, stdout=subprocess.DEVNULL)


def build_parser():
    p = argparse.ArgumentParser(
        prog="warm-github-auth.py",
        description="Warm GitHub (or any host) egress auth, then optionally run a command.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--api", action=argparse.BooleanOptionalAction, default=True,
                   help="Probe https://api.github.com/.")
    p.add_argument("--web", action="store_true", help="Probe https://github.com/.")
    p.add_argument("--git-url", action="append", default=[], metavar="URL",
                   help="GitHub HTTPS clone URL to warm via /info/refs (repeatable).")
    p.add_argument("--probe-url", action="append", default=[], metavar="URL",
                   help="Arbitrary idempotent GET URL to warm (repeatable).")
    p.add_argument("--timeout", type=float, default=300.0, help="Overall timeout per probe (seconds).")
    p.add_argument("--max-attempts", type=int, default=20, help="Max attempts per probe.")
    p.add_argument("--sock-timeout", type=float, default=30.0, help="Per-request socket timeout (seconds).")
    p.add_argument("command", nargs=argparse.REMAINDER,
                   help="Optional command to run after warming. Prefix with `--`.")
    return p


def main(argv):
    args = build_parser().parse_args(argv)

    probes = []
    if args.api:
        probes.append("https://api.github.com/")
    if args.web:
        probes.append("https://github.com/")
    for raw in args.git_url:
        try:
            probes.append(git_probe_url(raw))
        except ValueError as exc:
            eprint("ERROR: %s" % exc)
            return 2
    probes.extend(args.probe_url)

    # De-duplicate while preserving order.
    seen, unique = set(), []
    for probe in probes:
        if probe not in seen:
            seen.add(probe)
            unique.append(probe)

    if not unique:
        eprint("ERROR: no probes selected; use --api, --web, --git-url, or --probe-url")
        return 2

    for probe in unique:
        code = run_probe(probe, args.timeout, args.max_attempts, args.sock_timeout)
        if code != 0:
            eprint("WARM_FAILED: probe=%s exit_code=%d" % (probe, code))
            return code

    command = list(args.command)
    if command and command[0] == "--":
        command = command[1:]

    if not command:
        eprint("WARM_OK")
        return 0

    eprint("WARM_OK_RUNNING_COMMAND: %s" % " ".join(command))
    return subprocess.call(command, env=os.environ.copy())


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
