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

> **Author tests in JSON.** This doc matches your runner's exact grammar and the behavior in `runner-executor.ts` you shared.

---

## 🧭 Quick Menu


- [📚 20+ Realistic JSON Examples (correct structure)](#-20-realistic-json-examples-correct-structure)
  - [A. Minimal suite](#a-minimal-suite)
  - [B. Two cases in one describe](#b-two-cases-in-one-describe)
  - [C. Wikipedia search](#c-wikipedia-search)
  - [D. MDN search + URL check](#d-mdn-search--url-check)
  - [E. Playwright.dev navigation](#e-playwrightdev-navigation)
  - [F. npmjs search + expectVisible](#f-npmjs-search--expectvisible)
  - [G. DuckDuckGo slow type + {type} click](#g-duckduckgo-slow-type--type-click)
  - [H. Example.com full-page screenshot](#h-examplecom-full-page-screenshot)
  - [I. W3Schools iframe input](#i-w3schools-iframe-input)
  - [J. W3Schools select dropdown](#j-w3schools-select-dropdown)
  - [K. W3Schools file upload](#k-w3schools-file-upload)
  - [L. ToDoMVC check/uncheck](#l-todomvc-checkuncheck)
  - [M. Press keys (locator & page)](#m-press-keys-locator--page)
  - [N. `exist` gate (optional UI)](#n-exist-gate-optional-ui)
  - [O. `getText` + assert body](#o-gettext--assert-body)
  - [P. waitRequest + wait](#p-waitrequest--wait)
  - [Q. expectUrl equals/contains](#q-expecturl-equalscontains)
  - [R. describe-level run + tokens](#r-describe-level-run--tokens)
  - [S. Nested frames + parent climbs](#s-nested-frames--parent-climbs)
  - [T. Complex table with nth & within](#t-complex-table-with-nth--within)
- [🧪 Quick Start `.spec.ts`](#-quick-start-spects)
- [🧾 Cheatsheet](#-cheatsheet)
- [💡 Tips](#-tips)

---

## ⚙️ Install

```bash
npx playwright init
npm install playwright-plugin-web-from-json
```

---

## 🧱 JSON Shape (correct!)

The **ONLY valid** top-level key is `describe`. Inside it:

- `"text"`: suite title (string, required)
- `"run"`: optional describe-level function (string Method name in `RunPluginFunctions`)
- One or more **case keys** (you choose the key): objects with `title`, `url`, `actions`, and optional `context`.

```jsonc
{
  "describe": {
    "text": "Test in App",
    "case-key": {
      "title": "All Tests",
      "url": "https://jamesonbatista.github.io/projectqatesterweb/",
      "actions": [
        { "click": "Login" },
        { "loc": "#username", "type": "faker.internet.email()" },
        { "loc": "#password", "type": "faker.internet.username()" },
        { "click": "[type='submit'] > Login" },
        { "wait": 3000 }
      ]
    }
  }
}
```

You can also have a **bare describe header** (no cases yet):

```jsonc
{
  "describe": {
    "text": "Test in App",
    "run": "" // optional (or omit)
  }
}
```

> The runner converts each **case key** into a Playwright `test()`. If `title` is missing, it uses `Tests in feature <case-key>`.

---

## 🧩 Concepts

### 🔌 `run` at describe-level & action-level

- **Describe-level**: may be propagated to each case before URL resolution.
- **Case-level**: runs before navigating (sets `vars.resultFunc`).
- **Action-level**: short-circuits that action; it only runs the function and stores `vars.resultFunc`.

`RunPluginFunctions` loader order:

1. `opts.functionsPath` (if provided) → 2) `help/plugin-func.ts` → 3) `help/plugin-func.js`

Accepted exports: `export class RunPluginFunctions {}`, `export default { RunPluginFunctions }`, or `export default class RunPluginFunctions {}`.

### 🌍 `url` handling

- `""` → open `baseURL` (or `opts.baseURLOverride`)
- `"https://..."` → absolute
- `"relative"` → resolved against effective base

Errors:

- Relative URL without base → **throws**

### 🧭 Scoping: frame/root/parent/index/within

Per **action** (or via **`context`** at case-level, then overridden by actions):

- `frame` / `iframe`: `string | string[]` → chain `frameLocator(sel)`
- `root`: `string` → `locator(root)`
- `parent`: selector **or** exact text → find anchor, **then climb**:
- `index`: number of `".."` climbs (default 1)
- `within`: narrowing selector at the end

### 🎯 Targeting rules

- **Selector** → `locator(selector)`
- **`"tag > text"`** → `locator(tag, { hasText: text })`
- **Exact text** → `getByText(text, { exact: true })`

### 🔢 Indexing (nth/first/last)

- Valid on **action** or in **`context`**. Action **overrides** case.
- `nth` **cannot** be combined with `first`/`last`. Runner validates and throws.

### 🧠 Tokens & dynamic strings

- Interpolation runs on common string fields (e.g., `click`, `loc`, `expectText.equals`, etc.).
- `type` / `typeSlow` also pass through `resolveDynamic(...)` (e.g., `faker.internet.email()`).
- Token examples: `{resultFunc}`, `{resultFunc.email}`, `{resultFunc.user.name}`.

---

## 🛠️ Actions Reference → Playwright

| Action                     | JSON (shape)                                                                                           | Playwright reference                                                                                  |
|---------------------------|----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| `type`                    | `{ "loc": "#user", "type": "John" }`                                                                     | `await page.locator('#user').fill('John')`                                                           |
| `typeSlow`                | `{ "loc": "#msg", "typeSlow": "Hello" }`                                                                 | `await loc.fill(''); await loc.pressSequentially('Hello', { delay: 300 })`                           |
| `click`                   | `{ "click": "button > Save" }`                                                                           | `await page.locator('button', { hasText: 'Save' }).click()`                                          |
| `click: "{type}"`         | `{ "click": "{type}" }`                                                                                  | Click element showing last typed text                                                                 |
| `click: "<prefix> {type}"`| `{ "click": "ul.results {type}" }`                                                                       | Click descendant with last typed text                                                                 |
| `hover`                   | `{ "hover": ".menu" }`                                                                                   | `await page.locator('.menu').hover()`                                                                 |
| `press`                   | `{ "press": "Enter", "loc": "#q" }`                                                                      | `await page.locator('#q').press('Enter')` or `await page.keyboard.press('Enter')`                    |
| `check` / `uncheck`       | `{ "check": "#agree" }`                                                                                  | `await page.locator('#agree').check()` / `.uncheck()`                                                |
| `select`                  | `{ "select": { "label": "Brazil" }, "loc": "#country" }`                                                 | `await page.locator('#country').selectOption({ label: 'Brazil' })`                                   |
| `upload`                  | `{ "upload": "fixtures/a.png", "loc": "input[type=file]" }`                                              | `await page.locator('input[type=file]').setInputFiles('fixtures/a.png')`                             |
| `exist`                   | `{ "exist": "#close-popup", "click": "#close-popup" }`                                                   | Soft check then run remaining keys if element exists                                                  |
| `getText`                 | `{ "getText": "h1" }`                                                                                    | `const text = await page.locator('h1').textContent()`                                                |
| `expectText`              | `{ "expectText": { "contains": "Welcome" } }`                                                            | `await expect(page.locator('body')).toContainText('Welcome')`                                        |
| `expectVisible`           | `{ "expectVisible": "#toast" }`                                                                          | `await expect(page.locator('#toast')).toBeVisible()`                                                 |
| `expectUrl`               | `{ "expectUrl": { "contains": "/home" } }`                                                               | `await expect(page).toHaveURL(/\\/home/)`                                                            |
| `waitRequest`             | `{ "waitRequest": { "url": "/api/save", "status": 200 } }`                                               | `await handleWaitRequest(page, { url:'/api/save', status:200 })`                                     |
| `wait`                    | `{ "wait": 800 }`                                                                                        | `await page.waitForTimeout(800)`                                                                     |
| `screenshot`              | `{ "screenshot": { "path": "shots/home.png", "fullPage": true } }`                                       | `await page.screenshot({ path:'shots/home.png', fullPage:true })`                                    |
| `forEach`                 | `{ "forEach": { "items": "<selector>", "actions": [ ... ] } }`                                           | Iterate matched elements and run nested actions in each element's scope                              |
| `scrollTo`                | `"top"|"bottom" \| { "to": "<selector|text>" } \| { "x": 0, "y": 800, "behavior"?: "auto"|"smooth" }`    | `window.scrollTo(...)` / `locator.scrollIntoViewIfNeeded()`                                          |
| `expectValue`             | `{ "expectValue": { "loc": "<selector>", "equals"?: "...", "contains"?: "...", "timeout"?: 3000 } }`     | `await expect(locator).toHaveValue(...)` or `expect(await locator.inputValue()).toContain(...)`      |
| `route`                   | `{ "route": { "url"?: "<glob>", "mock"?: {...}, "block"?: "<glob>"\|"[...]", "unroute"?: "<glob>" } }`  | `page.route('**/api', handler)` / `route.fulfill(...)` / `route.abort()` / `page.unroute(...)`       |

---

### Examples in context (new actions)

#### 1) `forEach` — iterate cards and act inside each item scope
```jsonc
{
  "describe": {
    "text": "forEach demo",
    "each-product": {
      "title": "Open and close details for each product card",
      "url": "/products",
      "actions": [
        { "forEach": { "items": ".product-card", "actions": [
          { "click": "button:has-text('Details')" }, // await page.locator("button:has-text('Details')").click()
          { "expectVisible": "h1 > text" },          // await expect(page.locator("h1", { hasText: "text" })).toBeVisible()
          { "click": "button:has-text('Close')" }    // await page.locator("button:has-text('Close')").click()
        ] } }
      ]
    }
  }
}
```

#### 2) `scrollTo` — bottom, to a target, and by coordinates
```jsonc
{
  "describe": {
    "text": "scrollTo bottom",
    "footer-visible": {
      "title": "Footer after scroll",
      "url": "/long-page",
      "actions": [
        { "scrollTo": "bottom" },                    // await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" }))
        { "expectVisible": "footer.site-footer" }    // await expect(page.locator("footer.site-footer")).toBeVisible()
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "scrollTo target",
    "section-into-view": {
      "title": "Jump to Installation section",
      "url": "/docs",
      "actions": [
        { "scrollTo": { "to": "h2:has-text('Installation')" } }, // await page.locator("h2:has-text('Installation')").scrollIntoViewIfNeeded()
        { "expectVisible": "p:has-text('npm install')" }         // await expect(page.locator("p:has-text('npm install')")).toBeVisible()
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "scrollTo coordinates",
    "by-xy": {
      "title": "Scroll by coordinates",
      "url": "/canvas-playground",
      "actions": [
        { "scrollTo": { "x": 0, "y": 800 } },        // await page.evaluate(() => window.scrollTo({ top: 800, left: 0, behavior: "auto" }))
        { "expectVisible": "div.widget:has-text('Reached')" } // await expect(page.locator("div.widget:has-text('Reached')")).toBeVisible()
      ]
    }
  }
}
```

#### 3) `expectValue` — assert input/textarea value
```jsonc
{
  "describe": {
    "text": "expectValue equals",
    "profile-email": {
      "title": "Exact email value",
      "url": "/profile",
      "actions": [
        { "click": "input[name='email']" },          // await page.locator("input[name='email']").click()
        { "type": "jam@example.com" , "loc": "input[name='email']" }, // await page.locator("input[name='email']").fill("jam@example.com")
        { "expectValue": { "loc": "input[name='email']", "equals": "jam@example.com" } } // await expect(page.locator("input[name='email']")).toHaveValue("jam@example.com")
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "expectValue contains",
    "search-query": {
      "title": "Query contains substring",
      "url": "/search",
      "actions": [
        { "click": "input[name='q']" },              // await page.locator("input[name='q']").click()
        { "type": "Playwright runner json", "loc": "input[name='q']" }, // await page.locator("input[name='q']").fill("Playwright runner json")
        { "expectValue": { "loc": "input[name='q']", "contains": "runner" } } // expect(await page.locator("input[name='q']").inputValue()).toContain("runner")
      ]
    }
  }
}
```

#### 4) `route` — mock, block and unroute
```jsonc
{
  "describe": {
    "text": "route mock",
    "mock-users": {
      "title": "Mock users endpoint",
      "url": "/users",
      "actions": [
        { "route": { "url": "**/api/users", "mock": { "status": 200, "json": [{ "id": 1, "name": "Neo" }] } } }, // await page.route("**/api/users", r => r.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify([{ id: 1, name: "Neo" }]) }))
        { "click": "button:has-text('Load Users')" }, // await page.locator("button:has-text('Load Users')").click()
        { "expectVisible": "li:has-text('Neo')" }     // await expect(page.locator("li:has-text('Neo')")).toBeVisible()
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "route block",
    "block-assets": {
      "title": "Block analytics and PNG",
      "url": "/home",
      "actions": [
        { "route": { "block": ["**/analytics/**", "**/*.png"] } }, // await page.route("**/analytics/**", r => r.abort()); await page.route("**/*.png", r => r.abort())
        { "wait": 300 },                                           // await page.waitForTimeout(300)
        { "expectVisible": "h1:has-text('Home')" }                 // await expect(page.locator("h1:has-text('Home')")).toBeVisible()
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "route unroute",
    "remove-mock": {
      "title": "Unroute previous mock",
      "url": "/users",
      "actions": [
        { "route": { "unroute": "**/api/users" } },  // await page.unroute("**/api/users")
        { "click": "button:has-text('Reload')" },    // await page.locator("button:has-text('Reload')").click()
        { "waitRequest": { "url": "**/api/users", "method": "GET" } } // await handleWaitRequest(page, { url: "**/api/users", method: "GET" })
      ]
    }
  }
}
```

---

## 📚 20+ Realistic JSON Examples (correct structure)

> Replace public URLs with your app when adopting. All examples use **your** describe shape.

### A. Minimal suite
```json
{
  "describe": {
    "text": "Smoke — Example.com",
    "home": {
      "title": "Open Example",
      "url": "https://example.com",
      "actions": [{ "expectVisible": "h1" }]
    }
  }
}
```

### B. Two cases in one describe
```json
{
  "describe": {
    "text": "Example navigation",
    "home": {
      "title": "Home is visible",
      "url": "https://example.com",
      "actions": [{ "expectVisible": "h1" }]
    },
    "go-details": {
      "title": "Go to details",
      "url": "https://example.com",
      "actions": [
        { "click": "a > More information" },
        { "expectUrl": { "contains": "iana.org" } }
      ]
    }
  }
}
```

### C. Wikipedia search
```json
{
  "describe": {
    "text": "Wikipedia",
    "search-playwright": {
      "title": "Search Playwright",
      "url": "https://en.wikipedia.org/wiki/Main_Page",
      "actions": [
        { "type": "Playwright", "loc": "#searchInput" },
        { "press": "Enter", "loc": "#searchInput" },
        { "expectVisible": "#firstHeading" },
        { "expectText": { "contains": "Playwright" } }
      ]
    }
  }
}
```

### D. MDN search + URL check
```json
{
  "describe": {
    "text": "MDN",
    "search-fetch": {
      "title": "Search fetch",
      "url": "https://developer.mozilla.org",
      "actions": [
        { "type": "fetch", "loc": "input[type='search']" },
        { "press": "Enter", "loc": "input[type='search']" },
        { "expectUrl": { "contains": "/search?q=fetch" } }
      ]
    }
  }
}
```

### E. Playwright.dev navigation
```json
{
  "describe": {
    "text": "Playwright Docs",
    "assertions-section": {
      "title": "Open Assertions",
      "url": "https://playwright.dev",
      "actions": [
        { "click": "Docs" },
        { "click": "Assertions" },
        { "expectText": { "contains": "Expect" } }
      ]
    }
  }
}
```

### F. npmjs search + expectVisible
```json
{
  "describe": {
    "text": "npmjs",
    "search-lodash": {
      "title": "Find lodash",
      "url": "https://www.npmjs.com/",
      "actions": [
        { "type": "lodash", "loc": "input[type='search']" },
        { "press": "Enter", "loc": "input[type='search']" },
        { "expectVisible": "a > lodash" }
      ]
    }
  }
}
```

### G. DuckDuckGo slow type + {type} click
```json
{
  "describe": {
    "text": "DuckDuckGo",
    "slow-type-then-pick": {
      "title": "Slow type and click by typed text",
      "url": "https://duckduckgo.com",
      "actions": [
        { "typeSlow": "Playwright testing", "loc": "input[name='q']" },
        { "press": "Enter", "loc": "input[name='q']" },
        { "click": "{type}" }
      ]
    }
  }
}
```

### H. Example.com full-page screenshot
```json
{
  "describe": {
    "text": "Screenshots",
    "example-shot": {
      "title": "Full page",
      "url": "https://example.com",
      "actions": [
        { "screenshot": { "path": "shots/example-home.png", "fullPage": true } }
      ]
    }
  }
}
```

### I. W3Schools iframe input
```json
{
  "describe": {
    "text": "W3Schools Iframe",
    "input-in-iframe": {
      "title": "Type inside iframe",
      "url": "https://www.w3schools.com/html/tryit.asp?filename=tryhtml_input_text",
      "actions": [
        {
          "iframe": "#iframeResult",
          "root": "body",
          "type": "Neo",
          "loc": "input[type='text']"
        },
        { "iframe": "#iframeResult", "click": "input[type='submit']" }
      ]
    }
  }
}
```

### J. W3Schools select dropdown
```json
{
  "describe": {
    "text": "W3Schools Select",
    "select-demo": {
      "title": "Pick Saab",
      "url": "https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_select",
      "actions": [
        {
          "iframe": "#iframeResult",
          "select": { "label": "Saab" },
          "loc": "select"
        },
        { "iframe": "#iframeResult", "expectText": { "contains": "Saab" } }
      ]
    }
  }
}
```

### K. W3Schools file upload
```json
{
  "describe": {
    "text": "W3Schools Upload",
    "upload-demo": {
      "title": "Upload a file",
      "url": "https://www.w3schools.com/tags/tryit.asp?filename=tryhtml5_input_type_file",
      "actions": [
        {
          "iframe": "#iframeResult",
          "upload": "fixtures/avatar.png",
          "loc": "input[type='file']"
        },
        { "iframe": "#iframeResult", "expectVisible": "input[type='file']" }
      ]
    }
  }
}
```

### L. ToDoMVC check/uncheck
```json
{
  "describe": {
    "text": "ToDoMVC",
    "toggle-item": {
      "title": "Check and uncheck",
      "url": "https://demo.playwright.dev/todomvc/#/",
      "actions": [
        { "type": "Buy milk", "loc": ".new-todo" },
        { "press": "Enter", "loc": ".new-todo" },
        { "type": "Read docs", "loc": ".new-todo" },
        { "press": "Enter", "loc": ".new-todo" },
        { "check": ".todo-list li:nth-child(1) .toggle" },
        { "uncheck": ".todo-list li:nth-child(1) .toggle" }
      ]
    }
  }
}
```

### M. Press keys (locator & page)
```json
{
  "describe": {
    "text": "Keyboard",
    "press-keys": {
      "title": "ESC and Enter",
      "url": "https://example.com",
      "actions": [{ "press": "Escape" }, { "press": "Enter", "loc": "body" }]
    }
  }
}
```

### N. `exist` gate (optional UI)
```json
{
  "describe": {
    "text": "Optional Popup",
    "skip-popup": {
      "title": "Close popup if present",
      "url": "https://example.com",
      "actions": [
        { "exist": "#close-popup", "click": "#close-popup" },
        { "click": "button > Continue" }
      ]
    }
  }
}
```

### O. `getText` + assert body
```json
{
  "describe": {
    "text": "GetText",
    "capture-header": {
      "title": "Grab and assert",
      "url": "https://example.com",
      "actions": [
        { "getText": "h1" },
        { "expectText": { "contains": "Example" } }
      ]
    }
  }
}
```

### P. waitRequest + wait
```json
{
  "describe": {
    "text": "API waits",
    "save-flow": {
      "title": "Save and wait API",
      "url": "https://example.com/form",
      "actions": [
        { "click": "button > Save" },
        { "waitRequest": { "url": "/api/save", "status": 200 } },
        { "wait": 800 }
      ]
    }
  }
}
```

### Q. expectUrl equals/contains
```json
{
  "describe": {
    "text": "URL Checks",
    "redirects": {
      "title": "Goes to IANA",
      "url": "https://example.com",
      "actions": [
        { "click": "a > More information" },
        { "expectUrl": { "contains": "iana.org" } }
      ]
    }
  }
}
```

### R. describe-level run + tokens
```json
{
  "describe": {
    "text": "Signup with dynamic email",
    "run": "randomEmail",
    "signup": {
      "title": "Fill from token",
      "url": "https://jamesonbatista.github.io/projectqatesterweb/",
      "actions": [
        { "click": "Login" },
        { "loc": "#username", "type": "{resultFunc}" },
        { "loc": "#password", "type": "P@ssw0rd123" },
        { "click": "[type='submit'] > Login" }
      ]
    }
  }
}
```

### S. Nested frames + parent climbs
```json
{
  "describe": {
    "text": "Nested frame actions",
    "inside-iframe": {
      "title": "Click by parent anchor",
      "url": "https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_iframe",
      "actions": [
        {
          "iframe": "#iframeResult",
          "parent": "W3Schools",
          "index": 2,
          "within": "body",
          "click": "a > Learn HTML"
        }
      ]
    }
  }
}
```

### T. Complex table with nth & within
```json
{
  "describe": {
    "text": "Table Ops",
    "edit-second-row": {
      "title": "Edit row by index",
      "url": "https://demo.playwright.dev/todomvc/#/",
      "actions": [
        { "type": "Row A", "loc": ".new-todo" },
        { "press": "Enter", "loc": ".new-todo" },
        { "type": "Row B", "loc": ".new-todo" },
        { "press": "Enter", "loc": ".new-todo" },
        { "within": ".todo-list", "nth": 1, "click": "label > Row B" }
      ]
    }
  }
}
```

---

## 🧪 Quick Start `.spec.ts`

```ts
// tests/json-plugin.spec.ts
import { test } from "@playwright/test";
import { generateTestsFromJson } from "playwright-plugin-web-from-json";
import path from "path";

generateTestsFromJson(
  {
    dir: path.resolve(process.cwd(), "Fixtures"),
    // baseURLOverride: "https://your-app.example"
  },
  test
);
```

Run:

```bash
npx playwright test
```

---

## 🧾 Cheatsheet

- **Suite header**: `{ "describe": { "text": "Title", "run": "fn?" , "<case>": { ... } } }`
- **Case**: `{ "title", "url", "actions": [], "context"?: { frame/iframe/root/parent/index/within, nth/first/last } }`
- **Target forms**: selector \| `"tag > text"` \| exact text
- **Indexing**: set on action or `context` (not both); `nth` vs `first/last`
- **Typing**: `type` fast; `typeSlow` with key delays
- **Tokens**: `{resultFunc}`, nested paths allowed
- **Screenshots**: page or element, interpolate `path`

---
