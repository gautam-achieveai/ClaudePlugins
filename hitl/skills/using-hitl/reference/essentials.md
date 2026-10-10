# HITL essentials

HITL reaches the human on every device, even when they are away from the terminal. When its tools are available, use it for anything the human must read or decide. Load `hitl:using-hitl` for the full rules: question fields, plan review verdicts, progress revisions.

## Which tool

- **AskUserQuestion**: a decision, a missing preference, a blocker or an approval. Never the host's built-in question tool. Batch up to 4 related questions. Always set `context`. Give each question its reason. Never leave a question open in chat.
- **ReviewPlan**: a plan or spec. Write it to a Markdown file first. A new plan gets a new file; a revision reuses the file, so the human sees a diff.
- **HandOff**: the work is finished. Call it instead of ending the turn. `continue`: do its instructions, then hand off again. `end`: reply in one line and stop.
- **Notify**: one-off news, such as build or tests finished, a blocker, or a long job started. It does not wait.
- **UpdateWork / ReadWork**: long or multi-step work. Keep one living report per goal; use ReadWork to resume.
- **setup**: only when setup or a repair is asked for.

Never pass a `timeout` argument; the host's server timeout (6 hours) governs waits. Silence, a timeout, a skipped review or a failed call is not approval. Don't ask for facts you can look up. Don't interrupt routine, reversible work the human already asked for. Never send keys, config or credentials.

## Write for the human

Assume the reader is dyslexic, has ADHD, and is not an expert. This applies to every question, plan, handoff, notification and progress update.

- Lead with the outcome, decision or blocker. No preamble. Don't repeat yourself.
- Short sentences. One idea per bullet. Use headings and bullets, not walls of text.
- Use plain words. Explain a technical term in a few words the first time, or avoid it. Give a concrete example or an everyday comparison for anything complex.
- Say why it matters: what changes for the human, and what could go wrong.
- Bold only the one thing to notice. Keep tables narrow; the human may read on a phone.
- Use they/them unless the human's pronouns are known.

**Questions.** One line on what you need and why. Options get short labels, each with a one-line consequence in plain words. Mark one "(Recommended)" and say what happens by default. `context` names the project and what you are doing.

**Plans** (ReviewPlan). Keep the main part to about 12 lines, in this shape:

- `# Plan: <outcome>`
- `**Done when:**` the evidence that proves it
- `## Key dots`: 3-7 steps, each an outcome
- `## Your decision`: only if one is open; give a recommendation and a safe default
- `## Proof`, then `## Material risks`
- `**Now / next:**`

Put the detail under a `## Reference` heading at the end. Add a small diagram only when it replaces words.

**HandOff.** `title`: the outcome in a few words. `summary`, at most 1200 characters:

- **Outcome:** done, done with risks, blocked or failed
- **Did:** 3-5 bullets
- **Not done / risks:** and **Needs you:**, dropped when empty

**Notify and UpdateWork.** The title says what happened. The body gives the result, the evidence and the next step. Send one message per real change.

**Evidence.** Say what you ran and what you saw. Never claim a check passed without its result. Say what you skipped.
