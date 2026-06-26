#!/usr/bin/env bash
# probe-auth.sh — Two-phase auth probe for the sandbox egress proxy.
#
# Usage: bash probe-auth.sh <probe_url> [poll_max_secs] [poll_interval_secs]
#
# Phase 1 — TRIGGER: Send a short-timeout request to kick off the auth flow.
#   The egress proxy intercepts the request, calls the policy webhook, and
#   starts token acquisition. If the service requires interactive login
#   (Azure AD, OAuth2, ManualToken), the user's browser or a token dialog opens.
#   This initial request will almost certainly fail (403 "Login in progress",
#   407, timeout, etc.) — that is expected. The script automatically moves to
#   Phase 2 for all transient failures.
#
# Phase 2 — VALIDATE: Poll with short requests until we get a 2xx back.
#   Once the user completes login or pastes a token, the proxy caches it.
#   Subsequent requests hit the cached flow rule and return immediately.
#   We poll until we see a 2xx or exhaust the time budget. Transient 403
#   responses ("Login in progress") are retried, not treated as failures.
#
# Why two phases?
#   A single long-timeout curl risks hitting OS/proxy/load-balancer timeouts
#   before the user finishes logging in. By using a short trigger + poll loop
#   we stay resilient to intermediate timeouts while giving the user as much
#   time as they need.
#
# Exit codes:
#   0 = authentication established successfully
#   1 = authentication failed or service unreachable

set -euo pipefail

PROBE_URL="${1:?Usage: probe-auth.sh <probe_url> [poll_max_secs] [poll_interval_secs]}"
POLL_MAX="${2:-300}"        # Total time budget for validation phase (5 min default)
POLL_INTERVAL="${3:-5}"     # Seconds between validation polls

TRIGGER_TIMEOUT=30          # Short timeout for the trigger request
POLL_TIMEOUT=10             # Shorter timeout for poll requests (proxy responds fast when token is cached)

# Temp file for response bodies — use mktemp to avoid collisions if multiple probes run in parallel
RESP_FILE=$(mktemp /tmp/probe_response.XXXXXX)
trap 'rm -f "$RESP_FILE"' EXIT

# Extract host from URL for reporting
HOST=$(echo "$PROBE_URL" | sed -E 's|^https?://([^/]+).*|\1|')

echo "=== Sandbox Auth Probe ==="
echo "Service:        $HOST"
echo "Probe URL:      $PROBE_URL"
echo "Poll budget:    ${POLL_MAX}s"
echo "Poll interval:  ${POLL_INTERVAL}s"
echo ""

# ──────────────────────────────────────────────
# Phase 1: TRIGGER — kick off the auth flow
# ──────────────────────────────────────────────
echo "PHASE=TRIGGER"
echo "Sending initial probe to trigger auth flow (${TRIGGER_TIMEOUT}s timeout)..."
echo "If this is the first request to $HOST, the user's browser may open for login."
echo ""

TRIGGER_CODE=$(curl -s -o $RESP_FILE -w "%{http_code}" \
    --max-time "$TRIGGER_TIMEOUT" \
    -X GET \
    "$PROBE_URL" 2>/dev/null) || TRIGGER_CODE="000"

echo "Trigger response: HTTP $TRIGGER_CODE"

# If we already got a 2xx on the trigger, auth was already cached — done.
if [[ "$TRIGGER_CODE" -ge 200 && "$TRIGGER_CODE" -lt 300 ]]; then
    echo ""
    echo "PHASE=COMPLETE"
    echo "AUTH_STATUS=SUCCESS"
    echo "SERVICE=$HOST"
    echo "MESSAGE=Authentication already established (token was cached). You may now make requests to $HOST."

    exit 0
fi

