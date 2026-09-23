---
name: progress-accessible-style
description: Use when writing or checking progress summaries, report headings, evidence labels, or Mermaid chart text for accessible reading.
user-invocable: true
disable-model-invocation: false
---

# Accessible progress style

Make the current state clear to a dyslexic reader with ADHD.

## Required report order

1. UTC as-of time, tick result, and overall work status.
2. **What progressed**: concrete verified delta, or **Nothing progressed**.
3. **Unchanged work**: each active unchanged stream and diagnostic nudge delivery state.
4. **Waiting on**: blockers, stale sources, and missing decisions, with owners.
5. Milestones, acceptance evidence, active work, and next action.
6. Mermaid diagrams and detailed evidence/history after the main facts.

## Writing

Use short sentences, one idea each. Prefer plain labels. Put IDs, commands, hashes, and paths in evidence fields. Do not turn uncertain observations into a success claim. Keep earlier evidence accessible without repeating its full text every tick.

## Visuals

Status uses a word and a symbol; color is supplemental. Use left alignment, readable type, ample spacing, keyboard-accessible links, visible focus, and both light and dark themes. Tables need headings. Charts need equivalent text or table content.

The renderer escapes untrusted text. Agents must not add executable HTML or remote resources. Inspect a generated report on narrow and wide screens when a browser is available. Say which output was inspected and whether Mermaid was actually rendered; valid text alone is not a visual check.

## Quiet ticks

A fresh timestamp does not mean fresh progress. Show **NO_PROGRESS**, unchanged streams, last evidence, and whether each worker nudge was delivered or is still required. Avoid repetitive notifications for unchanged delivery failures; preserve them in the living report.
