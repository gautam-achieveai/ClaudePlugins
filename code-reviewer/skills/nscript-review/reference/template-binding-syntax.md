# Template / Skin Patterns

NScript templates are HTML files compiled by `XwmlParser` using HtmlAgilityPack. They use a custom binding syntax for data binding, event binding, and CSS class binding.

**File structure — `xmlns` namespace declarations:**

Format: `xmlns:prefix="AssemblyName!Namespace"` (note the `!` separator, not `.`)
```html
<html lang="en" xmlns="http://www.w3.org/1999/html"
      xmlns:sys="mscorlib!System"
      xmlns:ui="Sunlight.Framework.UI!Sunlight.Framework.UI"
      xmlns:ctrl="McqdbClientCommon!McqdbClient.Controls"
      xmlns:vm="AiChat!AiChat.ViewModels">
```

**`<skin>` element — root of each renderable template:**

Required attributes: `id`, `controltype`, `datacontexttype`
```html
<skin id="DefaultSkin" controltype="ui:UISkinableElement" datacontexttype="vm:ChatViewModel">
```
- `datacontexttype="sys:Object"` means the skin accepts any object as data context

**Binding syntax:**

| Syntax | Type | Default Mode |
|---|---|---|
| `{PropertyPath}` | DataBinding (to DataContext) | OneWay |
| `[PropertyPath]` | TemplateBinding (to control itself) | OneWay |

Binding options (comma-separated after path):
- `Mode=OneWay` — live updates from source
- `Mode=TwoWay` — bidirectional (for inputs)
- `Mode=OneTime` — bind once (default for `ObservableList` wiring)
- `Converter=namespace:ClassName` — value converter
- `Source=TemplateParent` — bind to the control's own properties instead of DataContext

```html
Options="{SubjectListForGrade, Mode=OneWay}"
SelectedOption="{SelectedSubject, Mode=TwoWay}"
ObservableList="{References, Mode=OneTime}"
class.hidden="{ShowDisclaimer, Mode=OneWay, Converter=v:Converters.Toggle}"
class.hidden="{References.Count, Mode=OneWay, Converter=v:Converters.IsEqualTo(0)}"
```

**Common converters:** `Toggle`, `NullToTrue`, `IsNull`, `IsEqualTo(n)`, `IsTrue`, `IsFalse`, `ToSmartTimeLocal`, `EmptyListToFalse`, `PrefixString(n)`

**Event bindings:**
```html
<button event.click="{OnClickUpload}">
<div event.click="{ToggleExpansion, Source=TemplateParent}">
```

**CSS class bindings:**
```html
class.expanded="{IsExpanded, Source=TemplateParent, Mode=OneWay}"
class.highlighted="{IsPositiveFeedback, Mode=OneWay, Converter=v:Converters.IsTrue}"
```

**Inline text binding:**
```html
<span>Game {ShortId, Mode=OneWay}</span>
```

**CSS includes — resolved from compiled `.less` and shared stylesheets:**
```html
<link rel="stylesheet" href="../../McqdbClient/Views/CustomStyles/Styles.css" />
<link rel="stylesheet" href="ChatView.css"/>
```

**Deprecated attributes (compiler warns):** `data-type`, `data-controlType`, `data-templateId` — use `ControlType`, `DataContextType`, `TemplateId` instead.

**What to flag:**

- `xmlns` declarations using `.` separator instead of `!` (e.g., `"AssemblyName.Namespace"` instead of `"AssemblyName!Namespace"`) (CRITICAL)
- Missing `controltype` or `datacontexttype` attributes on `<skin>` elements (HIGH)
- Wrong binding mode: `OneTime` used where `OneWay` (live) or `TwoWay` (input) is needed (MEDIUM)
- Event bindings (`event.click="{Method}"`) referencing methods that don't exist on the DataContext class (CRITICAL)
- `Source=TemplateParent` referencing properties that don't exist on the control class (CRITICAL)
- `Converter=` referencing a converter class that doesn't exist (HIGH)
- `ObservableList` bound to `List<T>` instead of `ObservableCollection<T>` (HIGH)
- Using deprecated `data-type` / `data-controlType` attributes (MEDIUM)
- Missing `<link>` to shared `Styles.css` or `materialdesign.css` (LOW)
- Inline text binding without `Mode=OneWay` on dynamic content (MEDIUM)
- `[Skin("...")]` string in C# that doesn't match the `<skin id="...">` in the corresponding HTML file (CRITICAL)
