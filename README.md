# 🎭 playwright-plugin-web-from-json

[![Npm package weekly downloads](https://badgen.net/npm/dw/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

[![Npm package weekly downloads](https://badgen.net/npm/dm/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

[![Npm package weekly downloads](https://badgen.net/npm/dy/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

[![Npm package weekly downloads](https://badgen.net/npm/dt/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

[![Npm package weekly downloads](https://badgen.net/npm/dt/playwright)](https://npmjs.com/package/playwright)
[![Npm package weekly downloads](https://badgen.net/npm/dt/node)](https://npmjs.com/package/node)

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

In your consumer project:

```bash
npm init playwright
npm i playwright-plugin-web-from-json
npx playwright install
```

After install you should see logs similar to:

```
postinstall: consumer root detected -> /your/project
✓ Created: Fixtures/example.json
✓ Created: tests/json-plugin.spec.ts
🎯 Setup completed.
```

> Don’t want auto-scaffold? Fork this package and remove the `postinstall` script.

## 🔧 Configuration in Playwright

```json
  use: {
   headless: false,
   trace: "on-first-retry",
 },

 /* Configure projects for major browsers */
 projects: [
   {
     name: "chromium",
     use: {
      channel: "chrome", // MacOs
      baseUrl:"url base optional"
       },
   },
```

---

## ⚡ Run locally with VS Code + Live Server

> Perfect for trying the sample `index.html` in the `html/` folder and running your Playwright specs against it.

### 1) Install the “Live Server” extension in VS Code

- Open VS Code → Extensions panel → search **“Live Server (Ritwick Dey)”** → Install.

### 2) Start a local server from your project

- In the Explorer, **right-click the `html/` folder** at your project root and choose **“Open with Live Server”** (or open an `index.html` file and right-click → **Open with Live Server**).
- You can also use the Command Palette: **“Live Server: Open With Live Server”**.

> Tip: Live Server will open a URL like `http://127.0.0.1:5500/…`. Keep that tab running.

### 3) Run your Playwright tests 🚀

From your project root, run:

```bash
npx playwright test
```

---

## 🚀 Quick Start

**`tests/json-plugin.spec.ts`**

```ts
import { test } from "@playwright/test";
import { generateTestsFromJson } from "playwright-plugin-web-from-json";
import path from "path";

// Calls the plugin and generates describe()/test() from JSON files
generateTestsFromJson(
  {
    dir: path.resolve(process.cwd(), "Fixtures"), // JSON folder
    // baseURLOverride: "https://your-app.example" // force baseURL if needed
  },
  test // reference to Playwright's test
);
```

**`Fixtures/example.json`**

```jsonc
{
  "describe": {
    "text": "Example JSON test",
    "simple-case": {
      "title": "Visit Playwright site",
      "url": "https://playwright.dev", // ref await page.goto('https://playwright.dev')
      "actions": [
        { "click": "Get started" }, // ref await page.getByText('Get started', { exact: true }).first().click()
        { "click": "a > Writing tests" }, // ref await page.locator('a', { hasText: 'Writing tests' }).first().click()
        { "wait": 2000 } // ref await page.waitForTimeout(2000)
      ]
    }
  }
}
```

Run tests:

```bash
npx playwright test
```

---

## 🧠 How It Works

- Recursively scans `dir` (`Fixtures/` by default) for `.json` files in **stable alphanumeric order**.
- Each JSON file becomes a `describe.serial(...)` suite.
- One `browser.newContext()` / `page` per suite (`beforeAll/afterAll`).
- URL handling:
  - Absolute `url` → used as is. _(ref `await page.goto(absUrl)`)_
  - Relative `url` → requires Playwright `baseURL` or `baseURLOverride`. _(ref `await page.goto(new URL(rel, baseURL).toString())`)_
  - **No `url`** → the runner **stays on the current page**.

---

## 🧩 JSON Schema

```jsonc
{
  "describe": {
    "text": "Suite name (optional)",
    "before": "./path.json OR [\"./a.json\", \"./b.json\"] (optional)",
    "<case-key>": {
      "title": "Test title (optional)",
      "url": "/route-or-https://... (optional)", // ref await page.goto(url)
      "context": {
        "nth": 0, // ref locator.nth(0)
        "first": false, // ref locator.first()
        "last": false, // ref locator.last()
        "within": ".container", // ref root = page.locator('.container')
        "frame": "iframe#app" // ref root = page.frameLocator('iframe#app')
      },
      "actions": [
        /* see below */
      ]
    }
  }
}
```

### 🪢 `before` chaining

- Accepts a **string** or an **array of strings**.
- Cases from each `before` are **prepended** in order (left → right).
- Recursive with cycle detection.

---

## 🛠 Supported Actions + Examples

Mix freely under `actions: []`. Each example shows the **plugin JSON** and the **Playwright API** it maps to.

### 🖱️ `click`

```jsonc
{ "click": "#save" }                                              // ref await page.locator('#save').first().click()
{ "click": "Login" }                                              // ref await page.getByText('Login', { exact: true }).first().click()
{ "click": "a > Writing tests" }                                  // ref await page.locator('a', { hasText: 'Writing tests' }).first().click()
```

### ⌨️ `type` and `typeSlow`

```jsonc
{ "loc": "#email", "type": "faker.internet.email()" }             // ref await page.locator('#email').fill(faker.internet.email())
{ "loc": "#name",  "typeSlow": "faker.person.fullName()" }        // ref await page.locator('#name').pressSequentially('<name>', { delay: 300 })
{ "loc": "#start", "type": "date(today)" }                        // ref await page.locator('#start').fill('<formatted date>')
```

### 🎯 `expectVisible` (short & object)

```jsonc
{ "expectVisible": "#toast" }                                     // ref await expect(page.locator('#toast')).toBeVisible()
{ "expectVisible": "h2 > Settings" }                              // ref await expect(page.locator('h2', { hasText: 'Settings' }).first()).toBeVisible()
{ "expectVisible": { "timeout": 5000 }, "loc": "#toast" }         // ref await expect(page.locator('#toast')).toBeVisible({ timeout: 5000 })
```

### ✅ `expectText` (with and without `loc`)

```jsonc
{ "expectText": { "equals": "Welcome!" }, "loc": "h1" }           // ref await expect(page.locator('h1')).toHaveText('Welcome!')
{ "expectText": { "contains": "orders" }, "loc": ".stats" }       // ref await expect(page.locator('.stats')).toContainText('orders')
{ "expectText": { "contains": "orders" } }                        // ref await expect(page.getByText(/orders/)).toBeVisible()
```

### 👀 `expectUrl`

```jsonc
{ "expectUrl": { "equals": "https://app.example.com/dashboard" } } // ref await expect(page).toHaveURL('https://app.example.com/dashboard')
{ "expectUrl": { "contains": "#/dashboard" } }                      // ref await expect(page).toHaveURL(/#\/dashboard/)
```

### 🌐 `waitRequest` (network response)

```jsonc
{ "waitRequest": { "urlIncludes": "/api/orders", "status": 200, "timeout": 50000 } } // ref await page.waitForResponse(r => r.url().includes('/api/orders') && r.status() === 200, { timeout: 50000 })
{ "waitRequest": { "urlIncludes": ["/api/orders", "/api/summary"] } }               // ref await page.waitForResponse(r => ['/api/orders','/api/summary'].some(s => r.url().includes(s)))
{ "waitRequest": { "urlIncludes": "/api/checkout", "status": [200, 204] } }         // ref await page.waitForResponse(r => r.url().includes('/api/checkout') && [200,204].includes(r.status()))
```

### 🐭 `hover`

```jsonc
{ "hover": "a > Products" }                                        // ref await page.locator('a', { hasText: 'Products' }).first().hover()
{ "hover": "#menu" }                                               // ref await page.locator('#menu').first().hover()
```

### 🎹 `press`

```jsonc
{ "press": "Enter", "loc": "#input" }                              // ref await page.locator('#input').press('Enter')
{ "press": "Control+A" }                                           // ref await page.keyboard.press('Control+A')
```

### ☑️ `check` / `uncheck` (boolean-free)

```jsonc
{ "check": "#terms" }                                              // ref await page.locator('#terms').check()
{ "check": "input[name='plan'][value='pro']" }                     // ref await page.locator("input[name='plan'][value='pro']").check()
{ "uncheck": "#terms" }                                            // ref await page.locator('#terms').uncheck()
{ "check": { "loc": "#terms" } }                                   // ref await page.locator('#terms').check()
```

### 🔽 `select`

```jsonc
{ "select": { "label": "Brazil" }, "loc": "#country" }             // ref await page.locator('#country').selectOption({ label: 'Brazil' })
{ "select": { "value": "BR" }, "loc": "#country" }                 // ref await page.locator('#country').selectOption('BR')
{ "select": { "index": 3 }, "loc": "#country" }                    // ref await page.locator('#country').selectOption({ index: 3 })
{ "select": ["BR", "US"], "loc": "#multi-country" }                // ref await page.locator('#multi-country').selectOption(['BR','US'])
```

### 📤 `upload`

```jsonc
{ "upload": "tests/fixtures/avatar.png", "loc": "input[type=file]" } // ref await page.locator('input[type=file]').setInputFiles('tests/fixtures/avatar.png')
```

### ⏱️ `wait`

```jsonc
{ "wait": 1000 } // ref await page.waitForTimeout(1000)
```

### 📸 `screenshot`

```jsonc
{ "screenshot": { "path": "screens/page.png", "fullPage": true } } // ref await page.screenshot({ path: 'screens/page.png', fullPage: true })
{ "screenshot": { "path": "screens/card.png" }, "loc": ".card" }   // ref await page.locator('.card').first().screenshot({ path: 'screens/card.png' })
```

---

## 🎯 Disambiguation, Scoping & Iframes

Use these fields to precisely target elements when there are multiple matches or when your app runs inside an iframe:

- **`nth` / `first` / `last`** – pick which match to use (0-based index for `nth`).  
  _Mapping:_ `locator.nth(i)` / `locator.first()` / `locator.last()`
- **`within`** – scope all lookups to a container.  
  _Mapping:_ `root = page.locator('<within>')`, then `root.locator(...)`
- **`frame`** – run the action inside an iframe (single selector or an array for nested iframes).  
  _Mapping:_ `root = page.frameLocator('<frame>')` (chain for arrays), then `root.locator(...)`

You can set context **per action** or **per case** via `context` (per-action overrides per-case).

---

## 🎯 Targets & Locator Rules

- Actions that need an element (typing, select, upload, target assertions) require:
  1. `loc` (selector), or
  2. `click` that is a **selector** (not pure text).
- For text clicks:
  - If the string contains `>`, **tag > text** is applied.  
    _Mapping:_ `page.locator('<tag>', { hasText: '<text>' }).first().click()`
  - Otherwise `getByText(text, { exact: true }).first()` is used.  
    _Mapping:_ `page.getByText(text, { exact: true }).first().click()`

---

## 🧪 Dynamic Values: `faker` and `date(...)`

### 🎲 `faker`

```jsonc
{ "loc": "#email", "type": "faker.internet.email()" }              // ref await page.locator('#email').fill(faker.internet.email())
{ "loc": "#name",  "type": "faker.person.fullName()" }             // ref await page.locator('#name').fill(faker.person.fullName())
```

> The plugin loads Faker via dynamic `import()` for CJS/ESM compatibility.

### 📅 `date(...)`

Supported patterns include `date(today)`, `date(today±N)`, `date(YYYY-MM-DD)`, and `date(today, "dd/MM/yyyy")`.

```jsonc
{ "loc": "#start", "type": "date(today)" }                         // ref await page.locator('#start').fill('<today as string>')
{ "loc": "#due",   "type": "date(today+7, \"dd/MM/yyyy\")" }       // ref await page.locator('#due').fill('15/10/2025')
```

---

## 🧷 Advanced Configuration

```ts
import { test } from "@playwright/test";
import { generateTestsFromJson } from "playwright-plugin-web-from-json";

// Generate from a custom folder and force baseURL
generateTestsFromJson(
  { dir: "Fixtures", baseURLOverride: "https://your-app.example" },
  test
); // ref generate describe()/test() from JSON
```

Tips:

- Prefix files with numbers (`00_`, `01_`, …) to control order.
- Reuse common steps with `"before": ["./common.json", "./seed.json"]`.

---

## 🩺 Troubleshooting

- **require() of ES Module @faker-js/faker** → The plugin uses dynamic `import()` for Faker.
- **Strict mode violation when clicking by text** → Prefer `"tag > text"` or role-based locators.
- **“No tests found”** → Usually caused by a prior error (ESM/CJS mismatch, invalid selector).
- **Relative URL without baseURL** → Provide a `baseURL` or pass `baseURLOverride`.

---

## 🧰 Extensibility

The runner uses a per-action dispatcher (e.g., `handleClick`, `handleType`, `handleSelect`, …). To add new actions:

- Implement a handler with clear target validation and friendly error messages.
- Map it in the main actions loop.

Ideas: `expectTitle`, `assertCount`, route stubbing, global config (`jsonrunner.config.*`).

---

## 🧾 Full Examples

### 1) Two cases in the same **describe**

```jsonc
{
  "describe": {
    "text": "Auth + follow-up actions",
    "login": {
      "title": "User logs in",
      "url": "/login", // ref await page.goto('/login')
      "actions": [
        { "loc": "#email", "type": "faker.internet.email()" }, // ref await page.locator('#email').fill(...)
        { "loc": "#password", "type": "SuperSecret123" }, // ref await page.locator('#password').fill('SuperSecret123')
        { "click": "button > Sign in" }, // ref await page.locator('button', { hasText: 'Sign in' }).first().click()
        { "expectUrl": { "contains": "/dashboard" } } // ref await expect(page).toHaveURL(/\/dashboard/)
      ]
    },
    "follow-up-without-url": {
      "title": "Keeps on the same page (no url)",
      "actions": [
        { "click": "a > Settings" }, // ref await page.locator('a', { hasText: 'Settings' }).first().click()
        { "expectVisible": "h1 > Settings" } // ref await expect(page.locator('h1', { hasText: 'Settings' }).first()).toBeVisible()
      ]
    }
  }
}
```

### 2) Clicks & waits

```jsonc
{
  "describe": {
    "text": "Clicks & waits",
    "flow": {
      "url": "https://playwright.dev", // ref await page.goto('https://playwright.dev')
      "actions": [
        { "click": "Get started" }, // ref await page.getByText('Get started', { exact: true }).first().click()
        { "click": "a > Writing tests" }, // ref await page.locator('a', { hasText: 'Writing tests' }).first().click()
        { "wait": 500 } // ref await page.waitForTimeout(500)
      ]
    }
  }
}
```

### 3) Form with faker and date

```jsonc
{
  "describe": {
    "text": "Form with dynamic data",
    "form": {
      "url": "/form", // ref await page.goto('/form')
      "actions": [
        { "loc": "#name", "type": "faker.person.fullName()" }, // ref await page.locator('#name').fill(...)
        { "loc": "#email", "type": "faker.internet.email()" }, // ref await page.locator('#email').fill(...)
        { "loc": "#start", "type": "date(today+7, \"dd/MM/yyyy\")" }, // ref await page.locator('#start').fill('dd/MM/yyyy')
        { "click": "button > Submit" } // ref await page.locator('button', { hasText: 'Submit' }).first().click()
      ]
    }
  }
}
```

### 4) Reuse with `before` (single path)

```jsonc
{
  "describe": {
    "text": "CRUD Suite",
    "before": "./00-login.json",
    "create-item": {
      "url": "/items/new", // ref await page.goto('/items/new')
      "actions": [
        { "loc": "#title", "type": "faker.person.fullName()" }, // ref await page.locator('#title').fill(...)
        { "click": "button > Save" }, // ref await page.locator('button', { hasText: 'Save' }).first().click()
        { "expectUrl": { "contains": "/items/" } } // ref await expect(page).toHaveURL(/\/items\//)
      ]
    }
  }
}
```

### 5) Reuse with `before` (list)

```jsonc
{
  "describe": {
    "text": "Full flow",
    "before": [
      "./00-login.json",
      "./01-choose-tenant.json",
      "../shared/seed.json"
    ],
    "do-stuff": {
      "title": "Main action",
      "url": "/dashboard", // ref await page.goto('/dashboard')
      "actions": [
        { "click": "a > Settings" }, // ref await page.locator('a', { hasText: 'Settings' }).first().click()
        { "expectVisible": "Settings" } // ref await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible()
      ]
    }
  }
}
```

### 6) Assertions, select and upload

```jsonc
{
  "describe": {
    "text": "Advanced actions",
    "complex": {
      "url": "/profile", // ref await page.goto('/profile')
      "actions": [
        { "select": { "label": "Brazil" }, "loc": "#country" }, // ref await page.locator('#country').selectOption({ label: 'Brazil' })
        { "upload": "tests/fixtures/avatar.png", "loc": "input[type=file]" }, // ref await page.locator('input[type=file]').setInputFiles('tests/fixtures/avatar.png')
        { "expectVisible": { "timeout": 3000 }, "loc": ".toast-success" }, // ref await expect(page.locator('.toast-success')).toBeVisible({ timeout: 3000 })
        { "screenshot": { "path": "screens/profile.png", "fullPage": true } } // ref await page.screenshot({ path: 'screens/profile.png', fullPage: true })
      ]
    }
  }
}
```

---

## ❓ FAQ

- **Can I disable auto-scaffold?**  
  Yes. Remove the `postinstall` script when consuming a forked copy of this package.

- **Does it work with `e2e/` instead of `tests/`?**  
  Yes. If `e2e/` exists, the spec file is created there. If neither exists, `tests/` is created.

- **How to run a single case?**  
  Use Playwright’s grep: `npx playwright test -g "User can log in"`.

- **Where should JSON files live?**  
  In the `Fixtures/` folder. Files are discovered recursively.

---

## 📄 License

MIT
