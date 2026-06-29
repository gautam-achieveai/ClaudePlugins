# Unified search, people, directory, presence

> Auth first (`microsoft-graph` skill). On `graph.microsoft.com` (egress-allowed). `curl` shown;
> Windows-local → egress-auth Python helper. Percent-encode OData `$` as `%24`.

## Unified search — `POST /search/query` (KQL) (verified → 200, returns hits + summaries)

One call to search across mail, files, calendar, Teams messages, sites, and people. `entityTypes`
selects the source; `query.queryString` is KQL.

```bash
G=https://graph.microsoft.com/v1.0
curl -sS -X POST "$G/search/query" -H 'Content-Type: application/json' -d '{
  "requests":[{
    "entityTypes":["driveItem"],
    "query":{"queryString":"Day end status"},
    "from":0, "size":10
  }]}'
```

- `entityTypes`: `message` (mail), `event`, `driveItem` (OneDrive/SharePoint files), `listItem`,
  `site`, `chatMessage` (Teams), `person`. Some combinations must be queried separately.
- Response: `value[].hitsContainers[].hits[]` with `hitId`, `rank`, `summary` (a snippet — handy for
  ranking), and `resource` (the typed object). Page with `from`/`size`; `moreResultsAvailable` flags
  more.
- **POST is not auto-retried** through an `auth_pending` handshake — ensure auth is SUCCESS (warm with
  a `GET /me` first), then POST once.
- `chatMessage`/`message` search may require the matching read scope (`Chat.Read` / `Mail.Read`).

This is often the fastest way to answer "find the doc/message/file about X" without walking folders.

## People — `/me/people` (verified → 200)

```bash
curl -sS "$G/me/people?%24top=10&%24select=displayName,scoredEmailAddresses,personType"
curl -sS "$G/me/people?%24search=%22Navneet%22"      # relevance-ranked people search
```

Scope: `People.Read`.

## Directory users — `/users` (verified → 200)

```bash
curl -sS "$G/users?%24top=20&%24select=displayName,mail,userPrincipalName,jobTitle"
curl -sS "$G/users/<id-or-upn>?%24select=displayName,mail,department"
curl -sS "$G/users?%24filter=startswith(displayName,'Nav')"
```

Scope: `User.ReadBasic.All` (basic profiles) or `User.Read.All` (full). A `403` means the directory
read scope isn't in the policy's set.

## Presence — `/me/presence` (verified → 200)

```bash
curl -sS "$G/me/presence"                              # availability + activity, e.g. "Away"
# Several users at once (POST — warm auth first)
curl -sS -X POST "$G/communications/getPresencesByUserId" -H 'Content-Type: application/json' \
  -d '{"ids":["<userId1>","<userId2>"]}'
```

Scope: `Presence.Read` (self / others as policy allows).
