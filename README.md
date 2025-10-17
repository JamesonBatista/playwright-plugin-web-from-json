<!-- Badges: START -->
<p align="center">
  <a href="https://github.com/jamesonbatista/playwright-plugin-web-from-json"><img alt="Repo" src="https://img.shields.io/badge/repo-playwright--plugin--web--from--json-111?logo=github&style=for-the-badge"></a>
  <a href="https://www.npmjs.com/package/playwright-plugin-web-from-json"><img alt="npm version" src="https://img.shields.io/npm/v/playwright-plugin-web-from-json?style=for-the-badge&logo=npm&label=version&color=cb0000"></a>
  <img alt="node-current" src="https://img.shields.io/node/v/playwright?style=for-the-badge&label=node">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-0bda51?style=for-the-badge">
  <img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-14b8a6?style=for-the-badge&logo=github">
</p>
<!-- Badges: END -->


# ✨ Playwright Web-from-JSON

```cmd
npm init --y
npm init playwright
npm i playwright-plugin-web-from-json
```

## Created file/folder structure

```
.
├─ hooks/
│  └─ before-json.json              # A JSON “before” chain you can reuse from other JSONs
├─ Fixtures/
│  ├─ playwright-plugin-web-from-json.json  # Full Scenario Lab suite (many actions/assertions)
│  ├─ before-plugin.json            # Example that reuses `../hooks/before-json.json`
│  ├─ plugin-example-voe-latam.json # Example flow on LATAM site (Brazil)
│  └─ plugin-example-auto.json      # Example flow on your demo app (GitHub Pages)
├─ html/
│  └─ index.html                    # “Scenario Lab” static page used by tests
├─ help/
│  └─ plugin-func.ts                # Implements class `RunPluginFunctions` for `"run"` actions
└─ tests/ or e2e/
   └─ json-plugin.spec.ts          # Playwright spec that loads JSON from `Fixtures/`
```

> If neither `tests/` nor `e2e/` exists, `tests/` will be created and used by default.

---

## File-by-file details

### `hooks/before-json.json`

Reusable **pre-test chain** that other JSON files can reference via `"before": "../hooks/before-json.json"`.

- Example content opens the LATAM site and performs a minimal wait.
- Good place to add login flows, cookies, feature flags, etc.

```jsonc
{
  "describe": {
    "text": "Before",
    "url": "https://www.latamairlines.com/br/pt",
    "case-key": {
      "title": "Buy ticket",
      "actions": [{ "wait": 3000 }]
    }
  }
}
```

---

### `Fixtures/playwright-plugin-web-from-json.json`

**Main showcase suite** targeting `html/index.html` (the Scenario Lab). It demonstrates most of the plugin’s capabilities:

- Navigation & URL assertions (`expectUrl` with `contains`)
- Click by **selector** or **exact text**
- `hover` + `expectVisible` tooltip
- `type` / `typeSlow` / `press` (Enter) with **faker** support
- Form controls: `check`, radio, `select`, `upload`
- `expectText` with and without `loc`
- Multiple matches with `nth` / `first` / `last`
- Scoped searches with `within`
- Iframe interactions with `frame`
- Network synchronization with `waitRequest`
- Modal visibility + `screenshot` target
- A `forEach` playground that iterates over generated cards

Target URL for this suite:

```json
{ "url": "http://127.0.0.1:5500/html/index.html" }
```

> Tip: use **Live Server** in VS Code to serve `/html/index.html` at `http://127.0.0.1:5500/html/index.html`.

---

### `Fixtures/before-plugin.json`

**Automation example** that shows how to **chain a reusable “before” file**:

```jsonc
{
  "describe": {
    "text": "Using Test before Funcion",
    "before": "../hooks/before-json.json",
    "wait before each test": {
      "text": "wait before each test",
      "actions": [{ "wait": 3000 }]
    }
  }
}
```

Use this pattern to share setup logic across multiple JSON suites (auth bootstrap, cookies, etc.).

---

### `Fixtures/plugin-example-voe-latam.json`

Real-world example that opens **LATAM Airlines** and performs a small flow using actions like `root`, `parent`, `click`, `type`, `expectVisible`, and simple date clicks. It demonstrates:

- Mixed **scoping** (`root` + `parent`) to shorten selectors
- Text-based interactions (click by visible label)
- Basic calendar interaction (example dates)
- Passengers selector interaction
- `wait` to stabilize steps

> You can tailor the selectors/dates according to the site’s current layout and locales.

---

### `Fixtures/plugin-example-auto.json`

