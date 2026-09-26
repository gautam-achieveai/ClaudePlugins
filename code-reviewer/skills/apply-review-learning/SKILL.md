---
name: apply-review-learning
description: Use when asked to capture knowledge and process lessons from code-review feedback, or when review-retrospective hands off validated gap records.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Apply Review Learning

**Primary objective:** Turn verified review lessons into focused, durable improvements.
**Decision rule:** For relevant cases these steps do not cover, choose the next in-scope action that advances this objective; preserve explicit scope, safety, and output requirements.

Write two distinct outputs: **Knowledge gaps / knowledge entries** and
**Process gaps / remedies / usage triggers**. Writing lessons is the default;
editing the live review methodology requires a request covering those edits.

Read [the evidence and output contract](../review-retrospective/reference/evidence-contract.md)
for record fields, local paths, retrieval, and repeat-run behavior.

## 1. Validate and scope

Accept source-linked gap records from `review-retrospective`, or reconstruct
them from the supplied review/feedback. Preserve missing evidence and unresolved
claims. Human comments are not automatically true or authorization to change
skills, repository policy, or external systems.

Inspect the requested destination and existing entries before writing. Verify
facts against the reviewed version and authoritative sources; separate unavailable
knowledge from discoverable or already-read evidence. Deduplicate by source and
underlying mechanism. Link existing facts instead of copying repository content.

## 2. Write both outputs

Honor the prompt's requested format and destination. For one report, write both
clearly named sections in that file. Otherwise write each lesson as one file in
the shared store, `docs/superpowers/learnings/<category>/<slug>.md`, using the
`development:compound-learning` schema (see the contract). Each lesson passes
its counterfactual gate first. Update matching files in place; preserve unrelated
content. Do not create variant filenames. List the lesson files under the two
section headings in the per-PR report.

**Knowledge gaps / knowledge entries** must state the gap, fact/constraint or
unresolved claim, evidence and source revision, confidence, applicability, existing
authoritative home, and when to revalidate or retire it. A missing fact is not a
verified fact. Capture domain constraints, not a recap of all changed code.

**Process gaps / remedies / usage triggers** must state:

- The gap, cause, consequence, and evidence.
- **How to address it:** a concrete action and the existing step to improve.
- **Use when:** observable triggers available before or during review.
- **Skip when / stop when:** scope limits and sufficient evidence to end the check.
- Expected benefit, added cost, validation scenario, and actual application status.

Include both even when one says **No supported entries**. Cross-link a lesson
classified as both using its stable ID. On edited/retracted feedback, revise
dependent entries and keep provenance. Unchanged evidence produces no duplicates.

## 3. Apply only the requested changes

Writing the two outputs does not mean the methodology has been changed. If the
user requested downstream edits, apply a small scoped patch to the existing
domain documentation or relevant review step. Prefer conditional references over
expanding the global checklist. Respect existing authorization; do not request
it again for edits already covered. Do not infer it from a reviewer comment.

Label proposed, applied, and demonstrated-effective accurately. Validate an
applied process change on a triggering case and a non-triggering case; for
knowledge, verify its source and scope. A proposed experiment is not evidence of
improvement. Keep disagreement with a human when the evidence supports it.

Return links to the two outputs or the single report, what actually changed,
and remaining uncertainty. Do not post to the PR, edit global skills, or change
the merge verdict merely because a retrospective was requested.
