# 🎭 playwright-plugin-web-from-json

[![Npm package weekly downloads](https://badgen.net/npm/dw/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

[![Npm package weekly downloads](https://badgen.net/npm/dm/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

[![Npm package weekly downloads](https://badgen.net/npm/dy/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

Generate **Playwright** tests from **JSON files**. Point to a folder (e.g., `Fixtures/`) and get fully wired suites & test cases — no boilerplate specs.

> ✨ **Auto-scaffold on install (postinstall):**
>
> - Creates **`Fixtures/`** at project root (if it doesn't exist).
> - Creates **`Fixtures/example.json`** with a working example.
> - Creates **`tests/json-plugin.spec.ts`** (or uses **`e2e/`** if present; if neither exists, it creates `tests/`).  
>   👉 Existing files are **not overwritten**.

---

## 📚 Table of Contents

- [Installation](#-installation)
- [Run locally with VS Code + Live Server](#-run-locally-with-vs-code--live-server)
- [Quick Start](#-quick-start)
- [How It Works](#-how-it-works)
- [JSON Schema](#-json-schema)
- [Supported Actions + Examples](#-supported-actions--examples)
- [Disambiguation, Scoping & Iframes](#-disambiguation-scoping--iframes)
- [Targets & Locator Rules](#-targets--locator-rules)
- [Dynamic Values: `faker` and `date(...)`](#-dynamic-values-faker-and-date)
- [Advanced Configuration](#-advanced-configuration)
- [Troubleshooting](#-troubleshooting)
- [Extensibility](#-extensibility)
- [Full Examples](#-full-examples)
- [FAQ](#-faq)
- [License](#-license)

---

## 🔧 Installation

```bash
npm init playwright
npm i playwright-plugin-web-from-json
npx playwright install
```

---

## 🚀 Quick Start

**`tests/json-plugin.spec.ts`**

```ts
import { test } from "@playwright/test";
import { generateTestsFromJson } from "playwright-plugin-web-from-json";
import path from "path";

generateTestsFromJson(
  {
    dir: path.resolve(process.cwd(), "Fixtures"),
  },
  test
);
```

---

## 🧠 How It Works

- Each JSON file becomes a `describe.serial(...)` suite.
- `browser.newContext()` / `page` per suite (`beforeAll/afterAll`).
- `url` resolution rules:
  - `url` omitted → stay on page.
  - `url` empty (`""`) → navigate to baseURL.
  - `url` relative → resolve against baseURL.
  - `url` absolute → use as-is.

---

## 🧩 JSON Schema

```jsonc
{
  "describe": {
    "text": "Suite name",
    "before": "../hooks/login.json",
    "<case>": {
      "title": "Case title",
      "url": "/route-or-http",
      "context": {
        "nth": 0,
        "first": false,
        "last": false,
        "within": ".container",
        "frame": "iframe#app"
      },
      "actions": []
    }
  }
}
```

---

## 🛠 Supported Actions + Examples

### 🪜 `root`

Sets a base locator for the current action.

```jsonc
{ "root": ".modal", "click": "button > Confirm" }
// ref const base = page.locator('.modal')
// ref await base.locator('button', { hasText: 'Confirm' }).first().click()
```

---

### ⬆️ `parent`

Targets the parent element of a given text or selector.

```jsonc
{ "parent": "User Details", "click": "button > Edit" }
// ref const parent = page.getByText('User Details', { exact: true }).locator('..')
// ref await parent.locator('button', { hasText: 'Edit' }).click()
```

---

### 📖 `getText`

Extracts and logs text content of a selector.

```jsonc
{ "getText": "h1 > Welcome" }
// ref const text = await page.locator('h1', { hasText: 'Welcome' }).textContent()
// ref console.log('[getText] =>', text)
```

---

### 🖱️ `click`

```jsonc
{ "click": "#save" }
// ref await page.locator('#save').first().click()
{ "click": "Login" }
// ref await page.getByText('Login', { exact: true }).first().click()
{ "click": "a > Writing tests" }
// ref await page.locator('a', { hasText: 'Writing tests' }).first().click()
```

> All clicks retry with `{ force: true }` on failure.

---

### ⌨️ `type` / `typeSlow`

```jsonc
{ "loc": "#email", "type": "faker.internet.email()" }
{ "loc": "#name", "typeSlow": "faker.person.fullName()" }
```

> `typeSlow` uses `pressSequentially` with delay 300ms.

---

### 🎯 `expectVisible`

```jsonc
{ "expectVisible": "#toast", "timeout": 5000 }
{ "expectVisible": { "timeout": 3000 }, "loc": "#toast" }
```

---

### ✅ `expectText`

```jsonc
{ "expectText": { "equals": "Welcome" }, "loc": "h1" }
{ "expectText": { "contains": "orders" }, "loc": ".stats" }
```

---

### 👀 `expectUrl`

```jsonc
{ "expectUrl": { "equals": "https://app.example.com" } }
{ "expectUrl": { "contains": "#/dashboard" } }
```

---

### 🌐 `waitRequest`

```jsonc
{ "waitRequest": { "urlIncludes": "/api/orders", "status": 200 } }
```

---

### 🐭 `hover`

```jsonc
{ "hover": "#menu" }
```

---

### 🎹 `press`

```jsonc
{ "press": "Enter", "loc": "#input" }
{ "press": "Control+A" }
```

> Falls back to `page.keyboard.press()` when no locator given.

---

### ☑️ `check` / `uncheck`

```jsonc
{ "check": "#terms" }
{ "check": true, "loc": "#accept" }
{ "uncheck": "#subscribe" }
```

---

### 🔽 `select`

```jsonc
{ "select": { "label": "Brazil" }, "loc": "#country" }
{ "select": { "value": ["BR","US"] }, "loc": "#multi-country" }
```

---

### 📤 `upload`

```jsonc
{ "upload": ["tests/avatar.png", "tests/photo.png"], "loc": "input[type=file]" }
```

---

### 🕓 `wait`

```jsonc
{ "wait": 1000 }
```

---

### 📸 `screenshot`

```jsonc
{ "screenshot": { "path": "screens/page.png", "fullPage": true } }
```

---

### 🧩 Notes

- Default index: `.first()` if no `nth/first/last`.
- `url: ""` navigates to baseURL.
- Clicks auto-retry with `{ force: true }`.
- Supports `tag > text` pattern in locators.

---

## 🎯 Disambiguation, Scoping & Iframes

Use `nth`, `first`, `last`, `within`, `frame`, and combine with `root` or `parent` for nested structures.

---

## 🧪 Dynamic Values: `faker` and `date(...)`

```jsonc
{ "loc": "#email", "type": "faker.internet.email()" }
{ "loc": "#start", "type": "date(today+7, \"dd/MM/yyyy\")" }
```

---

## 🧷 Advanced Configuration

```ts
import { test } from "@playwright/test";
import { generateTestsFromJson } from "playwright-plugin-web-from-json";

generateTestsFromJson(
  { dir: "Fixtures", baseURLOverride: "https://your-app.example" },
  test
);
```

---

## 🧾 Full Examples

(keep original example suite listings here — unchanged)

---

## 📄 License

MIT
