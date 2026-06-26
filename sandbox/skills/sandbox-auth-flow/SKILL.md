---
name: sandbox-auth-flow
description: >-
  Use before diagnosing sandbox network, credential, OAuth, egress proxy, auth
  webhook, deferred auth, or token injection failures. Explains the sandbox auth
  model and the security boundaries agents must preserve.
allowed-tools:
  - Read
  - Grep
  - Bash
  - PowerShell
user-invocable: true
---

# Sandbox Auth Flow

Understand the sandbox auth model before debugging network or credential
failures.

## Mental Model

- The sandbox should not receive or store user OAuth tokens.
- Outbound sandbox egress may go through a gateway/egress proxy.
- When credentials are needed, the proxy/gateway calls the host app's auth
  webhook.
- The app validates the gateway's shared secret and destination host allowlist.
- If a valid token exists, the app returns an allow decision and the gateway or
  proxy injects credentials server-side.
- If no token exists, the host may hold the webhook call for deferred auth while
  the UI prompts the user to sign in.

## Deferred Auth Signals

The host app may emit out-of-band client frames:

- `auth_required` - sign-in is required for a provider.
- `auth_completed` - token landed and the pending request can continue.
- `auth_denied` - sign-in did not complete or policy denied the request.

## Security Rules

- Never ask the user to paste a PAT or OAuth token unless a documented provider
  explicitly requires a manual-token flow.
- Never log token values, incoming `Authorization` header values, shared
  secrets, proxy credentials, or private keys.
- Never bypass the proxy or disable TLS validation to "make it work."
- Treat webhook `401` as a shared-secret/authentication problem between gateway
  and app.
- Treat an allow/deny JSON body over HTTP `200` as the normal webhook decision
  contract.
- Check destination host allowlists before assuming a token should be injected.

## Debugging Checklist

1. Confirm the sandbox session exists and has the expected workspace.
2. Confirm proxy environment variables and CA bundle variables exist if egress
   proxying is expected.
3. Confirm the requested host is allowed by policy.
4. Confirm the relevant provider has completed deferred auth.
5. Use provider-specific auth skills, such as `sandbox-auth:github`,
   `sandbox-auth:azure-devops`, or `sandbox-auth:microsoft-graph`, when
   available.