# Check if a 401/403 is transient (auth in progress) or terminal (bad token).
# The egress proxy returns 403 with "Login in progress" or "Denied:" prefixes
# while the user is completing the consent/login flow — these are retryable.
if [[ "$TRIGGER_CODE" == "401" || "$TRIGGER_CODE" == "403" ]]; then
    BODY=$(cat $RESP_FILE 2>/dev/null || true)
    if echo "$BODY" | grep -qi "login in progress\|in progress\|retry short\|consent pending\|authenticat"; then
        echo ""
        echo "Auth flow in progress — proxy returned $TRIGGER_CODE while waiting for user login."
        echo "Moving to validation phase (will poll until login completes)."
    else
        # Genuine rejection — the proxy forwarded the request without a token
        # (policy says "allow" with no auth), or the token was acquired but the
        # service rejected it. This is a hard failure.
        echo ""
        echo "PHASE=COMPLETE"
        echo "AUTH_STATUS=FAILED"
        echo "SERVICE=$HOST"
        echo "HTTP_CODE=$TRIGGER_CODE"
        echo "MESSAGE=Service returned $TRIGGER_CODE. The egress policy may not require auth for this host (so no token was injected), or the acquired token lacks required scopes."
        [ -n "$BODY" ] && echo "RESPONSE_HINT=$(echo "$BODY" | head -5)"

        exit 1
    fi
else
    # Any other code (407, 000/timeout, 5xx) = auth flow is likely in progress.
    echo ""
    case "$TRIGGER_CODE" in
        407) echo "Auth flow started — user needs to complete browser login." ;;
        000) echo "Request timed out — auth flow is likely in progress (browser login pending)." ;;
        *)   echo "Got HTTP $TRIGGER_CODE — will poll to see if auth completes." ;;
    esac
fi
echo ""

# ──────────────────────────────────────────────
# Phase 2: VALIDATE — poll until auth is cached
# ──────────────────────────────────────────────
echo "PHASE=VALIDATE"
echo "Waiting for user to complete authentication..."
echo "Polling $HOST every ${POLL_INTERVAL}s (up to ${POLL_MAX}s)."
echo ""

START_TIME=$(date +%s)
attempt=0
while [ $(( $(date +%s) - START_TIME )) -lt "$POLL_MAX" ]; do
    sleep "$POLL_INTERVAL"
    attempt=$((attempt + 1))
    elapsed=$(( $(date +%s) - START_TIME ))

    POLL_CODE=$(curl -s -o $RESP_FILE -w "%{http_code}" \
        --max-time "$POLL_TIMEOUT" \
        -X GET \
        "$PROBE_URL" 2>/dev/null) || POLL_CODE="000"

    elapsed=$(( $(date +%s) - START_TIME ))
    echo "  Poll #$attempt (${elapsed}s/${POLL_MAX}s): HTTP $POLL_CODE"

    # 2xx = token is now cached, auth is ready
    if [[ "$POLL_CODE" -ge 200 && "$POLL_CODE" -lt 300 ]]; then
        echo ""
        echo "PHASE=COMPLETE"
        echo "AUTH_STATUS=SUCCESS"
        echo "SERVICE=$HOST"
        echo "ELAPSED=${elapsed}s"
        echo "MESSAGE=Authentication established after ${elapsed}s. The token is now cached by the egress proxy. You may now make requests to $HOST."
    
        exit 0
    fi

    # 401/403 after polling — check if transient (login still in progress)
    # or terminal (token acquired but service rejected it).
    if [[ "$POLL_CODE" == "401" || "$POLL_CODE" == "403" ]]; then
        POLL_BODY=$(cat $RESP_FILE 2>/dev/null || true)
        if echo "$POLL_BODY" | grep -qi "login in progress\|in progress\|retry short\|consent pending\|authenticat"; then
            # Transient — consent/login flow still active, keep polling
            continue
        else
            # Terminal — token was acquired but the service rejected it
            elapsed=$(( $(date +%s) - START_TIME ))
            echo ""
            echo "PHASE=COMPLETE"
            echo "AUTH_STATUS=FAILED"
            echo "SERVICE=$HOST"
            echo "HTTP_CODE=$POLL_CODE"
            echo "ELAPSED=${elapsed}s"
            echo "MESSAGE=Token was acquired but the service returned $POLL_CODE. The token may lack required scopes, or the user denied consent."
            [ -n "$POLL_BODY" ] && echo "RESPONSE_HINT=$(echo "$POLL_BODY" | head -5)"

            exit 1
        fi
    fi

    # 407 or timeout = still waiting for user to finish login, keep polling
done

# Exhausted time budget
echo ""
echo "PHASE=COMPLETE"
echo "AUTH_STATUS=TIMEOUT"
echo "SERVICE=$HOST"
echo "ELAPSED=${POLL_MAX}s"
echo "MESSAGE=Authentication did not complete within ${POLL_MAX}s. The user may not have finished the browser login, or may have missed the consent prompt in the desktop app. Ask them to check and retry."
exit 1
