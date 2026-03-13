# LESS / CSS Patterns

NScript apps use LESS for styling. LESS files are compiled to CSS via `<DotLess>` MSBuild items, then embedded as resources. The NScript compiler processes embedded `.css` files but does NOT compile LESS itself.

**Standard import pattern:**
```less
@import '../../McqdbClient/Views/CustomStyles/imports.less';
```
Every `.less` file starts with this import to get shared design-system variables.

**LESS variable conventions:**
- Layout units: `@unit`, `@unit2`, `@unit3` (spacing/sizing)
- Theme colors: `@themePrimary`, `@themeCorrect`, etc.
- Arithmetic: `(@unit/2)`, `@unit2*2`, `@unit2*3`

**CSS variable conventions (for runtime theme switching):**
- `var(--progress-bar-bg)`, `var(--card-bg)`, etc.

**Class naming — camelCase:**
```less
.chatMessage { ... }
.messageBubble { ... }
.centerTxt { ... }
.cardHolder { ... }
```

**`.csproj` entries for LESS files:**
```xml
<ItemGroup>
    <DotLess Include="ViewModels\ChatView.less">
        <DependentUpon>ChatViewModel.cs</DependentUpon>
    </DotLess>
</ItemGroup>
<ItemGroup>
    <EmbeddedResource Include="ViewModels\ChatView.css">
        <DependentUpon>ChatView.less</DependentUpon>
    </EmbeddedResource>
</ItemGroup>
```
Pattern: `.less` is `<DotLess>` dependent on the `.cs` ViewModel; `.css` output is `<EmbeddedResource>` dependent on the `.less`.

**What to flag:**

- `.less` files missing import of shared includes (`imports.less`) (HIGH)
- CSS class names not using camelCase (e.g., `.card-holder` instead of `.cardHolder`) (MEDIUM)
- Hardcoded colors instead of LESS variables (`@themePrimary`) or CSS variables (`var(--progress-bar-bg)`) (MEDIUM)
- Missing file triplet: `.cs` + `.html` + `.less`/`.css` not co-located (MEDIUM)
- `.csproj` missing `<DotLess>` item for new `.less` file (HIGH)
- `.csproj` missing `<EmbeddedResource>` for the compiled `.css` output (HIGH)
- `.html` file missing `<link>` to its co-located `.css` file (HIGH)
- `<DotLess>` without `<DependentUpon>` linking to the ViewModel `.cs` file (LOW)

## Project Structure & Naming

**SDK requirement:**
```xml
<Project Sdk="Mcqdb.NScript.Sdk">
```

**Build properties:**

| Property | Default | Description |
|---|---|---|
| `GenerateJs` | `False` (`True` in Release) | Activates JS transpilation |
| `JsOutputPath` | `.\` | Output directory for generated JS |
| `Minify` | `false` (`true` in Release) | Minify output |
| `Uglify` | `false` (`true` in Release) | Uglify variable names |
| `JsOptimize` | `false` (`true` in Release) | Optimize output |
| `EnableDefaultCompileItems` | `true` | When `false`, must list all `<Compile>` items explicitly |

**When `EnableDefaultCompileItems=false`:**
```xml
<ItemGroup>
    <Compile Include="AppCache.cs" />
    <Compile Include="Program.cs" />
</ItemGroup>
```

**Entry point pattern:**
```csharp
[EntryPoint]
public static void Main()
{
    McqDbApp.RealMainApp(new Lazy<IocContainer>(AppConfiguration.GetConfiguration));
}
```
Non-standard entry points (service workers, static page analytics) have their own bootstrap without `McqDbApp`.

**Naming conventions:**
- `*ViewModel` / `*VM` — ViewModels
- `*View` — View controls
- `*Service` — Services
- `*Wrapper` — Wrapper objects (e.g., `TopicWrapper`)
- `*Helper` — Helper utilities
- `*Factory` — Factories
- `*ApiService` — API service classes (e.g., `UserInfoApiService`)

**What to flag:**

- Incorrect naming conventions (MEDIUM)
- New `.cs` files not added to `.csproj` `<Compile>` items when `EnableDefaultCompileItems=false` (CRITICAL)
- `.csproj` not using `Sdk="Mcqdb.NScript.Sdk"` (CRITICAL)
- Missing `[EntryPoint]` attribute on app entry methods (HIGH)
- App entry not calling `McqDbApp.RealMainApp(new Lazy<IocContainer>(AppConfiguration.GetConfiguration))` for standard SPA apps (HIGH)
- Missing `GenerateJs=True` in PropertyGroup for apps that should produce JS output (CRITICAL)
- New `PageVM` without corresponding `rootUrlToPageVM.Add()` entry in `AppConfiguration` (HIGH)
