---
name: using-hitl
description: Use at session start and when asking a human, reviewing a plan, handing off finished work, reporting a result or blocker, or tracking ongoing work through HITL. Guides cross-device communication without interrupting routine authorized work.
---

# Using HITL

HITL reaches the human on their connected devices, including when they are away from the terminal. Use it as the communication channel when its tools are available. Follow the user's instructions and preserve existing authorization.

## Discover once; use the live schema

Find the HITL tools in the host's tool catalog, including deferred tools if supported. Names may be `mcp__hitl__AskUserQuestion` or plugin-prefixed; identify the server and exact callable name rather than guessing. Do not confuse HITL's question tool with a host's built-in question tool.

If unavailable, report that briefly and use chat for necessary input. Load **hitl:setup-hitl** when setup is requested. Do not block unrelated work, repeatedly attempt missing tools, or silently install software to answer an ordinary question. A hook loading this skill does not prove the MCP connection or receiving client works.

## Pick the channel

| Situation | Tool | Required behavior |
| --- | --- | --- |
| Missing preference, material ambiguity, blocker, or necessary approval | `AskUserQuestion` | Set project/work `context`; batch up to 4 related questions. Give short options and a recommendation. |
| Review a concrete Markdown plan or spec | `ReviewPlan` | Write the file first; pass `filePath`, `context`, and a short `summary`. |
| Your work is finished and you would otherwise end the turn | `HandOff` | Summary of what was done; wait for the next instruction or End. See below. |
| One-off result: build/test finished, blocker, long job started; task done when `HandOff` is unavailable | `Notify` | Short title; outcome, evidence, and next action if needed. Returns without waiting. |
| Multi-step or team work, milestones, changing status | `UpdateWork` | Maintain one living document for the goal; quiet routine updates, alert for meaningful changes. |
| Resume tracked work or resolve revision conflict | `ReadWork` | Read stored state before replacing a task report. |
| Requested setup or client repair | `setup` | After config exists and MCP connects; inspect returned steps. It normally launches the tray client, not Inbox. |

Don't ask for facts you can inspect. Continue routine, reversible work within the user's request. Ask only when an answer changes the result, a consequential choice belongs to the human, or required input/authorization is missing. Short sentences and concrete choices reduce interruption cost.

## Questions and decisions

- Use either `question` + `options`, or the `questions` array; never both. Each option has `label` and `value`; `description` and Markdown `preview` are optional. Set `allowMultiple: false` for a single choice; the server default can allow multiple selections.
- Supply meaningful `context`, so a person answering on another device understands the project, proposed action, and consequence. Use previews only for concrete artifacts that benefit from comparison.
- Current HITL removed the `timeout` tool argument in 2.10.0. Do not pass `timeout` from older AGENTS.md or CLAUDE.md examples. The wait limit is the host's per-server timeout, which setup sets to 6 hours. If calls end early, repair the registration with `hitl:setup-hitl`; do not add a tool argument.
- Inspect the returned success state, selected values, and free text. A cancelled/failed call or absent answer is not consent. Do not resend an uncertain request blindly; the original may still be visible.
- Existing explicit approval remains valid for its scope. Plan approval does not authorize an unrelated deployment, publication, credential change, or destructive operation. A notification is never an approval request.

## Plan reviews

Use a new file for each distinct plan. Revise the same file for subsequent reviews so the human sees a diff. Do not edit it while `ReviewPlan` is pending: the returned `snapshotHash` identifies the reviewed content.

Read `verdict`, `overallFeedback`, and `inlineComments`. Apply requested changes and resubmit the same file when review is required. Only `approved` establishes plan approval; `skipped`, `cancelled`, `rejected`, and `changes_requested` do not. Continue independent safe work while a necessary decision is pending.

## Hand off finished work

When the requested work is done, call `HandOff` instead of ending the turn. The human reads the summary in Inbox and sends the next instruction from there. Only the lead agent hands off; subagents report to their lead.

- Pass `title` (the outcome in a few words), `context` (project and goal), and `summary` (Markdown, at most 1200 characters). Write the summary for a dyslexic, ADHD reader: short sentences, bullets, no preamble. Use this order and drop empty parts: **Outcome**, **Did**, **Not done / risks**, **Needs you**.
- Report evidence, not hopes: name the checks that ran and their results. Say what was skipped.
- The result has `action`. `continue` carries `instructions`: treat them as the human's next request, do the work, then hand off again. `end` may carry a `note`: reply with one line and stop.
- A handoff reply is a new request, not blanket approval. Actions that need explicit authorization still need it.
- Don't hand off mid-task, to ask a question (use `AskUserQuestion`), or in unattended runs (`-p`, SDK, CI) where no human is waiting. Don't also send a Notify for the same completion.
- `HandOff` needs HITL 2.14.0 or later, plus a current Inbox. Inbox ships for Windows only. Older Inboxes and the tray popup drop handoff messages. If the tool is missing, send a completion Notify and end the turn as usual.

**Stop hook.** Setup can install an optional Claude Code Stop hook (`hitl hook stop`). If you did work in the turn and try to stop without handing off, the hook blocks once. Its reason starts with `[hitl-handoff]`. Respond by calling `HandOff`. If `HandOff` is not available, stop; the hook does not block twice. `HITL_HANDOFF=0` disables it for a session.

## Living progress

Use a stable `workId` for the goal and stable task IDs. Create the root with `parentTaskId: null`, `expectedRevision: 0`, a title, and goal. Child reports link to an existing parent. Keep work on the same coordinating host/topic; separate machines do not automatically share the saved store.

Each `UpdateWork` replaces one **complete task report**, not a delta. Retain still-relevant `completed`, `learnings`, `remaining`, and `blockers`; include owner, reporter, status, and current action/purpose (or `current: null`). Use the **task revision**, not the document revision, as `expectedRevision`.

Give each new logical update a new `updateId`. Retry identical input with the same ID after an uncertain response or publication failure. On revision conflict, call `ReadWork`, reconcile, and send a new ID. Check `saved` and `published` separately before claiming delivery. Saved does not mean delivered.

`ReadWork` returns recorded reports; it does not poll agents. Collect fresh evidence before updating them. Use the host's supported progress tracking or delegate a progress-only agent when the user/project calls for one. Avoid spawning a team solely to send updates. Mark the root completed only when the goal is complete.

## Keep communication useful

Send one update per meaningful change. Prefer UpdateWork to repeated Notify messages for the same ongoing goal. When the goal is complete, mark the work completed, then `HandOff`. Without HandOff, a completion update with an alert can serve as the completion notification. Do not claim passing checks without results or hide delivery failures.

Never send encryption keys, raw config, credentials, or unnecessary private logs through questions, reviews, handoffs, notifications, or progress reports. This plugin's hooks supply guidance only: they do not grant permissions, contact the human, or change configuration. The optional HITL Stop hook only asks you to hand off.
