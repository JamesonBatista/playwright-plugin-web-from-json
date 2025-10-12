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

### Using url

The url can be used both in the `describe` and also within the `test`, Login, and New Register.

Ways to use the url:

1. `url`: "http..." _the code will use the entire url provided_

```json
{ "url": "https://www.example.com" }
```

2. `url`: "/procuts" _url provided + baseUrl in `playwright.config.ts`_

```json
{ "url": "/produts" }

// {"url": "baseUrl" + "/products"}
```

3.  `without the url key` _when the url key is missing, the test will continue on the current page._

```json
{
  "describe": {
    "text": "Test in App",
    "url": "https://jamesonbatista.github.io/projectqatesterweb/",
    "First Test Login": {
      "title": "All Tests",
      "actions": [{ "click": "Login" }]
    },
    "Second Test Register": {
      // the url was not provided
      "title": "All Tests",
      "actions": [{ "click": "Login" }]
    }
  }
}
```

---

```json
{
  "describe": {
    "text": "Test in App",
    "url": "https://jamesonbatista.github.io/projectqatesterweb/",
    "case-key": {
      "title": "All Tests",
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
    "url": "https://jamesonbatista.github.io/projectqatesterweb/",
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

| Action                     | JSON (2 examples)                                                                                                                                                                                 | Playwright reference (2 examples)                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                     | `{ "loc": "#user", "type": "John" }`<br>`{ "loc": "input[name='email']", "type": "jam@example.com" }`                                                                                             | `await page.locator('#user').fill('John')`<br>`await page.locator('input[name="email"]').fill('jam@example.com')`                                                                                                                |
| `typeSlow`                 | `{ "loc": "#msg", "typeSlow": "Hello" }`<br>`{ "loc": ".editor textarea", "typeSlow": "Long text…" }`                                                                                             | `await loc.fill(''); await loc.pressSequentially('Hello', { delay: 300 })`<br>`await page.locator('.editor textarea').pressSequentially('Long text…', { delay: 300 })`                                                           |
| `click`                    | `{ "click": "button > Save" }`<br>`{ "click": "a:has-text('Docs')" }`                                                                                                                             | `await page.locator('button', { hasText: 'Save' }).click()`<br>`await page.locator("a:has-text('Docs')").click()`                                                                                                                |
| `click: "{type}"`          | `{ "loc": "#q", "type": "Playwright" } , { "click": "{type}" }`<br>`{ "type": "Neo", "loc": "input[name='who']" } , { "click": "{type}" }`                                                        | `await page.locator('#q').fill('Playwright'); await page.getByText('Playwright', { exact: true }).click()`<br>`await page.locator("input[name='who']").fill('Neo'); await page.getByText('Neo', { exact: true }).click()`        |
| `click: "<prefix> {type}"` | `{ "type": "Item 1", "loc": "#search" } , { "click": "ul.results {type}" }`<br>`{ "type": "Settings", "loc": "#menu-filter" } , { "click": "nav {type}" }`                                        | `await page.locator('#search').fill('Item 1'); await page.locator('ul.results *:has-text("Item 1")').click()`<br>`await page.locator('#menu-filter').fill('Settings'); await page.locator('nav *:has-text("Settings")').click()` |
| `hover`                    | `{ "hover": ".menu" }`<br>`{ "hover": "button:has-text('Preview')" }`                                                                                                                             | `await page.locator('.menu').hover()`<br>`await page.locator("button:has-text('Preview')").hover()`                                                                                                                              |
| `press`                    | `{ "press": "Enter", "loc": "#q" }`<br>`{ "press": "Escape" }`                                                                                                                                    | `await page.locator('#q').press('Enter')`<br>`await page.keyboard.press('Escape')`                                                                                                                                               |
| `check` / `uncheck`        | `{ "check": "#agree" }`<br>`{ "uncheck": ".todo-list li:nth-child(1) .toggle" }`                                                                                                                  | `await page.locator('#agree').check()`<br>`await page.locator('.todo-list li:nth-child(1) .toggle').uncheck()`                                                                                                                   |
| `select`                   | `{ "select": { "label": "Brazil" }, "loc": "#country" }`<br>`{ "select": { "value": "us" }, "loc": "select#country" }`                                                                            | `await page.locator('#country').selectOption({ label: 'Brazil' })`<br>`await page.locator('select#country').selectOption({ value: 'us' })`                                                                                       |
| `upload`                   | `{ "upload": "fixtures/a.png", "loc": "input[type=file]" }`<br>`{ "upload": ["fixtures/a.png","fixtures/b.png"], "loc": "input[type=file]" }`                                                     | `await page.locator('input[type=file]').setInputFiles('fixtures/a.png')`<br>`await page.locator('input[type=file]').setInputFiles(['fixtures/a.png','fixtures/b.png'])`                                                          |
| `exist`                    | `{ "exist": "#close-popup", "click": "#close-popup" }`<br>`{ "exist": "Promotion", "click": "Fechar" }`                                                                                           | Soft-check element then run remaining keys if found (no-op if not)<br>Soft-check text then click close                                                                                                                           |
| `getText`                  | `{ "getText": "h1" }`<br>`{ "getText": ".card .title" }`                                                                                                                                          | `const t = await page.locator('h1').textContent()`<br>`const t = await page.locator('.card .title').textContent()`                                                                                                               |
| `expectText`               | `{ "expectText": { "contains": "Welcome" } }`<br>`{ "loc": ".toast", "expectText": { "equals": "Saved!" } }`                                                                                      | `await expect(page.locator('body')).toContainText('Welcome')`<br>`await expect(page.locator('.toast')).toHaveText('Saved!')`                                                                                                     |
| `expectVisible`            | `{ "expectVisible": "#toast" }`<br>`{ "loc": ".modal", "expectVisible": { "timeout": 2000 } }`                                                                                                    | `await expect(page.locator('#toast')).toBeVisible()`<br>`await expect(page.locator('.modal')).toBeVisible({ timeout: 2000 })`                                                                                                    |
| `expectUrl`                | `{ "expectUrl": { "contains": "/home" } }`<br>`{ "expectUrl": { "equals": "https://app.test/dashboard" } }`                                                                                       | `await expect(page).toHaveURL(/\\/home/)`<br>`await expect(page).toHaveURL('https://app.test/dashboard')`                                                                                                                        |
| `waitRequest`              | `{ "waitRequest": { "url": "/api/save", "status": 200 } }`<br>`{ "waitRequest": { "url": "**/users", "method": "POST" } }`                                                                        | `await handleWaitRequest(page, { url:'/api/save', status:200 })`<br>`await handleWaitRequest(page, { url:'**/users', method:'POST' })`                                                                                           |
| `wait`                     | `{ "wait": 500 }`<br>`{ "wait": 1500 }`                                                                                                                                                           | `await page.waitForTimeout(500)`<br>`await page.waitForTimeout(1500)`                                                                                                                                                            |
| `screenshot`               | `{ "screenshot": { "path": "shots/home.png", "fullPage": true } }`<br>`{ "loc": ".card", "screenshot": { "path": "shots/card.png" } }`                                                            | `await page.screenshot({ path:'shots/home.png', fullPage:true })`<br>`await page.locator('.card').screenshot({ path:'shots/card.png' })`                                                                                         |
| `forEach`                  | `{ "forEach": { "items": ".product-card", "actions": [ { "click": "button:has-text('Details')" } ] } }`<br>`{ "forEach": { "items": "article.post", "actions": [ { "getText": "h2.title" } ] } }` | Itera cada elemento e executa as ações aninhadas no escopo do item<br>Itera posts e captura o texto do título                                                                                                                    |
| `scrollTo`                 | `"bottom"`<br>`{ "to": "h2:has-text('Installation')" }`                                                                                                                                           | `await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }))`<br>`await page.locator("h2:has-text('Installation')").scrollIntoViewIfNeeded()`                                                                |
| `expectValue`              | `{ "expectValue": { "loc": "input[name='email']", "equals": "jam@example.com" } }`<br>`{ "expectValue": { "loc": "#q", "contains": "runner" } }`                                                  | `await expect(page.locator("input[name='email']")).toHaveValue("jam@example.com")`<br>`expect(await page.locator('#q').inputValue()).toContain('runner')`                                                                        |
| `route`                    | `{ "route": { "url": "**/api/users", "mock": { "status": 200, "json": [{ "id":1,"name":"Neo"}] } } }`<br>`{ "route": { "unroute": "**/api/users" } }`                                             | `await page.route("**/api/users", r => r.fulfill({ status:200, headers:{'content-type':'application/json'}, body: JSON.stringify([{id:1,name:'Neo'}]) }))`<br>`await page.unroute("**/api/users")`                               |
| `run`                      | `{ "run": "buildUser" }`<br>`{ "run": "nowISO" }`                                                                                                                                                 | `const out = await pluginFns.buildUser(); /* vars.resultFunc = out */`<br>`const out = await pluginFns.nowISO(); /* vars.resultFunc = out */`                                                                                    |

---

### Examples in context (new actions)

#### 1) `forEach` — iterate cards and act inside each item scope

```json
{
  "describe": {
    "text": "forEach demo",
    "url": "/products",
    "each-product": {
      "title": "Open and close details for each product card",
      "actions": [
        {
          "forEach": {
            "items": ".product-card",
            "actions": [
              { "click": "button:has-text('Details')" }, // await page.locator("button:has-text('Details')").click()
              { "expectVisible": "h1 > text" }, // await expect(page.locator("h1", { hasText: "text" })).toBeVisible()
              { "click": "button:has-text('Close')" } // await page.locator("button:has-text('Close')").click()
            ]
          }
        }
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
    "url": "/long-page",
    "footer-visible": {
      "title": "Footer after scroll",
      "actions": [
        { "scrollTo": "bottom" }, // await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" }))
        { "expectVisible": "footer.site-footer" } // await expect(page.locator("footer.site-footer")).toBeVisible()
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "scrollTo target",
    "url": "/docs",
    "section-into-view": {
      "title": "Jump to Installation section",
      "actions": [
        { "scrollTo": { "to": "h2:has-text('Installation')" } }, // await page.locator("h2:has-text('Installation')").scrollIntoViewIfNeeded()
        { "expectVisible": "p:has-text('npm install')" } // await expect(page.locator("p:has-text('npm install')")).toBeVisible()
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
        { "scrollTo": { "x": 0, "y": 800 } }, // await page.evaluate(() => window.scrollTo({ top: 800, left: 0, behavior: "auto" }))
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
    "url": "/profile",
    "profile-email": {
      "title": "Exact email value",
      "actions": [
        { "click": "input[name='email']" }, // await page.locator("input[name='email']").click()
        { "type": "jam@example.com", "loc": "input[name='email']" }, // await page.locator("input[name='email']").fill("jam@example.com")
        {
          "expectValue": {
            "loc": "input[name='email']",
            "equals": "jam@example.com"
          }
        } // await expect(page.locator("input[name='email']")).toHaveValue("jam@example.com")
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "expectValue contains",
    "url": "/search",
    "search-query": {
      "title": "Query contains substring",
      "actions": [
        { "click": "input[name='q']" }, // await page.locator("input[name='q']").click()
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
    "url": "/users",
    "mock-users": {
      "title": "Mock users endpoint",
      "actions": [
        {
          "route": {
            "url": "**/api/users",
            "mock": { "status": 200, "json": [{ "id": 1, "name": "Neo" }] }
          }
        }, // await page.route("**/api/users", r => r.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify([{ id: 1, name: "Neo" }]) }))
        { "click": "button:has-text('Load Users')" }, // await page.locator("button:has-text('Load Users')").click()
        { "expectVisible": "li:has-text('Neo')" } // await expect(page.locator("li:has-text('Neo')")).toBeVisible()
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "route block",
    "url": "/home",
    "block-assets": {
      "title": "Block analytics and PNG",
      "actions": [
        { "route": { "block": ["**/analytics/**", "**/*.png"] } }, // await page.route("**/analytics/**", r => r.abort()); await page.route("**/*.png", r => r.abort())
        { "wait": 300 }, // await page.waitForTimeout(300)
        { "expectVisible": "h1:has-text('Home')" } // await expect(page.locator("h1:has-text('Home')")).toBeVisible()
      ]
    }
  }
}
```

```jsonc
{
  "describe": {
    "text": "route unroute",
    "url": "/users",
    "remove-mock": {
      "title": "Unroute previous mock",
      "actions": [
        { "route": { "unroute": "**/api/users" } }, // await page.unroute("**/api/users")
        { "click": "button:has-text('Reload')" }, // await page.locator("button:has-text('Reload')").click()
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
    "url": "https://example.com",
    "home": {
      "title": "Open Example",
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
    "url": "https://example.com",
    "home": {
      "title": "Home is visible",
      "actions": [{ "expectVisible": "h1" }]
    },
    "go-details": {
      "title": "Go to details",
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
    "url": "https://developer.mozilla.org",
    "search-fetch": {
      "title": "Search fetch",
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
    "url": "https://www.w3schools.com/html/tryit.asp?filename=tryhtml_input_text",
    "input-in-iframe": {
      "title": "Type inside iframe",
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
    "url": "https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_select",
    "select-demo": {
      "title": "Pick Saab",
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
    "url": "https://www.w3schools.com/tags/tryit.asp?filename=tryhtml5_input_type_file",
    "upload-demo": {
      "title": "Upload a file",
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
