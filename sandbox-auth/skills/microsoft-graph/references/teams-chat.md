# Teams — teams, channels, channel messages, chats, meeting chat

> Auth first (`microsoft-graph` skill). On `graph.microsoft.com` (egress-allowed). `curl` shown;
> Windows-local → egress-auth Python helper. Percent-encode OData `$` as `%24`.

**Scopes:** `Team.ReadBasic.All`, `Channel.ReadBasic.All` (list teams/channels),
`ChannelMessage.Read.All` (channel messages — **admin consent**), `Chat.Read` (1:1/group/meeting
chats and their messages).

## Teams & channels (verified → 200)

```bash
G=https://graph.microsoft.com/v1.0
curl -sS "$G/me/joinedTeams?%24select=id,displayName"
curl -sS "$G/teams/<teamId>/channels?%24select=id,displayName,membershipType"
```

## Channel messages (verified → 200; needs ChannelMessage.Read.All)

```bash
curl -sS "$G/teams/<teamId>/channels/<channelId>/messages?%24top=20"
# Replies to a root message (channel messages are threaded)
curl -sS "$G/teams/<teamId>/channels/<channelId>/messages/<messageId>/replies"
# Incremental sync
curl -sS "$G/teams/<teamId>/channels/<channelId>/messages/delta"
```

`message.body.content` is HTML (`body.contentType: html`). Mentions are in `mentions[]`; author in
`from.user`. Attachments/cards in `attachments[]`.

## Chats — 1:1, group, and meeting (verified → 200; needs Chat.Read)

```bash
curl -sS "$G/me/chats?%24top=20&%24select=id,topic,chatType,lastUpdatedDateTime"
#   chatType: oneOnOne | group | meeting
curl -sS "$G/me/chats/<chatId>/messages?%24top=20"
curl -sS "$G/me/chats/<chatId>/members"
```

## Meeting chat (the in-meeting conversation)

A meeting's chat is a `chatType: meeting` chat whose **threadId == the onlineMeeting's
`chatInfo.threadId`** (see `references/meetings.md` step 2). Address it directly:

```bash
curl -sS "$G/chats/<chatInfo.threadId>/messages?%24top=50"
#   e.g. threadId = 19:meeting_<base64>@thread.v2
```

This is the right way to pull "what was discussed in the meeting chat" alongside the transcript. The
`threadId` also appears as `eventMessageDetail` links and in the meeting's `joinUrl` (`19%3ameeting_…
%40thread.v2`), but prefer the `chatInfo.threadId` from the resolved onlineMeeting.

## Notes

- Most message bodies are **HTML** — strip tags when summarizing.
- Listing all messages across all chats isn't a single call; enumerate `/me/chats` then fetch each
  chat's `/messages` (or use `/search/query` with `entityTypes:["chatMessage"]`, see
  `references/search-directory.md`).
- `403` on channel messages usually means `ChannelMessage.Read.All` isn't consented in the egress
  policy's scope set.
