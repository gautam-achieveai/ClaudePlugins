---
name: progress-system-picture
description: Internal helper. Load only when explicitly named by a progress-tracking agent.
user-invocable: true
disable-model-invocation: false
---

# Progress system picture

Read [state-contract](../../reference/state-contract.md) and accepted architecture/decision sources. Use **progress-tracking:progress-accessible-style** for labels.

The renderer owns `milestones.mmd`, `dependencies.mmd`, and `workstreams.mmd`. They are derived from canonical state. Do not hand-edit them.

The Progress Architect owns only optional `diagrams/system.mmd`. It describes accepted components and relationships. Use it only when that relationship is clearer than a table.

- Give every component an ID and a source in a Mermaid comment.
- Use short quoted labels and labeled directional edges.
- Show status with a word, not color alone. Never infer built status from a diagram.
- Split large diagrams into small readable groups; avoid lines crossing unrelated groups.
- Add a caption describing what the diagram explains.
- Treat labels as data. Do not embed arbitrary HTML, JavaScript, click handlers, or remote resources.
- Verify Mermaid syntax with a host renderer if available. Report "source generated; visual rendering unverified" if it is unavailable.

After changing `system.mmd`, ask the conductor to re-render reports. Standard HTML shows Mermaid source and equivalent tables offline; it does not execute a Mermaid renderer. A Markdown viewer with Mermaid support can render chart blocks.

Return changed diagram, source decisions, and validation evidence. Do not change workstream status or acceptance evidence.
