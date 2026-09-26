---
name: course-correction
description: Use when a fix stacks on a fix, the same failure survives three attempts, the diff keeps spreading, or you cannot explain why a line is there — before trying anything else.
user-invocable: true
disable-model-invocation: false
---

# Course Correction

**Primary objective:** Reassess work when evidence shows the current approach no longer fits the goal.
**Decision rule:** For relevant cases these steps do not cover, choose the next in-scope action that advances this objective; preserve explicit scope, safety, and output requirements.

Stop, save, snapshot, revert, re-plan. Used by `development:agile-development`, `development:subagent-driven-development`, `development:implement`, and `development:work-on` when any tripwire below fires. Standalone use is fine.

## Tripwires

Any one of these means stop now, not after "one more try":

- **Patch stacking** — a second workaround stacked on a first. This is an automatic alarm: the real cause is upstream of both.
- **Spreading diff** — the change keeps touching files outside the plan.
- **Three strikes** — the same failure survives three fix attempts.
- **Growing special cases** — each fix adds a branch for the case that just broke.
- **Fighting the framework** — monkey-patching, copying library internals, disabling its checks.
- **Unexplainable state** — the honest answer to "why is this line here?" is "the error went away".
- **"Too far in to restart"** — sunk cost is the main argument for continuing.

## 1. Freeze

The next keystrokes are documentation, not code. No quick try, no "let me just check one thing" edit.

## 2. Snapshot what you know

Write it in the ledger (or the report file) before touching the tree:

- **Goal, re-read from the original request.** Not from your last plan; goals drift over attempts.
- **What each attempt revealed**, one line per attempt: what was tried, what happened, what that proves.
- **Known-true / known-false / still unknown.** Three short lists. Unknowns are what the new plan must resolve first.

## 3. Save, then revert

- **Last good state** is the commit the task started from (the task base, or the last head a review passed clean). Earlier fix rounds may already be committed on top of it; they are part of the failed approach.
- Save everything since last good, committed or not, as a patch in the scratchpad (`git diff <last-good-sha> -- <owned files> > <scratchpad>/<slug>.patch`) and log the path and the SHA. A rollback with a saved patch is reversible and needs no stop.
- Return the owned files to last good (`git checkout <last-good-sha> -- <owned files>`, only **after** the patch is saved). Preserve unrelated changes and other people's work.
- **Keep-exception:** an independently correct piece (a regression test, a working helper) may survive the revert, but only if it is justifiable on its own without the failed approach and its own check passed (test run named, or behaviour shown by hand).
- Never revert with `git checkout`, `git stash`, or `git reset` over work you did not save first.

## 4. Re-plan, with a gate

The new plan **must explain why the old approach failed**. If it can't, it is the same approach in different syntax; go back to step 2.

- Start from what the attempts proved, not from what they happened to build.
- If the new plan changes scope, interfaces, schema, or public behavior, escalate before executing. "Here is what I ruled out and why" is a legitimate deliverable; a fourth blind patch is not.
- Record the decision as a Ruling (`what — why — cost if wrong`) and continue under the normal flow.

## Correcting a delivered mistake

If an earlier handoff, commit, or report was wrong, say the correction plainly and immediately, in its own message or its own commit. Never fold it into the next unrelated diff.

## Red flags

| Thought | Reality |
|---|---|
| "One more try, then I'll stop" | The tripwire already fired. Freeze now. |
| "I'll keep the code as reference" | Save it as a patch. The tree returns to last good. |
| "The new plan is obvious" | Then the sentence "the old approach failed because…" is easy to write. Write it. |
| "Restarting wastes X hours" | Those hours are spent either way. Keeping code you can't explain is the waste. |
