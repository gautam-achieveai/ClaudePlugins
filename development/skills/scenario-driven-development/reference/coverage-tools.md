# Coverage Tools

Load in Stage 3. Use the project's existing coverage command first. If none exists, use the stack's tool below. If that tool is not installed, say so in the report and do not install it without asking.

| Stack | Run | Read the result |
| --- | --- | --- |
| C# / .NET | `dotnet test --collect:"XPlat Code Coverage"` (coverlet collector; needs the `coverlet.collector` package, which the xUnit/NUnit/MSTest templates include) | Cobertura XML under `TestResults/<guid>/coverage.cobertura.xml`. HTML: `reportgenerator "-reports:**/coverage.cobertura.xml" -targetdir:coverage -reporttypes:Html` |
| C# / .NET (no coverlet) | `dotnet test --collect "Code Coverage;Format=cobertura"` (Microsoft collector, ships with `Microsoft.NET.Test.Sdk`; nothing to install) | Cobertura XML under `TestResults/<guid>/` |
| C# / .NET (alt) | `dotnet-coverage collect -f cobertura -o coverage.cobertura.xml "dotnet test"` (global tool: `dotnet tool install -g dotnet-coverage`) | Same Cobertura XML; also works for processes other than `dotnet test` |
| JS / TS (Vitest) | `vitest run --coverage` (needs `@vitest/coverage-v8` or `@vitest/coverage-istanbul`) | `coverage/` (text summary in the terminal) |
| JS / TS (Jest) | `jest --coverage` | `coverage/lcov-report/index.html`, `coverage/lcov.info` |
| JS / TS (other, incl. `node --test`) | `c8 <test command>`, or `node --test --experimental-test-coverage` | Terminal table; `c8 report --reporter=lcov` for files |
| Python | `pytest --cov=<package> --cov-branch --cov-report=term-missing` | `Missing` column lists uncovered lines |
| Go | `go test -coverprofile=cover.out ./...` | `go tool cover -func=cover.out`; `go tool cover -html=cover.out` |
| Rust | `cargo llvm-cov --html` (or `--lcov --output-path lcov.info`) | `target/llvm-cov/html/index.html` |
| Java / Kotlin | JaCoCo via the build (`gradle jacocoTestReport`, `mvn test jacoco:report` with the `prepare-agent` goal configured) | `build/reports/jacoco/` or `target/site/jacoco/` |
| Other | The project's existing coverage command | If none exists, say so; Stage 3 then reviews changed lines by hand |

## Narrow to the changed code

Coverage of the whole repo is noise. Look only at lines this change touched:

- List changed files: `git diff --name-only <base>...HEAD` (plus uncommitted: `git diff --name-only`).
- Filter the report to those files (most tools take an include filter: coverlet `--collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Include=[Assembly]Namespace.*`, `pytest --cov=<module>`, `c8 --include`, `vitest --coverage.include`).
- Prefer branch coverage over line coverage when the tool supports it (`--cov-branch`, coverlet reports branches by default).

## Rank the gaps

Uncovered changed lines, highest risk first:

1. Error and failure paths (catch blocks, error returns, retries).
2. Boundaries (empty, zero, max, off-by-one, null).
3. Security and permissions (auth checks, input validation).
4. Data loss or corruption (writes, deletes, migrations).
5. Everything else.

Pick the fewest tests that cover the most of the top of that list. Record each line you leave uncovered with one reason: unreachable, trivial, or covered by a manual-only scenario.
