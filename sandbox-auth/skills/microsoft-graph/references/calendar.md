# Calendar — events, calendarView, shared calendars, free/busy

> Auth first (`microsoft-graph` skill). On `graph.microsoft.com` (egress-allowed). `curl` shown;
> Windows-local → egress-auth Python helper. Percent-encode OData `$` as `%24`.

**Scopes:** `Calendars.Read` (own), `Calendars.Read.Shared` (calendars shared with the user),
`Calendars.ReadWrite` (create/update).

## calendarView vs events

- **`/me/calendarView`** — events in a date **range**, with recurring series **expanded** into
  occurrences. `startDateTime`/`endDateTime` are **required**. Use this for "what's on my calendar
  between X and Y".
- **`/me/events`** — raw event objects (series masters, not expanded). Use for a specific event by id
  or for properties of the master.

```bash
G=https://graph.microsoft.com/v1.0
curl -sS -G "$G/me/calendarView" \
  --data-urlencode 'startDateTime=2026-06-22T00:00:00Z' \
  --data-urlencode 'endDateTime=2026-06-29T23:59:59Z' \
  --data-urlencode '$top=250' \
  --data-urlencode '$select=subject,start,end,organizer,isOnlineMeeting,onlineMeeting,attendees' \
  -H 'Prefer: outlook.timezone="UTC"'
```

- **Use `$top=250`** (or page via `@odata.nextLink`): a busy week easily exceeds the default page, and
  a too-small page silently omits the event you want.
- `Prefer: outlook.timezone="…"` controls the timezone of returned `start`/`end`.
- **For Teams meetings:** `$select=…,onlineMeeting` exposes `onlineMeeting.joinUrl` and
  `isOnlineMeeting`. That `joinUrl` is the key to transcripts/recordings — see `references/meetings.md`.
  (The legacy top-level `onlineMeetingUrl` is usually null; use the `onlineMeeting` object.)

## Calendars & a specific event

```bash
curl -sS "$G/me/calendars?%24select=name,canEdit,isDefaultCalendar,owner&%24top=50"
curl -sS "$G/me/events/<id>?%24select=subject,body,start,end,attendees,onlineMeeting"
curl -sS "$G/me/calendars/<calendarId>/events?%24top=20"
```

## Shared calendars (verified: `/users/{upn}/calendar` → 200)

Read another user's calendar they've shared with you (`Calendars.Read.Shared`):

```bash
curl -sS "$G/users/colleague@contoso.com/calendar?%24select=name,owner"
curl -sS -G "$G/users/colleague@contoso.com/calendarView" \
  --data-urlencode 'startDateTime=2026-06-22T00:00:00Z' \
  --data-urlencode 'endDateTime=2026-06-29T23:59:59Z'
```

`403` means the calendar isn't shared with the signed-in user (not a scope bug).

## Free/busy & find times (POST — warm auth first)

```bash
# Free/busy for one or more users
curl -sS -X POST "$G/me/calendar/getSchedule" -H 'Content-Type: application/json' -d '{
  "schedules":["colleague@contoso.com"],
  "startTime":{"dateTime":"2026-06-23T09:00:00","timeZone":"UTC"},
  "endTime":{"dateTime":"2026-06-23T18:00:00","timeZone":"UTC"},
  "availabilityViewInterval":30 }'
# Suggested meeting slots
curl -sS -X POST "$G/me/findMeetingTimes" -H 'Content-Type: application/json' -d '{
  "attendees":[{"emailAddress":{"address":"colleague@contoso.com"},"type":"required"}],
  "meetingDuration":"PT30M" }'
```

(POST is not auto-retried through `auth_pending`; ensure auth is SUCCESS first, then POST once.)
