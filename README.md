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

---

### Using `url`

```json
{ "url": "https..." } // absolute url

{ "url": "/products" } // baseUrl (playwright.config.ts) + /products

{  } // to continue automation on the current page, do not use the key url

```

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
| `forEach`                  | `{ "forEach": { "items": ".product-card", "actions": [ { "click": "button:has-text('Details')" } ] } }`<br>`{ "forEach": { "items": "article.post", "actions": [ { "getText": "h2.title" } ] } }` |                                                                                                                                                                                                                                  |
| `scrollTo`                 | `"bottom"`<br>`{ "to": "h2:has-text('Installation')" }`                                                                                                                                           | `await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }))`<br>`await page.locator("h2:has-text('Installation')").scrollIntoViewIfNeeded()`                                                                |
| `expectValue`              | `{ "expectValue": { "loc": "input[name='email']", "equals": "jam@example.com" } }`<br>`{ "expectValue": { "loc": "#q", "contains": "runner" } }`                                                  | `await expect(page.locator("input[name='email']")).toHaveValue("jam@example.com")`<br>`expect(await page.locator('#q').inputValue()).toContain('runner')`                                                                        |
| `route`                    | `{ "route": { "url": "**/api/users", "mock": { "status": 200, "json": [{ "id":1,"name":"Neo"}] } } }`<br>`{ "route": { "unroute": "**/api/users" } }`                                             | `await page.route("**/api/users", r => r.fulfill({ status:200, headers:{'content-type':'application/json'}, body: JSON.stringify([{id:1,name:'Neo'}]) }))`<br>`await page.unroute("**/api/users")`                               |
| `run`                      | `{ "run": "buildUser" }`<br>`{ "run": "nowISO" }`                                                                                                                                                 |

### ✅ Complete context example (realistic)

```json
{
  "describe": {
    "text": "Context + Indexing",

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
`scope = page.frameLocator('#shell').frameLocator('#app').locator('nav#sidebar');`  
`parent = scope.getByText('Management', { exact: true }); climbed = parent.locator('..').locator('..');`  
`scope = climbed.locator('ul.menu');`  
`locator = scope.locator('li', { hasText: 'Users' }).nth(2);`

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
{ "run": "genCPF" }
```

```json
{ "run": "nowISO" }
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
{ "screenshot": { "path": "shots/card-{__index}.png" } }
```

---

## 🧪 Complete example: forEach + nth + first/last override

```json
{
  "describe": {
    "text": "Catalog",

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

**Mapping of the first block**:

- `context.nth:0` → any locator built without explicit index will use `.nth(0)`
- `{"last": true, "click": ...}` → overrides to `.last()` only for that action
- `{"nth": 4, ...}` → overrides to `.nth(4)` only for that action
- `{"first": true, ...}` → overrides to `.first()` only for that action

---

## ✅ Quick tips

- Prefer robust selectors (data-testid, stable IDs).
- Use `before` to sign-in/seed state.
- Keep cases short; reuse actions through JSON building blocks.
- Mock flaky APIs with `route` for deterministic runs.

---

If you want, I can **merge this reference** back into your main README and export a single English file.
