---
name: using-hitl
description: Use at session start and when asking a human, reviewing a plan, reporting a result or blocker, or tracking ongoing work through HITL. Guides cross-device communication without interrupting routine authorized work.
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
| One-off result: task done, build/test finished, blocker, long job started | `Notify` | Short title; outcome, evidence, and next action if needed. Returns without waiting. |
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

## Living progress

Use a stable `workId` for the goal and stable task IDs. Create the root with `parentTaskId: null`, `expectedRevision: 0`, a title, and goal. Child reports link to an existing parent. Keep work on the same coordinating host/topic; separate machines do not automatically share the saved store.

Each `UpdateWork` replaces one **complete task report**, not a delta. Retain still-relevant `completed`, `learnings`, `remaining`, and `blockers`; include owner, reporter, status, and current action/purpose (or `current: null`). Use the **task revision**, not the document revision, as `expectedRevision`.

Give each new logical update a new `updateId`. Retry identical input with the same ID after an uncertain response or publication failure. On revision conflict, call `ReadWork`, reconcile, and send a new ID. Check `saved` and `published` separately before claiming delivery. Saved does not mean delivered.

`ReadWork` returns recorded reports; it does not poll agents. Collect fresh evidence before updating them. Use the host's supported progress tracking or delegate a progress-only agent when the user/project calls for one. Avoid spawning a team solely to send updates. Mark the root completed only when the goal is complete.

## Keep communication useful

Send one update per meaningful change. Prefer UpdateWork to repeated Notify messages for the same ongoing goal; a completion update with an alert can serve as the completion notification. For a one-off task, Notify is enough. Do not claim passing checks without results or hide delivery failures.

Never send encryption keys, raw config, credentials, or unnecessary private logs through questions, reviews, notifications, or progress reports. Hooks supply guidance only: they do not grant permissions, contact the human, or change configuration.
