# Mail — messages, folders, focused inbox, shared mailboxes, send

> Auth first (`microsoft-graph` skill). All on `graph.microsoft.com` (egress-allowed). `curl` shown;
> on Windows-local use the egress-auth Python helper. Percent-encode OData `$` as `%24`.

**Scopes:** `Mail.Read` (read), `Mail.ReadWrite` (modify), `Mail.Send` (send),
`Mail.Read.Shared` (mailboxes shared with the user), `MailboxSettings.Read` (focused-inbox config).

## List & read messages

```bash
G=https://graph.microsoft.com/v1.0
# Newest mail (always $select to keep payloads small; $top + @odata.nextLink to page)
curl -sS "$G/me/messages?%24top=20&%24select=subject,from,receivedDateTime,isRead,inferenceClassification,webLink&%24orderby=receivedDateTime%20desc"
# One message (full body)
curl -sS "$G/me/messages/<id>?%24select=subject,from,toRecipients,body,receivedDateTime"
# Server-side keyword search (KQL-ish); returns a relevance-ranked page
curl -sS "$G/me/messages?%24search=%22quarterly%20report%22"
# Attachments
curl -sS "$G/me/messages/<id>/attachments?%24select=name,contentType,size"
```

Notes: `body.contentType` is usually `html`. `$search` and `$orderby` can't be combined. Date filter:
`%24filter=receivedDateTime ge 2026-06-01T00:00:00Z` (URL-encode spaces as `%20`).

## Folders (well-known names work)

```bash
curl -sS "$G/me/mailFolders?%24select=displayName,totalItemCount,unreadItemCount&%24top=50"
curl -sS "$G/me/mailFolders/inbox/messages?%24top=10&%24select=subject,from"
# well-known: inbox, drafts, sentitems, deleteditems, junkemail, archive, clutter
curl -sS "$G/me/mailFolders/inbox/childFolders"
```

## Focused Inbox (verified: filter → 200)

Each message carries `inferenceClassification: focused | other`.

```bash
curl -sS "$G/me/messages?%24filter=inferenceClassification%20eq%20%27focused%27&%24top=20&%24select=subject,from"
curl -sS "$G/me/mailFolders/inbox/messages?%24filter=inferenceClassification%20eq%20%27other%27"
```

User overrides (always focus/other a given sender) are in mailbox settings
(`GET /me/mailFolders('inbox')/messageRules` and
`GET /me/inferenceClassification/overrides`, needs `MailboxSettings.Read`).

## Shared mailboxes & delegate access (verified: `/users/{upn}` → 200)

Address another mailbox by its UPN/id under `/users/{id}` (NOT `/me`). Requires `Mail.Read.Shared`
**and** the mailbox owner to have granted the signed-in user access (full-access or folder-level
delegation):

```bash
curl -sS "$G/users/sharedbox@contoso.com/mailFolders?%24select=displayName"
curl -sS "$G/users/sharedbox@contoso.com/messages?%24top=20&%24select=subject,from,receivedDateTime"
curl -sS "$G/users/sharedbox@contoso.com/mailFolders/inbox/messages"
```

`403` here means the delegation/grant is missing, not a scope bug. (Own-UPN form
`/users/{me}/…` returns 200 and is a quick way to confirm the `/users/{id}` addressing works.)

## Send (POST — warm auth first)

```bash
curl -sS -X POST "$G/me/sendMail" -H 'Content-Type: application/json' -d '{
  "message": {
    "subject":"Hi","body":{"contentType":"Text","content":"Hello"},
    "toRecipients":[{"emailAddress":{"address":"a@b.com"}}]
  }, "saveToSentItems": true }'
```

The egress-auth helper does **not** auto-retry POST through an `auth_pending` handshake — make sure
auth is already SUCCESS (warm with a `GET /me` first), then issue the POST once. Reply/forward:
`POST /me/messages/{id}/reply|forward`. Drafts: `POST /me/messages` then `POST …/send`.
