---
name: microsoft-graph
description: >-
  ALWAYS use this FIRST — before any Microsoft Graph / Microsoft 365 operation — to
  authenticate the sandbox AND to get the correct API recipe. Trigger this before any request
  to graph.microsoft.com: reading a profile (/me), mail (incl. focused inbox + shared mailboxes),
  calendar (incl. shared calendars), Teams teams/channels/chats, **meeting chat, transcripts,
  recordings, attendance**, OneDrive, SharePoint, directory/people, or unified search. The sandbox
  blocks unauthenticated egress, so Graph calls fail until auth runs; and several M365 flows are
  non-discoverable (e.g. you CANNOT list /me/onlineMeetings — you must filter by joinWebUrl). This
  skill owns both: the auth handshake (delegated to egress-auth) and per-domain recipes under
  references/. Do NOT guess Graph endpoints or call Graph before auth reports SUCCESS.
argument-hint: "[optional: space-separated Graph scopes, e.g. 'User.Read Mail.Read']"
allowed-tools: Bash Read
user-invocable: true
shell: bash
---

# Microsoft Graph (M365) — auth setup + operation recipes

Two jobs: **(1)** set up Graph auth through the sandbox egress proxy (a prerequisite — the proxy
acquires/caches the OAuth token and injects it server-side; you never hold it), and **(2)** point you
at the **correct, verified API recipe** for the M365 operation you need (the recipes live in
`references/` — read the one for your domain instead of guessing endpoints).

## Step 1 — authenticate (always first)

The handshake (wire contract, `auth_pending` polling, login/ManualToken relay, token injection,
exit codes) is owned by **`sandbox-auth:egress-auth`** — do not reimplement it.

1. Tell the user you're setting up Graph auth (a browser Azure AD login / ManualToken paste may be
   relayed).
2. Use **`sandbox-auth:egress-auth`** → its **"set up auth for a probe URL"** procedure with
   `PROBE_URL = https://graph.microsoft.com/v1.0/me` and `BUDGET = 300`. Relay any `[HITL_REQUIRED]`
   line verbatim; **do not write your own retry loop**.
3. Report SUCCESS / FAILED / TIMEOUT per the egress-auth exit-code table. After SUCCESS the token is
   cached for the session — don't re-auth per call.

## Step 2 — pick the recipe (read the matching reference)

| You want to… | Read | Key endpoint |
|---|---|---|
| Read/search mail, folders, **focused inbox**, **shared mailboxes**, send | `references/mail.md` | `/me/messages`, `/me/mailFolders`, `/users/{upn}/messages` |
| Calendar, **shared calendars**, free/busy, find times | `references/calendar.md` | `/me/calendarView`, `/me/events`, `/users/{upn}/calendar` |
| Teams, channels, **channel messages**, 1:1/group **chats**, **meeting chat** | `references/teams-chat.md` | `/me/joinedTeams`, `/teams/{id}/channels/{id}/messages`, `/me/chats`, `/chats/{threadId}/messages` |
| **Meeting transcripts, recordings, attendance** | `references/meetings.md` | `/me/onlineMeetings?$filter=JoinWebUrl eq …` → `/transcripts`, `/recordings`, `/attendanceReports` |
| OneDrive files, **SharePoint** sites/libraries, file download | `references/files-sharepoint.md` | `/me/drive/...`, `/sites/...`, driveItem `content` |
| Unified **search** (KQL), people, directory, presence | `references/search-directory.md` | `POST /search/query`, `/me/people`, `/users`, `/me/presence` |

## Read these gotchas before any M365 task (they cause silent failure)

1. **Meetings: you CANNOT list `/me/onlineMeetings`.** A bare `GET /me/onlineMeetings` returns
   `400 InvalidArgument "One of the required parameters … is null or empty"`. The meeting id is only
   reachable by **filtering on the join URL**: get the calendar event with `$select=…,onlineMeeting`,
   take `onlineMeeting.joinUrl`, then
   `GET /me/onlineMeetings?$filter=JoinWebUrl eq '<joinUrl>'`. See `references/meetings.md`.
2. **Transcripts & recordings come from `graph.microsoft.com`** via the meeting **artifact** APIs
   (`/onlineMeetings/{id}/transcripts|recordings/{id}/content`) — these are allowlisted and need NO
   SharePoint access. **Do NOT** fetch a recording via a OneDrive driveItem
   `@microsoft.graph.downloadUrl`: that points at `*-my.sharepoint.com`, which egress **blocks**.
3. **Raw SharePoint/OneDrive file BYTES are egress-blocked.** Only `graph.microsoft.com` is on the
   m365 allowlist. Graph endpoints that *stream* content (`/transcripts/.../content`,
   `/recordings/.../content`, `/me/drive/items/{id}/content`) work; a `*.sharepoint.com` download URL
   does not (unless an operator adds `*.sharepoint.com` to the egress policy).
4. **`/communications/callRecords` is app-only** — a delegated token gets `403 Forbidden`. Use the
   per-meeting artifact APIs instead.
5. **Don't put `Authorization` headers in your requests** — the proxy injects the token. Don't echo
   tokens.

## Transport: curl vs the Python helper

The recipes show **`curl`**, which works in the Docker/Linux sandbox (the proxy CA is trusted there).
On a **Windows-local** backend, native `curl.exe` rejects the proxy MITM CA — route the same GET
through the egress-auth helper and read the `.body`:

```bash
python3 "/skills/egress-auth/scripts/sandbox-auth-fetch.py" --url "<graph-url>" --method GET --once
```

For OData query params in `curl`, percent-encode `$` as `%24` (e.g. `%24filter`, `%24select`,
`%24top`, `%24expand`) so the shell doesn't expand it, or pass them via `curl -G --data-urlencode`.

## Common Graph scopes (delegated)

| Scope | Access | Admin consent |
|-------|--------|---------------|
| `User.Read` | Signed-in user's profile | no |
| `Mail.Read` / `Mail.ReadWrite` / `Mail.Send` | Read / modify / send mail | no |
| `Mail.Read.Shared` | Mail in mailboxes shared with the user | no |
| `MailboxSettings.Read` | Focused-inbox & other mailbox settings | no |
| `Calendars.Read` / `Calendars.Read.Shared` | Own / shared calendars | no |
| `Files.Read.All` | OneDrive + SharePoint files the user can access | no |
| `Sites.Read.All` | SharePoint sites/libraries | yes |
| `Team.ReadBasic.All`, `Channel.ReadBasic.All` | Teams & channels list | no |
| `ChannelMessage.Read.All` | Channel messages | **yes** |
| `Chat.Read` | 1:1 / group / meeting chat messages | no |
| `OnlineMeetings.Read` | Resolve onlineMeeting by joinWebUrl | no |
| `OnlineMeetingTranscript.Read.All` | Meeting transcripts (organizer's meetings) | **yes** |
| `OnlineMeetingRecording.Read.All` | Meeting recordings | **yes** |
| `OnlineMeetingArtifact.Read.All` | Attendance reports & artifacts | **yes** |
| `People.Read`, `User.ReadBasic.All` | People / directory | no |

> Actual scopes are set by the **egress policy**, not by this skill. If a call returns
> `403 Forbidden`, the policy's token is missing that scope (or the scope needs admin consent) — report
> it; don't retry. Delegated meeting transcript/recording/attendance reads also only cover meetings the
> **signed-in user organized**.

Everything about the handshake, the 511/403 decision table, and Windows TLS notes lives in
`sandbox-auth:egress-auth`.
