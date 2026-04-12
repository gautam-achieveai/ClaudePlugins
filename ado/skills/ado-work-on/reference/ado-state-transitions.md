# ADO Work Item State Transitions

State names vary by process template. Use this reference to apply the correct
state for each transition.

## Process Templates

### Agile

| Type       | New     | Active   | Resolved  | Closed  |
|------------|---------|----------|-----------|---------|
| User Story | New     | Active   | Resolved  | Closed  |
| Bug        | New     | Active   | Resolved  | Closed  |
| Task       | New     | Active   | Closed    | —       |

### Scrum

| Type                | New     | Active      | Done       |
|---------------------|---------|-------------|------------|
| Product Backlog Item| New     | Approved → Committed | Done |
| Bug                 | New     | Approved → Committed | Done |
| Task                | To Do   | In Progress | Done       |

### CMMI

| Type        | Proposed  | Active   | Resolved  | Closed  |
|-------------|-----------|----------|-----------|---------|
| Requirement | Proposed  | Active   | Resolved  | Closed  |
| Bug         | Proposed  | Active   | Resolved  | Closed  |
| Task        | Proposed  | Active   | Closed    | —       |

## Transition Strategy

When updating state, try these in order until one succeeds:

1. **Active/In Progress**: Try `Active` first, then `In Progress`, then `Committed`
2. **Resolved/Done**: Try `Resolved` first, then `Done`, then `Closed`

The `updateWorkItem` tool will return an error if the state name is invalid for
the project's process template. Catch the error and retry with the next variant.

## Common Fields for State Updates

```
State: <new state>
```

Optionally set `Reason` alongside state changes:
- New → Active: Reason = "Implementation started"
- Active → Resolved: Reason = "Code complete" or "Fixed"
