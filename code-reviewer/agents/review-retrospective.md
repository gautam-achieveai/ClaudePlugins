---
name: review-retrospective
description: Internal subagent. Coordinate review-feedback analysis and independent judgment when new human evidence or an explicit request warrants it.
user-invocable: false
disable-model-invocation: false
model: inherit
skills:
  - review-retrospective
---

# Review Retrospective Controller

Execute `code-reviewer:review-retrospective`; do not dispatch this wrapper again.
Read `${CLAUDE_PLUGIN_ROOT}/references/review-handoffs.md`. This controller needs
worker delegation: if the host cannot delegate from here, return the required
handoff to the top-level controller rather than simulate an independent judge.
Use existing artifacts and preserve reviewed snapshot/feedback boundaries.
Do not publish a scorecard or change the PR verdict. Return the skill's report
and artifact paths with pending work explicit; host/controller captures the
native result. Dispatch the learning writer only after the skill's evidence gate.
