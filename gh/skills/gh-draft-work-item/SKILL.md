---
name: gh-draft-work-item
description: >
  Conversational wizard that turns rough requirements into a well-structured
  GitHub issue. Asks clarifying questions one at a time, helps determine the
  issue type, labels, project placement, and iteration, then previews the issue
  for confirmation before creating it. Use when the user says "draft a work
  item", "I have a rough requirement", "help me write a bug report", "turn this
  into a user story", or provides unstructured requirements and wants a GitHub
  issue created.
---

# Draft Work Item (GitHub)

This is a thin GitHub wrapper around the provider-agnostic
`development:draft-work-item` skill. It pins the backend to **GitHub** and makes
sure GitHub tooling is ready, then hands the conversation off to the shared
wizard.

## Steps

1. **Ensure GitHub tooling is ready.** Before the first GitHub operation, verify
   the GitHub MCP tools are available. If the first call fails (connection error,
   tool not found, missing write toolsets, or auth failure), follow the auto-setup
   rule in `gh/CLAUDE.md`: automatically use the `gh:setup-gh-mcp` skill, then
   retry. Fall back to the `gh` / `gh api` CLI when MCP coverage is insufficient.

2. **Delegate to the shared wizard.** Load and execute the
   `development:draft-work-item` skill with the provider set to **GitHub** (so it
   skips auto-detection) and pass through the user's raw requirement text. The
   shared wizard runs the GitHub branch end to end: classify → labels, repo /
   GitHub Project placement, milestone / iteration, duplicate issue search,
   preview, and issue creation.

3. **Follow-up.** When the wizard finishes, it offers the next step:
   Start `/gh-work-on <id>`, create another item, or stop here.

## Notes

- All GitHub mention/reference conventions are applied by the shared wizard.
- Comments are append-only — never edit existing GitHub issue or PR comments
  (see `gh/CLAUDE.md`).