Example using your **demo web app** hosted on GitHub Pages:

- Logs in with `faker`-generated entries
- Performs a **register flow**, including `select` and `parent` scoping
- Demonstrates `frame` + `root` + `run` combos and `typeSlow`
- Shows a **Tasks** flow using `run` return values to fill fields

This file is great to see **`run`** in action paired with dynamic fields:

```jsonc
{ "run": "randomUser" }
{ "type": "{resultFunc.username}" }
```

---

### `html/index.html` (Scenario Lab)

A static page purposely built to **exercise plugin actions/assertions** in a deterministic way:

- Hover tooltips
- Buttons that show toasts/labels
- Inputs for typing/press
- Radio/checkbox/select/upload
- Repeated rows for `nth/first/last`
- A small iframe with a button and toast
- Network buttons calling **JSONPlaceholder**
- A modal dialog
- A **forEach** playground that generates a grid of cards (with inner buttons)

Serve locally with VS Code **Live Server**:

1. Install the extension “Live Server”
2. Right-click `html/index.html` → **Open with Live Server**
3. Confirm the URL used in the JSON: `http://127.0.0.1:5500/html/index.html`

---

### `help/plugin-func.ts` (RunPluginFunctions) **NOT CHANGE NAME**

Implements `export class RunPluginFunctions` that your JSON can call with `"run": "<methodName>"`. Methods may be **sync** or **async** and can return **strings, numbers, or objects**. Returned values are exposed under **`{resultFunc}`** (or `resultFunc.*` for object fields).

Provided examples:

```ts
export class RunPluginFunctions {
  // not change name class
  hello() {
    return { greeting: "hello", email: "qa@example.com" };
  }
  async randomUser() {
    return { username: "user_" + Math.random().toString(36).slice(2, 7) };
  }
  async delayedCode() {
    await new Promise((r) => setTimeout(r, 1000));
    return "CODE-" + Math.floor(Math.random() * 999);
  }
  randomCode() {
    return Math.floor(Math.random() * 10000);
  } // number
  userEmail() {
    return "user_" + Date.now() + "@example.com";
  } // string
}
```

Usage in JSON:

```jsonc
{ "run": "randomUser" }
{ "type": "{resultFunc.username}", "loc": "#taskDescription" }
{ "run": "hello" }
{ "typeSlow": "{resultFunc.greeting}", "loc": "#address" }
```

> The loader tries multiple export styles: named export, default class, or default object with `RunPluginFunctions`. Keep the class name and export consistent.

---

### `tests/json-plugin.spec.ts` (or `e2e/json-plugin.spec.ts`)

The Playwright spec that **generates tests from all JSON files** placed in `Fixtures/`:

```ts
import { test } from "@playwright/test";
import { generateTestsFromJson } from "playwright-plugin-web-from-json";
import path from "path";

generateTestsFromJson(
  {
    dir: path.resolve(process.cwd(), "Fixtures"),
    // baseURLOverride: "http://127.0.0.1:5500/html/index.html",
    // functionsPath: path.resolve(process.cwd(), "help/plugin-func.ts"),
    allowNoopWhenEmpty: true,
  },
  test
);
```

- `dir`: folder to scan for JSON suites
- `baseURLOverride`: point all cases to a given base URL (handy for Scenario Lab)
- `functionsPath`: direct path to your `RunPluginFunctions`
- `allowNoopWhenEmpty`: avoid failure if a JSON ends up empty (optional convenience)

#

## `config/before-config.ts`

This file is **automatically created** by the setup script. It serves as a single place to centralize any logic you want to run **before each test** (e.g., authentication, cookies, feature flags, `viewport`, `locale`, `storageState`, etc.). By default, nothing runs — it simply exports an extended `test` so you can enable fixtures/hooks later.

---

## What is generated

```ts
// config/before-config.ts
import { test as base, expect } from "@playwright/test";

// (Optional) Define fixture types here if you plan to add any later.
type Fixtures = {};

// Extend Playwright's test. For now, no custom fixtures or hooks are active.
// This file is a placeholder so you can easily enable per-test context/page or
// any "before each" logic later without changing your runner signature.
export const test = base.extend<Fixtures>({
  // Example (disabled): provide a custom BrowserContext per test
  // context: async ({ browser }, use) => {
  //   const context = await browser.newContext({ /* options */ });
  //   await use(context);
  //   await context.close();
  // },

  // Example (disabled): provide a Page per test and run pre-test actions
  // page: async ({ context }, use) => {
  //   const page = await context.newPage();
  //   // Place any per-test setup here (cookies, flags, login, etc.)
  //   await use(page);
  //   await page.close();
  // },
});

// Global hooks — currently no-ops. Keep them to quickly add logic later if needed.
test.beforeEach(async ({ /* page, context */ }) => {
  // Reserved for actions to run before each test.
});

test.afterEach(async ({ /* page, context */ }) => {
  // Reserved for actions to run after each test.
});

export { expect };

```
---

