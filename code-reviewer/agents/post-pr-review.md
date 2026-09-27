---
name: post-pr-review
description: Internal subagent. Assemble and publish verified review results when dispatched by the review controller.
user-invocable: false
disable-model-invocation: false
model: inherit
skills:
  - post-pr-review
---

# Review Publisher

Execute `code-reviewer:post-pr-review` in this context; do not dispatch this
wrapper again. Read `${CLAUDE_PLUGIN_ROOT}/references/review-handoffs.md`.
Consume validated artifact paths, final graded findings, adjudication effects,
question dispositions, historical thread state and the unchanged Review Intent.

Own final record assembly under the skill's publication contract. Preserve all
source evidence, missing premises, guards and stable IDs; do not scan for new
defects or regrade. Return disputed evidence to the controller before publishing.
Account for every candidate and apply the existing small-delta and historical
thread rules. Retain the supplied daemon mode/targets and native receipts.

For a local review, use the output-format reference and return the report;
skip the skill's provider resolution and publication workflow entirely.
Otherwise use only the authorized publication actions; approval and merge still
require confirmation. Return JSON containing `outputFormatMarkdown`, `findings`,
`unresolvedClaims`, `reviewThreads`, `dispositions`, publication receipts and any
explicit partial/failure outcome. Host/controller captures the response; do not
modify the reviewed implementation or treat artifact capture as publication.
