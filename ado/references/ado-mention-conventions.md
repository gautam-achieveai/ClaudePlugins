# ADO Mention Conventions

## Work Item References
- `#<id>` — inline reference to a work item (e.g., "See #1234")
- `AB#<id>` — auto-link in PR descriptions (creates ADO hyperlink)
- `Fixes #<id>` — state transition keyword (resolves the work item)

## PR References
- `!<id>` — reference a PR in work item discussions

## Bot Reply Prefix
All automated replies MUST be prefixed with `[<developer name>'s bot]`.
Determine developer name from PR author or `git config user.name`.