## Use recomended config in `playwright.config.ts`

## ![alt text](image-2.png)

## 🚀 Running the Test HTML

To run the test HTML:

1. **Install the Live Server extension** in VS Code.
2. Open the file: `html/index.html`
3. Right-click anywhere in the file.
4. Select **"Open with Live Server"**.

💡 This will automatically open the page in your default browser

---

### 🖼️ Example: Opening with Live Server

![alt text](image-1.png)

> If you don’t see this option, make sure the **Live Server** extension is properly installed and enabled in VS Code.

---

### Using `url`

```json
{ "url": "https..." } // absolute url

{ "url": "/products" } // baseUrl (playwright.config.ts) + /products

{  } // to continue automation on the current page, do not use the key url

````

---

### 🛠️ Actions Reference → Playwright

| Action                     | JSON (2 examples)                                                                                                                                                                                 | Playwright reference (2 examples)                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                     | `{ "loc": "#user", "type": "John" }`<br>`{ "loc": "input[name='email']", "type": "jam@example.com" }`                                                                                             | `await page.locator('#user').fill('John')`<br>`await page.locator('input[name="email"]').fill('jam@example.com')`                                                                                                                |
| `typeSlow`                 | `{ "loc": "#msg", "typeSlow": "Hello" }`<br>`{ "loc": ".editor textarea", "typeSlow": "Long text…" }`                                                                                             | `await loc.fill(''); await loc.pressSequentially('Hello', { delay: 300 })`<br>`await page.locator('.editor textarea').pressSequentially('Long text…', { delay: 300 })`                                                           |
| `click`                    | `{ "click": "button > Save" }`<br>`{ "click": "a:has-text('Docs')" }`                                                                                                                             | `await page.locator('button', { hasText: 'Save' }).click()`<br>`await page.locator("a:has-text('Docs')").click()`                                                                                                                |
| `click: "{type}"`          | `{ "loc": "#q", "type": "Playwright" }, { "click": "{type}" }`<br>`{ "type": "Neo", "loc": "input[name='who']" }, { "click": "{type}" }`                                                          | `await page.locator('#q').fill('Playwright'); await page.getByText('Playwright', { exact: true }).click()`<br>`await page.locator("input[name='who']").fill('Neo'); await page.getByText('Neo', { exact: true }).click()`        |
| `click: "<prefix> {type}"` | `{ "type": "Item 1", "loc": "#search" }, { "click": "ul.results {type}" }`<br>`{ "type": "Settings", "loc": "#menu-filter" }, { "click": "nav {type}" }`                                          | `await page.locator('#search').fill('Item 1'); await page.locator('ul.results *:has-text("Item 1")').click()`<br>`await page.locator('#menu-filter').fill('Settings'); await page.locator('nav *:has-text("Settings")').click()` |
| `hover`                    | `{ "hover": ".menu" }`<br>`{ "hover": "button:has-text('Preview')" }`                                                                                                                             | `await page.locator('.menu').hover()`<br>`await page.locator("button:has-text('Preview')").hover()`                                                                                                                              |
| `press`                    | `{ "press": "Enter", "loc": "#q" }`<br>`{ "press": "Escape" }`                                                                                                                                    | `await page.locator('#q').press('Enter')`<br>`await page.keyboard.press('Escape')`                                                                                                                                               |
| `check` / `uncheck`        | `{ "check": "#agree" }`<br>`{ "uncheck": ".todo-list li:nth-child(1) .toggle" }`                                                                                                                  | `await page.locator('#agree').check()`<br>`await page.locator('.todo-list li:nth-child(1) .toggle').uncheck()`                                                                                                                   |
| `select`                   | `{ "select": { "label": "Brazil" }, "loc": "#country" }`<br>`{ "select": { "value": "us" }, "loc": "select#country" }`                                                                            | `await page.locator('#country').selectOption({ label: 'Brazil' })`<br>`await page.locator('select#country').selectOption({ value: 'us' })`                                                                                       |
| `upload`                   | `{ "upload": { "loc": "input[type=file]", "files": ["fixtures/a.png"] } }`<br>`{ "upload": { "loc": "input[type=file]", "files": ["fixtures/a.png","fixtures/b.png"] } }`                         | `await page.locator('input[type=file]').setInputFiles('fixtures/a.png')`<br>`await page.locator('input[type=file]').setInputFiles(['fixtures/a.png','fixtures/b.png'])`                                                          |
| `exist`                    | `{ "exist": "#close-popup", "click": "#close-popup" }`<br>`{ "exist": "Promotion", "click": "Fechar" }`                                                                                           | Soft-check element then run remaining keys if found<br>Soft-check text then click close                                                                                                                                          |
| `getText`                  | `{ "getText": "h1" }`<br>`{ "getText": ".card .title" }`                                                                                                                                          | `const t = await page.locator('h1').textContent()`<br>`const t = await page.locator('.card .title').textContent()`                                                                                                               |
| `expectText`               | `{ "expectText": { "contains": "Welcome" } }`<br>`{ "loc": ".toast", "expectText": { "equals": "Saved!" } }`                                                                                      | `await expect(page.locator('body')).toContainText('Welcome')`<br>`await expect(page.locator('.toast')).toHaveText('Saved!')`                                                                                                     |
| `expectVisible`            | `{ "expectVisible": "#toast" }`<br>`{ "loc": ".modal", "expectVisible": { "timeout": 2000 } }`                                                                                                    | `await expect(page.locator('#toast')).toBeVisible()`<br>`await expect(page.locator('.modal')).toBeVisible({ timeout: 2000 })`                                                                                                    |
| `expectUrl`                | `{ "expectUrl": { "contains": "/home" } }`<br>`{ "expectUrl": { "equals": "https://app.test/dashboard" } }`                                                                                       | `await expect(page).toHaveURL(/\/home/)`<br>`await expect(page).toHaveURL('https://app.test/dashboard')`                                                                                                                         |
| `waitRequest`              | `{ "waitRequest": { "url": "/api/save", "status": 200 } }`<br>`{ "waitRequest": { "url": "**/users", "method": "POST" } }`                                                                        | `await handleWaitRequest(page, { url:'/api/save', status:200 })`<br>`await handleWaitRequest(page, { url:'**/users', method:'POST' })`                                                                                           |
| `wait`                     | `{ "wait": 500 }`<br>`{ "wait": 1500 }`                                                                                                                                                           | `await page.waitForTimeout(500)`<br>`await page.waitForTimeout(1500)`                                                                                                                                                            |
| `screenshot`               | `{ "screenshot": { "path": "shots/home.png", "fullPage": true } }`<br>`{ "loc": ".card", "screenshot": { "path": "shots/card.png" } }`                                                            | `await page.screenshot({ path:'shots/home.png', fullPage:true })`<br>`await page.locator('.card').screenshot({ path:'shots/card.png' })`                                                                                         |
| `forEach`                  | `{ "forEach": { "items": ".product-card", "actions": [ { "click": "button:has-text('Details')" } ] } }`<br>`{ "forEach": { "items": "article.post", "actions": [ { "getText": "h2.title" } ] } }` | Itera itens e executa ações aninhadas                                                                                                                                                                                            |
| `scrollTo`                 | `"bottom"`<br>`{ "to": "h2:has-text('Installation')" }`                                                                                                                                           | `await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }))`<br>`await page.locator("h2:has-text('Installation')").scrollIntoViewIfNeeded()`                                                                |
| `expectValue`              | `{ "expectValue": { "loc": "input[name='email']", "equals": "jam@example.com" } }`<br>`{ "expectValue": { "loc": "#q", "contains": "runner" } }`                                                  | `await expect(page.locator("input[name='email']")).toHaveValue("jam@example.com")`<br>`expect(await page.locator('#q').inputValue()).toContain('runner')`                                                                        |
| `route`                    | `{ "route": { "url": "**/api/users", "mock": { "status": 200, "json": [{ "id":1,"name":"Neo"}] } } }`<br>`{ "route": { "unroute": "**/api/users" } }`                                             | `await page.route("**/api/users", r => r.fulfill({ status:200, headers:{'content-type':'application/json'}, body: JSON.stringify([{id:1,name:'Neo'}]) }))`<br>`await page.unroute("**/api/users")`                               |
| `run`                      | `{ "run": "buildUser" }`<br>`{ "run": "nowISO" }`                                                                                                                                                 | Executa `RunPluginFunctions.buildUser()` / `nowISO()`                                                                                                                                                                            |

### ✅ Complete context example (realistic)

```json
{
  "describe": {
    "text": "Context + Indexing",
    "url": "https:....",
    "users": {
      "title": "Open the 3rd user's details from nested nav",
      "context": {
        "iframe": ["iframe#shell", "iframe#app"], // page.frameLocator(...).frameLocator(...)
        "root": "nav#sidebar", // scope.locator("nav#sidebar")
        "parent": "Management", // scope.getByText("Management", { exact: true })
        "index": 2, // climb 2 times: locator("..").locator("..")
        "within": "ul.menu", // restrict to "ul.menu"
        "nth": 2 // use 3rd match by default inside this context
      },
      "actions": [
        { "click": "li > Users" }, // -> scoped + nth(2)
        { "expectVisible": "h1 > Users" },
        { "click": "tr:nth-child(3) a > Details" }, // specific selector beats nth default
        { "expectUrl": { "contains": "/users/" } }
      ]
    }
  }
}
```

**Playwright mapping** (conceptual):

- `scope = page.frameLocator('#shell').frameLocator('#app').locator('nav#sidebar');`

- `parent = scope.getByText('Management', { exact: true });`

- `climbed = parent.locator('..').locator('..');`

`scope = climbed.locator('ul.menu');`

- `locator = scope.locator('li', { hasText: 'Users' }).nth(2);`

> **Note**: Setting `nth/first/last` at **action-level** overrides the **case-level** `context` indexing for that action.

---

## 📌 Case metadata

- `title`: string — test name
- `url`: string — if relative, resolved against Playwright `baseURL` (or `opts.baseURLOverride`)
- `actions`: array of action objects (see below)

At `describe` level:

- `text`: string — `describe` title
- `url`: default URL for cases
- `before`: `string | string[]` — **one or more JSON files** executed **before each case** of this file (child JSONs' own `before` is ignored by design)

---

## 🧰 Actions (full list)

For each action below you’ll see: **JSON shape**, **Playwright mapping**, and **2 complete examples**.

### 1) `click`

- **Shape**: `{ "click": string }`
- **Map**: `locator(target).click()`

```json
{ "click": "button#submit" }
```

```json
{ "click": "a > Continue" }
```

### 2) `type`

- **Shape**: `{ "loc"?: string, "click"?: string (selector), "type": string }`
- **Map**: `locator(target).fill(text)`

```json
{ "loc": "#email", "type": "jam@example.com" }
```

```json
{ "click": "#search", "type": "Playwright" }
```

### 3) `typeSlow`

- **Map**: `locator(target).pressSequentially(text, { delay: 300 })`

```json
{ "loc": "#query", "typeSlow": "slow typing..." }
```

```json
{ "click": "#search", "typeSlow": "faker.internet.username()" }
```

### 4) `hover`

- **Map**: `locator(target).hover()`

```json
{ "hover": ".menu .item.settings" }
```

```json
{ "within": "nav#top", "hover": "a > Admin" }
```

### 5) `press`

- **Shape**: `{ "press": "Key", "loc"?: string }`
- **Map**: `page.keyboard.press(key)` or `locator(target).press(key)`

```json
{ "press": "Escape" }
```

```json
{ "loc": "#search", "press": "Enter" }
```

### 6) `check` / 7) `uncheck`

- **Shape**: `"string" | { "loc": string } | true` (if omitted, falls back to `loc`/`click` on action/case)
- **Map**: `locator(target).check()` / `.uncheck()`

```json
{ "check": { "loc": "#terms" } }

