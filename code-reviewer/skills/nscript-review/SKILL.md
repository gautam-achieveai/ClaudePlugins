---
name: nscript-review
description: >
  NScript client code review — AutoFire/nameof enforcement, Promise patterns,
  IoC registration, C# restrictions, MVVM patterns, template bindings, LESS
  conventions, and JS interop attributes. Load reference files on demand.
allowed-tools:
  - Read
---

# NScript Review — Domain Reference Loader

This skill provides on-demand loading of NScript domain rules for the nscript-review
agent. Each reference file covers a specific domain area with correct patterns,
anti-patterns, severity levels, and what NOT to flag.

## Load References On Demand

Load ALL reference files to have complete domain knowledge for review:

```
reference/autofire-properties.md
reference/async-promise-patterns.md
reference/ioc-di-patterns.md
reference/csharp-restrictions.md
reference/mvvm-observable.md
reference/interop-attributes.md
reference/template-binding-syntax.md
reference/less-css-conventions.md
```

## How to Use

1. Load all references at the start of review
2. For each changed file, apply the relevant domain rules
3. Flag violations at the severity levels defined in each reference
4. Respect the "What NOT to flag" sections — these prevent false positives
5. Use the type mapping table in `csharp-restrictions.md` as your primary lookup for type translations
