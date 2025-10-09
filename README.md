# 🎭 playwright-plugin-web-from-json

[![Npm package weekly downloads](https://badgen.net/npm/dw/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

[![Npm package weekly downloads](https://badgen.net/npm/dm/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

[![Npm package weekly downloads](https://badgen.net/npm/dy/playwright-plugin-web-from-json)](https://npmjs.com/package/playwright-plugin-web-from-json)

> Runner features this README assumes (as per your code):
>
> - One **suite per JSON file** (scanned from a directory), `describe.serial(...)` per file.
> - One **`context/page` per suite** (`beforeAll/afterAll`).
> - Case-level `url` handling: omit (stay), empty string (open `baseURL`), relative (resolve vs `baseURL`), absolute (as-is).
> - Action dispatcher supports: `root`, `parent`, `getText`, `type`, `typeSlow`, `click` (incl. `{type}`), `hover`, `press`, `check`, `uncheck`,
>   `select`, `upload`, `expectText`, `expectVisible`, `expectUrl`, `waitRequest` (Playwright-native), `wait`, `screenshot`.
> - Disambiguation/scope: `nth`, `first`, `last`, `within`, `frame` (array allowed for nested iframes).
> - `before` chaining accepted on `describe` (string or list).

---

## Installation

```bash
npm init playwright
npm i playwright-plugin-web-from-json
npx playwright install
```

### Quick Start spec

```ts
import { test } from "@playwright/test";
import { generateTestsFromJson } from "playwright-plugin-web-from-json";
import path from "path";

generateTestsFromJson({ dir: path.resolve(process.cwd(), "Fixtures") }, test);
```

---

## JSON file anatomy

```jsonc
{
  "describe": {
    "text": "Suite name (optional)",
    "before": ["./00-login.json", "./01-seed.json"], // optional: prepend cases from other JSONs
    "case-key": {
      "title": "Case title (optional)",
      "url": "/relative-or-https://absolute (optional)",
      "context": {
        "nth": 0,
        "first": false,
        "last": false,
        "within": ".container",
        "frame": ["#outer-frame", "#inner-frame"]
      },
      "actions": [
        /* see below */
      ]
    }
  }
}
```

**Targeting rules**:

- `"tag > text"` → `locator(tag, { hasText: text })`
- CSS selector string → `locator(selector)`
- Otherwise plain text → `getByText(text, { exact: true })`
- Index defaults to `.first()` unless `nth/first/last` is provided.

---

# 1) Mini cookbook — single-action examples (with Playwright refs)

### Clicks

```jsonc
{ "click": "#save" }
// ref await page.locator('#save').first().click()

{ "click": "Login" }
// ref await page.getByText('Login', { exact: true }).first().click()

{ "click": "a > Writing tests" }
// ref await page.locator('a', { hasText: 'Writing tests' }).first().click()
```

### Typing

```jsonc
{ "loc": "#email", "type": "faker.internet.email()" }
// ref await page.locator('#email').fill(faker.internet.email())

{ "loc": "#name", "typeSlow": "John Doe" }
// ref await page.locator('#name').fill(''); await page.locator('#name').pressSequentially('John Doe', { delay: 300 })
```

### Expect text

```jsonc
{ "expectText": { "equals": "Welcome!" }, "loc": "h1" }
// ref await expect(page.locator('h1')).toHaveText('Welcome!')

{ "expectText": { "contains": "orders" } }
// ref await expect(page.locator('body')).toContainText('orders')
```

### Expect visible

```jsonc
{ "expectVisible": "#toast" }
// ref await expect(page.locator('#toast')).toBeVisible()

{ "expectVisible": { "timeout": 5000 }, "loc": ".ok" }
// ref await expect(page.locator('.ok')).toBeVisible({ timeout: 5000 })
```

### URL

```jsonc
{ "expectUrl": { "equals": "https://app.example.com" } }
// ref await expect(page).toHaveURL('https://app.example.com')

{ "expectUrl": { "contains": "#/dashboard" } }
// ref await expect(page).toHaveURL(/#\/dashboard/)
```

### Network wait

```jsonc
{ "waitRequest": { "urlIncludes": "/posts", "status": 200, "timeout": 30000 } }
// ref await page.waitForResponse(r => r.url().includes('/posts') && r.status() === 200, { timeout: 30000 })
```

---

# 2) MANY complete JSON files you can copy–paste

Below are **20 full JSON suites** (each you can save to `Fixtures/*.json`).  
They cover navigation, text/selector clicks, scoping, frames, forms, network, screenshots, and chaining.

---

## EX-01 — Basic navigation & URL

```jsonc
{
  "describe": {
    "text": "Basic navigation & URL",
    "open": {
      "title": "Open baseURL",
      "url": "",
      "actions": [{ "expectVisible": "h2 > Navigation & URL" }]
    },
    "hash-route": {
      "title": "Hash routing to #/dashboard",
      "actions": [
        { "click": "#go-dashboard" },
        { "expectUrl": { "contains": "#/dashboard" } }
      ]
    }
  }
}
```

---

## EX-02 — Click by text, then assert text

```jsonc
{
  "describe": {
    "text": "Clicks & Text",
    "case": {
      "url": "",
      "actions": [
        { "click": "Click by exact text" },
        { "expectText": { "equals": "Clicked by text" }, "loc": "#text-result" }
      ]
    }
  }
}
```

---

## EX-03 — Slow & fast typing, summary panel becomes visible

```jsonc
{
  "describe": {
    "text": "Typing demo",
    "fill": {
      "url": "",
      "actions": [
        { "loc": "#email", "type": "faker.internet.email()" },
        { "loc": "#name", "type": "faker.person.fullName()" },
        { "loc": "#pass", "typeSlow": "SuperSecret123" },
        { "click": "#btn-show-typed" },
        { "expectVisible": "#typed-output" },
        { "expectText": { "contains": "email=" }, "loc": "#typed-output" }
      ]
    }
  }
}
```

---

## EX-04 — Press key on field and assert output

```jsonc
{
  "describe": {
    "text": "Press keys",
    "enter": {
      "url": "",
      "actions": [
        { "loc": "#press-input", "type": "Hello world" },
        { "press": "Enter", "loc": "#press-input" },
        { "expectText": { "equals": "Enter pressed!" }, "loc": "#press-output" }
      ]
    }
  }
}
```

---

## EX-05 — Check, radio, select, read values

```jsonc
{
  "describe": {
    "text": "Forms",
    "form": {
      "url": "",
      "actions": [
        { "check": "#ck-terms" },
        { "check": "input[name='plan'][value='pro']" },
        { "select": { "label": "Brazil" }, "loc": "#country" },
        { "click": "#check-read" },
        { "expectText": { "contains": "terms=true" }, "loc": "#check-output" },
        { "expectText": { "contains": "plan=pro" }, "loc": "#check-output" }
      ]
    }
  }
}
```

---

## EX-06 — Flash message visible & then closed

```jsonc
{
  "describe": {
    "text": "Flash",
    "flash": {
      "url": "",
      "actions": [
        { "expectVisible": "#flash" },
        {
          "expectText": { "contains": "Your username is invalid!" },
          "loc": "#flash"
        },
        { "click": "#close-flash" }
      ]
    }
  }
}
```

---

## EX-07 — Multiple matches: nth inside scope

```jsonc
{
  "describe": {
    "text": "Disambiguation: nth",
    "nth": {
      "url": "",
      "actions": [
        { "click": ".item", "within": "#repeat-scope", "nth": 1 },
        {
          "expectText": { "equals": "Clicked: Row #2" },
          "loc": "#repeat-output"
        }
      ]
    }
  }
}
```

---

## EX-08 — Multiple matches: first & last

```jsonc
{
  "describe": {
    "text": "Disambiguation: first & last",
    "first-last": {
      "url": "",
      "actions": [
        { "click": ".item", "within": "#repeat-scope", "first": true },
        {
          "expectText": { "equals": "Clicked: Row #1" },
          "loc": "#repeat-output"
        },
        { "click": ".item", "within": "#repeat-scope", "last": true },
        {
          "expectText": { "equals": "Clicked: Row #3" },
          "loc": "#repeat-output"
        }
      ]
    }
  }
}
```

---

## EX-09 — Scoped click within container

```jsonc
{
  "describe": {
    "text": "Within scope",
    "scoped": {
      "url": "",
      "actions": [
        { "click": "Scoped Button B", "within": "#within-scope" },
        {
          "expectText": { "equals": "Within clicked: Scoped Button B" },
          "loc": "#within-output"
        }
      ]
    }
  }
}
```

---

## EX-10 — Iframe basic + expect visible inside frame

```jsonc
{
  "describe": {
    "text": "Iframe",
    "frame": {
      "url": "",
      "actions": [
        { "click": "#frame-btn", "frame": "#demo-frame" },
        { "expectVisible": "#frame-toast", "frame": "#demo-frame" }
      ]
    }
  }
}
```

---

## EX-11 — Network waitRequest (200) then text appears

```jsonc
{
  "describe": {
    "text": "Network",
    "posts": {
      "url": "",
      "actions": [
        { "click": "#btn-fetch-posts" },
        {
          "waitRequest": {
            "urlIncludes": "/posts",
            "status": 200,
            "timeout": 50000
          }
        },
        { "expectText": { "contains": "status 200" }, "loc": "#net-output" }
      ]
    }
  }
}
```

---

## EX-12 — Network waitRequest with multiple URL fragments & status list

```jsonc
{
  "describe": {
    "text": "Network variants",
    "user-or-summary": {
      "url": "",
      "actions": [
        { "click": "#btn-fetch-user" },
        {
          "waitRequest": {
            "urlIncludes": ["/users/1", "/users/"],
            "status": [200, 204],
            "timeout": 40000
          }
        },
        { "expectText": { "contains": "status 200" }, "loc": "#net-output" }
      ]
    }
  }
}
```

---

## EX-13 — Screenshot full page and element

```jsonc
{
  "describe": {
    "text": "Screenshots",
    "shots": {
      "url": "",
      "actions": [
        { "screenshot": { "path": "screens/full.png", "fullPage": true } },
        {
          "screenshot": { "path": "screens/card.png" },
          "loc": "#card-screenshot"
        }
      ]
    }
  }
}
```

---

## EX-14 — Hover tooltip becomes visible

```jsonc
{
  "describe": {
    "text": "Hover",
    "tip": {
      "url": "",
      "actions": [{ "hover": "Hover me" }, { "expectVisible": "#hover-tip" }]
    }
  }
}
```

---

## EX-15 — Use `parent` to climb and click a child

```jsonc
{
  "describe": {
    "text": "Parent targeting",
    "parent": {
      "url": "",
      "actions": [
        {
          "parent": "Clicks & Visibility",
          "click": "button > Make toast visible"
        },
        { "expectVisible": "#selector-result" }
      ]
    }
  }
}
```

---

## EX-16 — Use `root` to scope a block

```jsonc
{
  "describe": {
    "text": "Root scoping",
    "root-scope": {
      "url": "",
      "actions": [
        {
          "root": ".card:has(h2:has-text(\"Clicks & Visibility\"))",
          "click": "#btn-selector"
        },
        { "expectVisible": "#selector-result" }
      ]
    }
  }
}
```

---

## EX-17 — `getText`, log and reuse mentally

```jsonc
{
  "describe": {
    "text": "getText",
    "read": {
      "url": "",
      "actions": [
        { "getText": "h2 > Typing & Keys" },
        { "click": "#btn-show-typed" } // nothing uses the text programmatically, but it logs it
      ]
    }
  }
}
```

---

## EX-18 — Press without locator (page-level keyboard)

```jsonc
{
  "describe": {
    "text": "Global press",
    "keyboard": {
      "url": "",
      "actions": [{ "press": "Control+A" }, { "wait": 200 }]
    }
  }
}
```

---

## EX-19 — Select by different strategies

```jsonc
{
  "describe": {
    "text": "Select strategies",
    "select": {
      "url": "",
      "actions": [
        { "select": { "index": 1 }, "loc": "#country" },
        { "select": { "label": "United States" }, "loc": "#country" },
        { "select": { "value": "DE" }, "loc": "#country" }
      ]
    }
  }
}
```

---

## EX-20 — Upload one and multiple files

```jsonc
{
  "describe": {
    "text": "Uploads",
    "upload": {
      "url": "",
      "actions": [
        { "upload": "tests/fixtures/avatar.png", "loc": "input[type=file]" },
        { "upload": ["tests/a.png", "tests/b.png"], "loc": "#file" }
      ]
    }
  }
}
```

---

# 3) Before chaining (reuse steps across suites)

```jsonc
{
  "describe": {
    "text": "Main flow reusing hooks",
    "before": ["./00-login.json", "./01-select-tenant.json"],
    "do-stuff": {
      "title": "Open dashboard and check a tile",
      "url": "/dashboard",
      "actions": [
        { "expectVisible": "h2 > Dashboard" },
        { "click": "a > Settings" },
        { "expectVisible": "h1 > Settings" }
      ]
    }
  }
}
```

---

## Troubleshooting tips

- **Multiple matches** → use `within` + `nth/first/last`.
- **Hidden element on click** → runner retries with `{ force: true }`, but you should consider `expectVisible` first.
- **Relative URL without baseURL** → set `use.baseURL` in Playwright config or supply `baseURLOverride` in `generateTestsFromJson`.
- **`waitRequest` never resolves** → check `urlIncludes` array and status code(s); verify CORS/HTTPS in your environment.
- **Iframes** → for nested iframes use `frame: ["#outer", "#inner"]`.

---

MIT
