# Repo Conventions

Load this reference before enforcing repo-specific policy in `pr-review` Step 0.5.

## Convention File

Look for `.code-reviewer.yml` at the repo root. If this is a monorepo, also check
`sources/*/.code-reviewer.yml`.

Example:

```yaml
default_base_branch: main
branch_prefix_pattern: '^feature/\d+_[a-z0-9_]+$'
test_project_map:
  src/App/App.csproj:
    - tests/App.Tests/App.Tests.csproj
build_command: dotnet build MySolution.sln
security_sensitive_paths:
  - src/Auth/**
  - src/Payments/**
ci_test_marker: <repo-specific-ci-test-marker>
```

## Supported Keys

- `default_base_branch` - fallback base branch for local reviews when PR metadata is unavailable
- `branch_prefix_pattern` - regex for allowed source branch names
- `test_project_map` - source-to-test project mapping used by test coverage review
- `build_command` - repo-specific build command when the default ecosystem command is wrong
- `security_sensitive_paths` - paths that should trigger stricter review and broader agent dispatch
- `ci_test_marker` - optional repo-specific marker or trait required for CI test inclusion

## Fallback Rules

If no convention file exists:

1. Prefer the PR's actual target branch when reviewing an existing PR.
2. Otherwise auto-detect the default base branch with:
   ```bash
   git symbolic-ref refs/remotes/origin/HEAD
   ```
3. If that fails, fall back to `main`, then `master`, then `dev`.
4. If `branch_prefix_pattern` is unknown, do **not** invent a naming policy from
   a previous repo or reviewer habit. Skip the check unless the branch looks
   generated and you need to emit a `[QUESTION]`.
5. If `test_project_map` is unknown, infer likely test projects from naming
   patterns such as `<Project>.Tests`, `<Project>.UnitTests`, or
   `<Project>.IntegrationTests`, and state uncertainty when the mapping is ambiguous.

## Guardrails

- Never import defaults from another repo.
- Never guess a target branch when the PR metadata already tells you.
- Only enforce repo-specific CI markers when the repo conventions define them.
