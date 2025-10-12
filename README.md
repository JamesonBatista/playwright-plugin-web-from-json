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

- [⚙️ Install](#%EF%B8%8F-install)
- [🧱 JSON Shape (correct!)](#-json-shape-correct)
- [🧩 Concepts](#-concepts)
  - [🔌 `run` at describe-level & action-level](#-run-at-describe-level--action-level)
  - [🌍 `url` handling](#-url-handling)
  - [🧭 Scoping: frame/root/parent/index/within](#-scoping-framerootparentindexwithin)
  - [🎯 Targeting rules](#-targeting-rules)
  - [🔢 Indexing (nth/first/last)](#-indexing-nthfirstlast)
  - [🧠 Tokens & dynamic strings](#-tokens--dynamic-strings)
- [🛠️ Actions Reference → Playwright](#%EF%B8%8F-actions-reference--playwright)
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

- **Describe-level**: _Your json-loader may propagate this to each case before URL resolution._ (If you prefer case-local only, keep it at the case/action level.)
- **Case-level**: runs before navigating (sets `vars.resultFunc`).
- **Action-level**: short-circuits that action; it only runs the function and stores `vars.resultFunc`.

`RunPluginFunctions` loader order (from your runner):

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
- `type` / `typeSlow` also pass through your `resolveDynamic(...)` (e.g., `faker.internet.email()`).
- Token examples: `{resultFunc}`, `{resultFunc.email}`, `{resultFunc.user.name}`.

---

## 🛠️ Actions Reference → Playwright

| Action                     | JSON                                                               | Playwright reference                                                              |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `type`                     | `{ "loc": "#user", "type": "John" }`                               | `await page.locator('#user').fill('John')`                                        |
| `typeSlow`                 | `{ "loc": "#msg", "typeSlow": "Hello" }`                           | `await loc.fill(''); await loc.pressSequentially('Hello', { delay: 300 })`        |
| `click`                    | `{ "click": "button > Save" }`                                     | `await page.locator('button', { hasText: 'Save' }).click()`                       |
| `click: "{type}"`          | `{ "click": "{type}" }`                                            | Click element showing last typed text                                             |
| `click: "<prefix> {type}"` | `{ "click": "ul.results {type}" }`                                 | Click descendant with last typed text                                             |
| `hover`                    | `{ "hover": ".menu" }`                                             | `await page.locator('.menu').hover()`                                             |
| `press`                    | `{ "press": "Enter", "loc": "#q" }`                                | `await page.locator('#q').press('Enter')` or `await page.keyboard.press('Enter')` |
| `check`/`uncheck`          | `{ "check": "#agree" }`                                            | `await page.locator('#agree').check()` / `.uncheck()`                             |
| `select`                   | `{ "select": { "label": "Brazil" }, "loc": "#country" }`           | `await page.locator('#country').selectOption({ label: 'Brazil' })`                |
| `upload`                   | `{ "upload": "fixtures/a.png", "loc": "input[type=file]" }`        | `await page.locator('input[type=file]').setInputFiles('fixtures/a.png')`          |
| `expectText`               | `{ "expectText": { "contains": "Welcome" } }`                      | `await expect(page.locator('body')).toContainText('Welcome')`                     |
| `expectVisible`            | `{ "expectVisible": "#toast" }`                                    | `await expect(page.locator('#toast')).toBeVisible()`                              |
| `expectUrl`                | `{ "expectUrl": { "contains": "/home" } }`                         | `await expect(page).toHaveURL(/\/home/)`                                          |
| `waitRequest`              | `{ "waitRequest": { "url": "/api/save", "status": 200 } }`         | `await handleWaitRequest(page, { url:'/api/save', status:200 })`                  |
| `wait`                     | `{ "wait": 800 }`                                                  | `await page.waitForTimeout(800)`                                                  |
| `screenshot`               | `{ "screenshot": { "path": "shots/home.png", "fullPage": true } }` | `await page.screenshot({ path:'shots/home.png', fullPage:true })`                 |

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

### run

```text
Reminder: when an action has "run", the other fields of that action are ignored (the runner continues). That's why I separated the run into its own action and used {resultFunc} in the next action.
```

```json
{
  "describe": {
    "text": "Auth Suite (describe-level run)",
    "run": "randomEmail",
    "signup": {
      "title": "Sign up with describe token",
      "url": "https://jamesonbatista.github.io/projectqatesterweb/",
      "actions": [
        { "click": "Login" },
        { "loc": "#username", "type": "{resultFunc}" },
        { "loc": "#password", "type": "faker.internet.password()" },
        { "click": "[type='submit'] > Login" },
        { "wait": 1500 }
      ]
    },
    "login": {
      "title": "Login reusing describe token",
      "url": "https://jamesonbatista.github.io/projectqatesterweb/",
      "actions": [
        { "click": "Login" },
        { "loc": "#username", "type": "{resultFunc}" },
        { "loc": "#password", "type": "P@ssw0rd123" },
        { "click": "[type='submit'] > Login" },
        { "expectText": { "contains": "Welcome" } }
      ]
    }
  }
}
```

```json
{
  "describe": {
    "text": "Auth Suite (case-level run)",
    "register-user": {
      "title": "Create user via case run",
      "run": "buildUser",
      "url": "https://jamesonbatista.github.io/projectqatesterweb/",
      "actions": [
        { "click": "Login" },
        { "loc": "#username", "type": "{resultFunc.email}" },
        { "loc": "#password", "type": "{resultFunc.password}" },
        { "click": "[type='submit'] > Login" },
        { "expectUrl": { "contains": "/dashboard" } },
        {
          "screenshot": {
            "path": "shots/after-register-{resultFunc.email}.png",
            "fullPage": true
          }
        }
      ]
    }
  }
}
```

```json
{
  "describe": {
    "text": "Profile Suite (action-level run)",
    "update-profile": {
      "title": "Stamp profile with ISO time from run",
      "url": "https://jamesonbatista.github.io/projectqatesterweb/",
      "actions": [
        { "click": "Login" },
        { "loc": "#username", "type": "faker.internet.email()" },
        { "loc": "#password", "type": "P@ssw0rd123" },
        { "click": "[type='submit'] > Login" },

        { "wait": 800 },
        { "click": "Profile" },

        { "run": "nowISO" },
        { "loc": "#displayName", "type": "User {resultFunc}" },
        { "click": "button > Save" },

        { "expectText": { "contains": "{resultFunc}" } },
        { "screenshot": { "path": "shots/profile-{resultFunc}.png" } }
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
- **Target forms**: selector | `"tag > text"` | exact text
- **Indexing**: set on action or `context` (not both); `nth` vs `first/last`
- **Typing**: `type` fast; `typeSlow` with key delays
- **Tokens**: `{resultFunc}`, nested paths allowed
- **Screenshots**: page or element, interpolate `path`

---

## 💡 Tips

- Put broad scoping rules in **`context`** at case-level; override in actions.
- Use `exist` on optional UI (cookie banners, modals).
- Organize suites by feature with clear **case keys**.
- Keep `RunPluginFunctions` small & composable (data factories, clocks, IDs).
