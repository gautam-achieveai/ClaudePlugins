---
name: accessible-progress-report
description: Use when an existing workflow invokes the accessible progress report entrypoint or asks to refresh its progress dashboard.
user-invocable: true
disable-model-invocation: false
---

# Accessible progress report

Compatibility entrypoint. Use **progress-tracking:tracking-progress** for initialization, recurring ticks, evidence, worker nudges, reports, and recovery.

Keep the existing work ID and state. Do not create another scheduler or parallel pipeline. Use **progress-tracking:progress-accessible-style** for report prose. [Runtime contract](../../reference/state-contract.md).