{ "check": "#terms" }

```

```json
{ "uncheck": "#newsletter" }
```

### 8) `select`

- **Shape**: `{ "select": { "value"|"label"|"index": string|string[]|number }, "loc"?: string, "click"?: string }`
- **Map**: `locator(target).selectOption(...)`

```json
{ "select": { "label": "Pernambuco" }, "loc": "#state" }
```

```json
{ "loc": "#multi", "select": { "value": ["A", "C"] } }
```

### 9) `upload`

- **Shape**: `{ "upload": string | string[], "loc"?: string, "click"?: string }`
- **Map**: `locator(target).setInputFiles(files)`

```json
{ "loc": "#file", "upload": "fixtures/id.pdf" }
```

```json
{ "loc": "#docs", "upload": ["a.pdf", "b.pdf"] }
```

### 10) `expectText`

- **Shape**: `{ "expectText": { "equals"?: any, "contains"?: any, "timeout"?: number }, "loc"?: string, "click"?: string }`
- **Map**: `expect(locator).toHaveText(v)` / `expect(locator).toContainText(v)`; if no target, assert on page text

```json
{ "loc": "h1", "expectText": { "equals": "Dashboard" } }
```

```json
{ "expectText": { "contains": "Welcome back" } }
```

### 11) `expectVisible`

- **Shape**: `"string"` or `{ "expectVisible": { "timeout"?: number }, "loc"?: string }`
- **Map**: `expect(locator).toBeVisible({ timeout })`

```json
{ "expectVisible": "#profile" }
```

```json
{ "loc": "button#pay", "expectVisible": { "timeout": 5000 } }
```

### 12) `expectValue`

- **Shape**: `{ "expectValue": { "loc": string, "equals"?: any, "contains"?: any, "timeout"?: number } }`
- **Map**: `expect(locator).toHaveValue(v)` or read value and `toContain`

```json
{ "expectValue": { "loc": "#email", "equals": "jam@example.com" } }
```

```json
{ "expectValue": { "loc": "#search", "contains": "jam" } }
```

### 13) `expectUrl`

- **Shape**: `{ "expectUrl": { "equals"?: string, "contains"?: string, "timeout"?: number } }`
- **Map**: `expect(page).toHaveURL(url)` / `expect(page).toHaveURL(new RegExp(escapeRegex(contains)))`

```json
{ "expectUrl": { "equals": "https://mysite.com/checkout" } }
```

```json
{ "expectUrl": { "contains": "/checkout" } }
```

### 14) `exist` (gate)

- **Shape**: `{ "exist": string }`
- **Effect**: if target **does not exist**, the **current action is skipped** (no throw)
- **Map**: `await locator.count() > 0`

```json
{ "exist": "#toast-success" }
```

```json
{ "exist": "Operation completed" }
```

### 15) `forEach`

- **Shape**: `{ "forEach": { "items": string, "actions": Action[] } }`
- **Map**: iterate `locator(items)`, `count()`, then for each `nth(i)` run sub-actions with `item` as **base scope**.

**Complete Example A — iterate rows and open modal**

```json
{
  "describe": {
    "text": "forEach demo",
    "url": "/produts",
    "rows": {
      "title": "Open each row details and close",
      "actions": [
        {
          "forEach": {
            "items": "table tbody tr",
            "actions": [
              { "getText": "td:nth-child(2)" },
              { "click": "button > Open" },
              { "expectVisible": ".modal" },
              { "screenshot": { "path": "shots/modal-row.png" } },
              { "press": "Escape" }
            ]
          }
        }
      ]
    }
  }
}
```

**Complete Example B — with context inside each item**

```json
{
  "describe": {
    "text": "forEach + context",
    "url": "/products",
    "cards": {
      "title": "Click inner CTA per card",
      "actions": [
        {
          "forEach": {
            "items": ".card",
            "actions": [
              { "within": ".footer" },
              { "click": "button > CTA" },
              { "expectText": { "contains": "Done" } }
            ]
          }
        }
      ]
    }
  }
}
```

> **Tip (recommended upgrade)**: Expose loop index as `__index` in `vars` so you can use `"shots/card-{__index}.png"`.

### 16) `getText`

- **Shape**: `{ "getText": string }`
- **Effect**: logs and stores the text into an internal memo (`lastGetText`); _(recommended upgrade: copy into `vars.lastGetText` to enable `{lastGetText}` tokens)_

```json
{ "getText": "h2 > Order Summary" }
```

```json
{ "getText": ".total" }
```

### 17) `route`

- **Subkeys**: `block`, `unroute`, `url + mock`
- **Map**:
  - `block`: `page.route(pattern, r => r.abort())`
  - `unroute`: `page.unroute(pattern)`
  - `url+mock`: `page.route(url, r => r.fulfill({ status, headers, body|json }))`

```json
{ "route": { "block": ["**/analytics/**", "**/maps/**"] } }
```

```json
{
  "route": {
    "url": "**/api/profile",
    "mock": { "status": 200, "json": { "name": "Jam", "role": "QA" } }
  }
}
```

### 18) `waitResponse`

- **Shape**: `{ "waitResponse": { "url": string(glob), "status"?: number, "bodyContains"?: string, "timeout"?: number } }`
- **Map**: `page.waitForResponse(fn, { timeout })` with a glob→RegExp filter; then optional body contains check

```json
{ "waitResponse": { "url": "**/api/payments/**", "status": 200 } }
```

```json
{
  "waitResponse": {
    "url": "**/api/orders/**",
    "status": 201,
    "bodyContains": "\"state\":\"created\""
  }
}
```

### 19) `waitRequest`

- **Shape**: `{ "waitRequest": { ... } }` (delegated to `handleWaitRequest(page, config)` in your code)
- **Map**: implementation-specific — typically `page.waitForRequest(...)`

```json
{ "waitRequest": { "url": "**/api/search**" } }
```

```json
{ "waitRequest": { "method": "POST", "url": "**/api/login" } }
```

### 20) `wait`

- **Shape**: `{ "wait": number(ms) }`
- **Map**: `page.waitForTimeout(ms)`

```json
{ "wait": 800 }
```

```json
{ "wait": 2500 }
```

### 21) `scrollTo`

- **Shape**: `"top" | "bottom"` or `{ "x"?: number, "y"?: number, "to"?: string, "behavior"?: "auto"|"smooth" }`
- **Map**: `page.evaluate(window.scrollTo(...))` or `locator(target).scrollIntoViewIfNeeded()`

```json
{ "scrollTo": "bottom" }
```

```json
{ "scrollTo": { "to": "h2 > Details" } }
```

### 22) `screenshot`

- **Shape**: `{ "screenshot": { "path": string, "fullPage"?: boolean }, "loc"?: string }`
- **Map**: `page.screenshot()` or `locator(target).screenshot()`

```json
{ "screenshot": { "path": "shots/home.png", "fullPage": true } }
```

```json
{ "loc": ".invoice", "screenshot": { "path": "shots/invoice.png" } }
```

### 23) `run`

- **Shape**: `{ "run": "methodName" }` — calls a method on `RunPluginFunctions`
- **Effect**: return value stored in `vars.resultFunc` (awaited if Promise)

```json
{ "run": "genCPF", "as": "cpf" }
// {type: "{cpf}"}
```

```json
{ "run": "nowISO" }
```

> Create new functions in `help/plugin-func.ts`:

```jsonc
{
  "describe": {
    "text": "Case-level run",
    "url": "http://127.0.0.1:5500/html/index.html",
    "fill-name-with-userEmail": {
      "title": "Case run → type",
      "run": "userEmail",
      "actions": [
        { "click": "Typing & Keys" },
        { "loc": "#name", "type": "{resultFunc}" }
      ]
    },

    "fill-using-alias": {
      "title": "Case run with alias",
      "run": "hello",
      "as": "user",
      "actions": [
        { "click": "Typing & Keys" },
        { "loc": "#name", "typeSlow": "{user.greeting}" },
        { "loc": "#email", "type": "{resultFunc.email}" }
      ]
    }
  }
}
```

```ts
export class RunPluginFunctions {
  hello() {
    return { greeting: "hello", email: "qa@example.com" };
  }
  userEmail() {
    return "user_" + Date.now() + "@example.com";
  }
}
```

```jsonc
{
  "describe": {
    "text": "Action-level run (inline)",
    "url": "http://127.0.0.1:5500/html/index.html",
    "inline-run-and-type": {
      "title": "run + type no mesmo action",
      "actions": [
        { "click": "Typing & Keys" },
        { "run": "userEmail", "as": "user", "loc": "#email", "type": "{user}" }
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "Async run",
    "url": "http://127.0.0.1:5500/html/index.html",
    "async-then-use": {
      "title": "await run, depois usar campos",
      "actions": [
        { "run": "fetchProfile", "as": "profile" },
        { "click": "Typing & Keys" },
        { "loc": "#name", "type": "{profile.name}" },
        { "loc": "#email", "type": "{profile.email}" }
      ]
    }
  }
}
```

```ts
export class RunPluginFunctions {
  async fetchProfile() {
    // simulação de IO
    await new Promise((r) => setTimeout(r, 300));
    return { name: "Ada Lovelace", email: "ada@example.com" };
  }
}
```

```jsonc
{
  "describe": {
    "text": "Simple return types",
    "url": "http://127.0.0.1:5500/html/index.html",
    "number-into-input": {
      "title": "Número → string no input",
      "actions": [
        { "run": "randomCode" },
        { "click": "Typing & Keys" },
        { "loc": "#name", "type": "{resultFunc}" }
      ]
    },

    "boolean-into-branch": {
      "title": "Booleano e expectText",
      "actions": [
        { "run": "featureFlag", "as": "flag" },
        { "click": "Clicks & Visibility" },
        { "click": "Make toast visible" },
        { "expectText": { "contains": "OK" }, "loc": "#selector-result" }
      ]
    }
  }
}
```

```ts
export class RunPluginFunctions {
  randomCode() {
    return Math.floor(Math.random() * 10000);
  } // number
  featureFlag() {
    return true;
  } // boolean (vira "true"/"false" quando interpolado)
}
```

```jsonc
{
  "describe": {
    "text": "Object shape",
    "url": "http://127.0.0.1:5500/html/index.html",
    "deep-object": {
      "title": "Usar caminhos do objeto",
      "actions": [
        { "run": "buildUser", "as": "user" },
        { "click": "Typing & Keys" },
        { "loc": "#name", "type": "{user.profile.fullName}" },
        { "loc": "#email", "type": "{user.contacts.primary}" }
      ]
    }
  }
}
```

```ts
export class RunPluginFunctions {
  buildUser() {
    return {
      profile: { fullName: "Grace Hopper" },
      contacts: {
        primary: "grace@navy.mil",
        backup: "grace.hopper@example.com",
      },
    };
  }
}
```

`example in JSON Fixtures/plugin-examplo-auto.json`

---

## 🧠 Token interpolation (recap)

You can place `{token}` in most string fields, including nested ones (`expect*`, `select`, `screenshot.path`, etc.). Path tokens like `{user.name}` are supported; avoid hyphenated keys inside paths (use `user.fullName` not `user.full-name`).

Specials available during a test:

- `{resultFunc}` — last return of a `"run"` action.
- _(Recommended upgrade)_ `{lastTypedText}`, `{lastGetText}`, `{__index}` — if you expose them in `vars`.

**Examples**:

```json
{ "run": "genCPF" },
{ "loc": "#cpf", "type": "{resultFunc}" }
```

```json
{ "run": "genCPF", "as":"user_cpf" },
{ "loc": "#cpf", "type": "{user_cpf}" }
```

```json
{ "screenshot": { "path": "shots/card-{__index}.png" } }
```

---

## 🧪 Complete example: forEach + nth + first/last override

```json
{
  "describe": {
    "text": "Catalog",
    "url": "/products",
    "open-cards": {
      "title": "Open specific cards with indexing",
      "context": {
        "root": ".catalog",
        "within": ".cards",
        "nth": 0
      },
      "actions": [
        // Default index is nth(0) due to context
        { "click": ".card > h3" },

        // Override index at action-level: last card CTA
        { "last": true, "click": ".card button > Details" },

        // Explicit nth at action-level: 5th card
        { "nth": 4, "click": ".card > h3" },

        // first at action-level
        { "first": true, "click": ".card > h3" }
      ]
    },

    "iterate-cards": {
      "title": "Iterate cards and open+close modal",
      "actions": [
        {
          "forEach": {
            "items": ".card",
            "actions": [
              { "within": ".footer" },
              { "click": "button > Open" },
              { "expectVisible": ".modal" },
              { "press": "Escape" }
            ]
          }
        }
      ]
    }
  }
}
```

## Using faker in type or typeSlow

# Using `faker` with `type` / `typeSlow`

The plugin’s `type` and `typeSlow` fields accept **any Faker v10 API call exactly as documented**: **[https://fakerjs.dev](https://fakerjs.dev/api/)**

## Supported forms (real examples)

- No args

  - `faker.internet.email()`
  - `faker.person.fullName()`
  - `faker.location.streetAddress()`

- Single number arg

  - `faker.string.alphanumeric(12)`
  - `faker.number.int(9999)` <!-- shorthand max -->
  - `faker.number.float(2)` <!-- precision shorthand -->

- Options object

  - `faker.number.int({ min: 100, max: 999 })`
  - `faker.finance.amount({ min: 10, max: 5000, dec: 2 })`
  - `faker.date.past({ years: 1 })`
  - `faker.date.soon({ days: 3 })`

- Array (or multiple) args

  - `faker.string.fromCharacters(['A','B','C'], 8)`
  - `faker.helpers.arrayElement(['BR','US','AR'])`
  - `faker.phone.number(['+55 11 ####-####', '+55 21 ####-####'])`

- Mixed / specific formatting
  - `faker.internet.userName('john_doe')`
  - `faker.date.between({ from: '2020-01-01T00:00:00.000Z', to: '2030-01-01T00:00:00.000Z' })`
  - `faker.phone.number('(+55 ##) 9####-####')`
  - `faker.commerce.price({ min: 9.9, max: 199.9 })`

For the complete list of modules, methods, and arguments, see **https://fakerjs.dev**.

---
