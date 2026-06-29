# OneDrive & SharePoint — files, libraries, search, and the egress rule for content

> Auth first (`microsoft-graph` skill). On `graph.microsoft.com` (egress-allowed). `curl` shown;
> Windows-local → egress-auth Python helper. Percent-encode OData `$` as `%24`.

**Scopes:** `Files.Read.All` (OneDrive + SharePoint files the user can access),
`Sites.Read.All` (SharePoint sites/libraries — **admin consent**).

## ⚠️ The egress rule for file CONTENT (read this first)

Only `graph.microsoft.com` is on the m365 egress allowlist.

- ✅ **Streaming content THROUGH Graph works:** `GET /me/drive/items/{id}/content`,
  `…/transcripts/{id}/content`, `…/recordings/{id}/content` — all served by `graph.microsoft.com`.
- ❌ **A driveItem `@microsoft.graph.downloadUrl` is a pre-authenticated `*-my.sharepoint.com` /
  `*.sharepoint.com` URL — egress BLOCKS it.** Don't fetch file bytes that way. Use `/items/{id}/content`
  instead. (To genuinely need SharePoint hosts, an operator must add `*.sharepoint.com` to the egress
  policy — not required for OneDrive/meeting content via Graph.)

## OneDrive (verified: children/search/items → 200)

```bash
G=https://graph.microsoft.com/v1.0
curl -sS "$G/me/drive/root/children?%24select=name,folder,file,size&%24top=50"
# Path addressing (note the :/path:/ syntax)
curl -sS "$G/me/drive/root:/Documents/Recordings:/children"
# Search the drive
curl -sS "$G/me/drive/root/search(q='Day%20end%20status')?%24select=name,webUrl,file,parentReference&%24top=20"
# Item metadata, then stream its content through Graph (egress-allowed)
curl -sS "$G/me/drive/items/<itemId>?%24select=name,size,file,parentReference"
curl -sS -r 0-1048575 "$G/me/drive/items/<itemId>/content" -o chunk0.bin
```

## SharePoint sites & document libraries (verified: `/sites?search=` → 200)

```bash
# Find sites
curl -sS "$G/sites?search=mcqdb"
curl -sS "$G/sites/root?%24select=displayName,webUrl"
# Address a site by hostname + server-relative path
curl -sS "$G/sites/contoso.sharepoint.com:/sites/Marketing?%24select=id,displayName"
# Drives (document libraries) and their items
curl -sS "$G/sites/<siteId>/drives?%24select=id,name"
curl -sS "$G/drives/<driveId>/root/children"
curl -sS "$G/drives/<driveId>/root/search(q='budget')"
# SharePoint lists (non-document libraries)
curl -sS "$G/sites/<siteId>/lists?%24select=id,displayName"
curl -sS "$G/sites/<siteId>/lists/<listId>/items?%24expand=fields"
```

`/sites?search=` needs `Sites.Read.All` (admin consent); a `403` means it's not in the policy's scope
set. For cross-tenant content discovery prefer `POST /search/query` (see
`references/search-directory.md`) which spans OneDrive + SharePoint with KQL.

## Tips

- Always `$select` (and `$expand=fields` for list items) — default payloads are large.
- To download a known SharePoint/OneDrive file, resolve it to a `driveItem` (`/sites/{id}/drives` →
  item, or `/me/drive/...`) and stream `/items/{id}/content` — **never** the `downloadUrl`.
- Large files: use HTTP `Range` requests against `/content` (supported, served by Graph).
