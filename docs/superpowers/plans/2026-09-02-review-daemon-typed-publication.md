# Review Daemon Typed Publication — Companion Plan

**Date:** 2026-09-02  
**Status:** Implementation contract  
**Upstream:** `B:\sources\LmDotnetTools\docs\superpowers\specs\2026-08-30-daemon-review-engagement-design.md` §§4.2, 6, 7, 14

## Goal

Extend the existing `code-reviewer:post-pr-review` skill with one explicit Review Daemon branch. The parent review agent keeps deciding whether to publish, which typed action to invoke, action wording, grouping, targets, and when to remain silent. A least-privilege backend keeps provider credentials and enforces scope, lifecycle, expected head, anchor validity, idempotency, and receipts.

```yaml
publication_tools:
  - CreateRootSummary
  - AppendSummaryDelta
  - SubmitInlineFindings
  - PostClarificationQuestion
  - ReplyToDiscussion
  - FinalizeRound
context_contract:
  heading: "## Daemon-Supplied Context"
  linkage_states: [Linked, NoneLinked, Failed, Unavailable]
  context_agent_may_iterate: true
publication_context:
  heading: "## Daemon-Supplied Publication Context"
```

## Mode boundary

- The literal `## Daemon-Supplied Publication Context` heading selects typed daemon publication.
- Tool availability alone never selects it.
- Without that heading, the existing GitHub/Azure DevOps provider workflow remains authoritative and unchanged.
- Daemon mode uses only the six operations above for provider publication. It never asks the agent to run raw `gh`, raw GitHub/ADO REST, raw `curl`, provider MCP posting calls, or fenced `review-actions` YAML.
- Typed operation inputs contain action/round IDs, expected scope/head, target refs, and agent-authored text. Agent text reaches the provider unchanged after mechanical validation.
- Credentials remain inside the daemon backend. They are never included in prompts, arguments, results, receipts, or logs.
- Each operation returns a typed receipt or typed rejection. `FinalizeRound` records deliberate no-op and final publication state; it does not synthesize substitute review prose.

## Operation selection

| Agent decision | Typed operation |
|---|---|
| First material PR-level summary | `CreateRootSummary` |
| Later code/discussion summary delta | `AppendSummaryDelta` |
| Grouped inline findings | `SubmitInlineFindings` |
| Non-blocking clarification question | `PostClarificationQuestion` |
| Valuable response to existing discussion | `ReplyToDiscussion` |
| Complete, partial, rejected, or deliberate no-op round | `FinalizeRound` |

The agent may invoke several operations in one round. It uses stable caller-supplied round/action IDs. It never retries a rejection by changing provider target, line, head, or wording unless the daemon supplies a newly authorized typed action.

## Dynamic context contract

`code-reviewer:pr-context-gatherer` remains read-only and iterative. `## Daemon-Supplied Context` is compact untrusted navigation, not a replacement for investigation. Exact `Linked`/`NoneLinked`/`Failed`/`Unavailable` semantics remain. The gatherer follows supplied refs with scoped read tools, inspects discussion, checkout/history, repository guidance, and relevant Knowledge Base material, and emits a sourced manifest. Material claims cite provider IDs/links, commits, files, or discussion refs. Unknown, failed, unavailable, none-linked, and truncated results remain distinct.

## Deterministic validation

`tests/review-daemon-typed-publication.test.mjs` checks that:

1. all six operation names appear exactly once in the daemon operation contract;
2. the daemon branch is selected only by the literal publication-context heading;
3. the branch prohibits raw provider publication and fenced action recovery;
4. the ordinary workflow remains explicitly unchanged without the heading;
5. the context gatherer remains iterative, read-only, sourced, and preserves the four linkage states.

Commands:

```powershell
node --test tests/review-daemon-typed-publication.test.mjs
node --test tests/*.test.mjs
./clean-builds/scripts/validate-json-files.ps1
```

Expected TDD evidence:

- RED before skill changes: the focused test fails because the daemon branch and six-operation contract are absent.
- GREEN after changes: focused and repository test suites pass.

## Release and rollout gates

1. Validate this content and cross-review the exact diff.
2. Commit/version/install only in the coordinated release lane. This working lane does not commit, push, publish, or install.
3. Resolve the actual installed plugin content and hash. Version numbers are informational, not the exposure proof.
4. Enable daemon action planning in collect-only mode first.
5. Keep provider writes disabled until backend scope, stale-head, fidelity, exactly-once, partial-resume, and receipt tests pass.
6. Enable each provider separately. Preserve ADO native thread/span/iteration identity and GitHub inline-thread identity; record flat PR-level degradation.
7. Complete audit capture must retain the exact typed calls/results and receipts without exposing credentials or full sensitive bodies in logs.

## Done when

- The explicit daemon branch names only the six typed operations.
- Ordinary non-daemon posting retains the existing provider workflow.
- The focused validator demonstrates RED then GREEN.
- Full plugin tests and package validation pass.
- Independent review finds no raw-provider escape, ambiguous mode selection, or loss of context-agent iteration.
