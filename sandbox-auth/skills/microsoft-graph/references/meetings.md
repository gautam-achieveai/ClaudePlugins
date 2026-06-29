# Teams meetings — transcripts, recordings, attendance, meeting chat

> Auth first (`microsoft-graph` skill). All endpoints below are on `graph.microsoft.com` and are
> **egress-allowed** — including transcript and recording **content**. Examples use `curl`; on a
> Windows-local backend use the egress-auth Python helper instead (see SKILL.md → Transport).

**Scopes (all delegated, all require admin consent except `OnlineMeetings.Read`):**
`OnlineMeetings.Read`, `OnlineMeetingTranscript.Read.All`, `OnlineMeetingRecording.Read.All`,
`OnlineMeetingArtifact.Read.All`. Delegated access only covers meetings the **signed-in user
organized** (reading another organizer's meeting needs application permissions + admin policy).

## The mandatory pivot: you CANNOT list `/me/onlineMeetings`

`GET /me/onlineMeetings` → `400 InvalidArgument "One of the required parameters to lookup meeting by
QueryOptions is null or empty"`. There is no "list my meetings" call. You must resolve the meeting id
from the meeting's **join URL**, which you get from the **calendar event**:

```bash
G=https://graph.microsoft.com/v1.0

# 1) Find the event(s) and pull onlineMeeting.joinUrl (NOT the deprecated onlineMeetingUrl)
curl -sS -G "$G/me/calendarView" \
  --data-urlencode 'startDateTime=2026-06-22T00:00:00Z' \
  --data-urlencode 'endDateTime=2026-06-29T23:59:59Z' \
  --data-urlencode '$top=250' \
  --data-urlencode '$select=subject,start,isOnlineMeeting,onlineMeeting' \
  -H 'Prefer: outlook.timezone="UTC"'
# -> events[].onlineMeeting.joinUrl  (use $top=250: a busy week exceeds the default page)

# 2) Resolve the meeting id by filtering on the join URL (pass it verbatim; percent-encoding is fine)
curl -sS -G "$G/me/onlineMeetings" \
  --data-urlencode "\$filter=JoinWebUrl eq 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_…%40thread.v2/0?context=%7b…%7d'"
# -> value[0].id           = the onlineMeeting id (use below)
#    value[0].chatInfo.threadId = the meeting chat thread (see "Meeting chat")
```

`onlineMeeting` also carries `subject`, `participants`, `startDateTime`/`endDateTime`,
`audioConferencing`, `recordingInfo`. For recurring meetings every occurrence shares the same joinUrl
(one onlineMeeting), so one lookup covers the whole series.

## Transcripts (verified: list → 200, content → 200 WEBVTT)

```bash
MID='<onlineMeeting id from step 2>'
# List transcripts for the meeting
curl -sS "$G/me/onlineMeetings/$MID/transcripts?%24select=id,createdDateTime,transcriptContentUrl"
# Fetch transcript text as WebVTT (use the transcript id from the list)
curl -sS "$G/me/onlineMeetings/$MID/transcripts/<transcriptId>/content?%24format=text/vtt"
# (omit $format for the default, or use application/vnd.openxmlformats-officedocument.wordprocessingml.document for .docx)
```

WEBVTT cues look like `00:00:53.953 --> 00:00:58.833\n<v Speaker Name>spoken text</v>` — parse the
`<v …>` tags for per-speaker text. Across all of a user's organized meetings (no per-meeting id), use
`GET /me/onlineMeetings/getAllTranscripts(meetingOrganizerUserId='{userId}')` with a
`startDateTime`/`endDateTime` window.

## Recordings (verified: content → 206 video/mp4 from graph.microsoft.com, Range supported)

```bash
curl -sS "$G/me/onlineMeetings/$MID/recordings?%24select=id,createdDateTime,recordingContentUrl"
# Stream the video THROUGH graph (egress-allowed). Range requests work:
curl -sS -r 0-1048575 "$G/me/onlineMeetings/$MID/recordings/<recordingId>/content" -o chunk0.mp4
```

**Do NOT** download the recording via OneDrive search → driveItem `@microsoft.graph.downloadUrl`: that
URL is on `*-my.sharepoint.com`, which the sandbox egress **blocks**. The artifact `/content` endpoint
above streams the same bytes through `graph.microsoft.com` and works. (`getAllRecordings(...)` exists
too, same shape as transcripts.)

## Attendance (verified: list + expand → 200)

```bash
curl -sS "$G/me/onlineMeetings/$MID/attendanceReports"
curl -sS "$G/me/onlineMeetings/$MID/attendanceReports/<reportId>?%24expand=attendanceRecords"
# attendanceRecords[]: emailAddress, totalAttendanceInSeconds, role, attendanceIntervals[]
```

## Meeting chat (the in-meeting chat thread)

The meeting's chat is a normal chat addressed by `chatInfo.threadId` from step 2:

```bash
curl -sS "$G/chats/<chatInfo.threadId>/messages?%24top=20"   # needs Chat.Read; see teams-chat.md
```

## Worked example — "summarize last week's Day End Status meetings"

1. `calendarView` over last week, `$select=subject,onlineMeeting`; keep events whose subject matches.
2. For each distinct `onlineMeeting.joinUrl`: resolve the meeting id via the `JoinWebUrl` filter.
3. `GET …/transcripts`, then `…/transcripts/{id}/content?$format=text/vtt`; parse `<v Speaker>` cues.
4. (Optional) `…/attendanceReports` for who attended, and `/chats/{threadId}/messages` for chat
   side-threads. Summarize across days.

## Failure map

| Symptom | Cause | Fix |
|---|---|---|
| `400 InvalidArgument … parameters … null` on `/me/onlineMeetings` | Listing without `$filter` | Filter by `JoinWebUrl eq '<joinUrl>'` |
| `403 Forbidden` on `/transcripts`/`/recordings`/`/attendanceReports` | Scope not consented, or not the organizer | Need admin-consented `OnlineMeeting*Read.All`; delegated = organizer-only |
| `403 denied` fetching a recording from `*.sharepoint.com` | Used the OneDrive downloadUrl route | Use `/onlineMeetings/{id}/recordings/{id}/content` (graph) |
| `403 Forbidden` on `/communications/callRecords` | callRecords is app-only | Use the per-meeting artifact APIs above |
