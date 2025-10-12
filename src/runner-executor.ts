// runner-executor.ts
import type {
  BrowserContext,
  FrameLocator,
  Locator,
  Page,
} from "@playwright/test";
import { resolveCasesChain } from "./json-loader";
import { isSelector, resolveDynamic } from "./util";
import { LocatorContext, TestCase } from "./types";
import { handleWaitRequest } from "./handleWaitRequest";

import * as fs from "fs";
import * as path from "path";

type ExecOpts = {
  baseURLOverride?: string;
  /** Optional path to a file that exports class RunPluginFunctions */
  functionsPath?: string;
};

/* --------------------- Dynamic function loader ----------------------
   Loads user's class RunPluginFunctions so we can call case/action "run".
------------------------------------------------------------------------ */
type FunctionsCtor = new () => any;
async function loadRunFunctions(
  functionsPath?: string
): Promise<any | undefined> {
  const projectRoot = process.env.INIT_CWD || process.cwd();
  const fixturesDir = path.resolve(projectRoot, "help");

  const candidates = functionsPath
    ? [functionsPath]
    : [`${fixturesDir}/plugin-func.ts`, `${fixturesDir}/plugin-func.js`];
  for (const p of candidates) {
    try {
      // @ts-ignore dynamic path
      const mod = await import(/* @vite-ignore */ p);
      const Ctor: FunctionsCtor | undefined =
        mod?.RunPluginFunctions ??
        mod?.default?.RunPluginFunctions ??
        mod?.default;
      if (Ctor) return new Ctor();
    } catch {
      // try next candidate silently
    }
  }
  return undefined;
}

/* ------------------------- Interpolation -----------------------------
   Replaces tokens like {resultFunc} or {resultFunc.email} anywhere.
------------------------------------------------------------------------ */
function getByPath(obj: any, path: string) {
  if (!path) return obj;
  return path
    .split(".")
    .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}
function interpolateTokens(str: unknown, bag: Record<string, any>) {
  if (typeof str !== "string") return str as any;
  return str.replace(/\{([\w.$-]+)\}/g, (_, token) => {
    const [top, ...rest] = token.split(".");
    if (!(top in bag)) return `{${token}}`;
    const val = rest.length ? getByPath(bag[top], rest.join(".")) : bag[top];
    return val == null ? "" : String(val);
  });
}

/* ----------------------------- Main ---------------------------------- */
/**
 * Builds a serial describe() suite from a JSON file and wires each case to Playwright.
 * One browser context and page are reused per file (beforeAll/afterAll).
 */
export function createDescribeForFile(
  filePath: string,
  testRef: typeof import("@playwright/test").test,
  opts?: ExecOpts
) {
  const { describeText, cases } = resolveCasesChain(filePath);
  const expect = testRef.expect;

  testRef.describe.serial(describeText, () => {
    let context: BrowserContext;
    let page: Page;
    let pluginFns: any; // Instance of RunPluginFunctions (if found)

    testRef.beforeAll(async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      pluginFns = await loadRunFunctions(opts?.functionsPath);
    });

    testRef.afterAll(async () => {
      await page?.close();
      await context?.close();
    });

    for (const [caseKey, rawCase] of cases) {
      const value: TestCase & { run?: string } = (rawCase ?? {}) as any;
      if (!value.title || typeof value.title !== "string") {
        value.title = `Tests in feature ${caseKey}`;
      }

      testRef(value.title, async ({ baseURL }) => {
        // Per-case variable bag. Persist across actions of this case.
        const vars: Record<string, any> = {};

        // ---- Case-level "run" (before URL resolution) ----
        if (typeof (value as any).run === "string") {
          if (!pluginFns) {
            throw new Error(
              `Case "${value.title}" uses "run" but RunPluginFunctions was not found. ` +
                `Create help/plugin-fns.ts exporting class RunPluginFunctions, or pass opts.functionsPath.`
            );
          }
          const fnName = (value as any).run.trim();
          const fn = pluginFns[fnName];
          if (typeof fn !== "function") {
            throw new Error(
              `RunPluginFunctions does not have a method "${fnName}"`
            );
          }
          const out = fn.call(pluginFns);
          vars.resultFunc =
            out && typeof out.then === "function" ? await out : out;
        }

        // ---- Navigate if case defines "url" (supports "", relative, absolute). ----
        if (value.url !== undefined) {
          const rawUrl = interpolateTokens(value.url ?? "", vars) as string;
          const trimmed = rawUrl.trim();
          const effectiveBase = opts?.baseURLOverride ?? baseURL;
          let targetUrl: string;
          if (!trimmed) {
            if (!effectiveBase) {
              throw new Error(
                `No baseURL to open when url is empty in "${value.title}".`
              );
            }
            targetUrl = effectiveBase;
          } else if (trimmed.startsWith("http")) {
            targetUrl = trimmed;
          } else {
            if (!effectiveBase) {
              throw new Error(
                `Relative url "${trimmed}" without baseURL in "${value.title}".`
              );
            }
            targetUrl = new URL(trimmed, effectiveBase).toString();
          }
          await page.goto(targetUrl);
        }

        if (!value.actions?.length) {
          console.warn(`⚠️ Test "${value.title}" has no actions — skipping.`);
          return;
        }

        // Per-test transient scratchpad.
        const actionLocalContext: {
          lastTypedText?: string; // used by click "{type}" and "<prefix> {type}"
          lastGetText?: string; // optional capture
        } = {};

        for (const [index, actionRaw] of value.actions.entries()) {
          // Interpolate string fields in the raw action on-the-fly
          const action = interpolateAction(actionRaw, vars);

          /**
           * 1) Build the unified scope for this action:
           *    frame(s)/iframe(s) → root → parent(+index climbs) → within
           */
          const scope = await buildScope(page, action, value.context);

          /**
           * 2) Locator factories:
           *    - makeLocator: respects index strategy (nth/first/last)
           *    - makeLocatorUnindexed: ignores index (used by "exist" gate)
           */
          const makeLocator = (raw: string): Locator =>
            makeLocatorFromScope(scope, raw, action, value.context);

          const makeLocatorUnindexed = (raw: string): Locator =>
            makeLocatorFromScope(scope, raw, undefined, undefined, true);

          /**
           * 3) ACTION-LEVEL "run"
           *    Executes user function and stores output in vars.resultFunc.
           */
          if ((action as any).run) {
            if (!pluginFns) {
              throw new Error(
                `Action ${index + 1} in "${
                  value.title
                }" uses "run" but RunPluginFunctions was not found. ` +
                  `Create Fixtures/plugin-fns.ts exporting class RunPluginFunctions, or pass opts.functionsPath.`
              );
            }
            const fnName = String((action as any).run).trim();
            const fn = pluginFns[fnName];
            if (typeof fn !== "function") {
              throw new Error(
                `RunPluginFunctions does not have a method "${fnName}"`
              );
            }
            const out = fn.call(pluginFns);
            vars.resultFunc =
              out && typeof out.then === "function" ? await out : out;
            continue; // this action is only "run"
          }

          /**
           * 4) EXIST gate — soft existence check.
           *    If NOT found → log and skip the rest of THIS action object (continue to next action).
           *    If found → proceed with the rest of this action object normally.
           */
          if ((action as any).exist) {
            const raw = String((action as any).exist).trim();
            const base = makeLocatorUnindexed(raw);
            let found = false;
            try {
              found = (await base.count()) > 0;
            } catch {
              found = false;
            }
            if (!found) {
              const kind = isSelector(raw) ? "selector" : "text";
              console.log(`${kind} not exist [${raw}]`);
              continue; // skip remaining handlers in this action object
            }
            // If exists, fall through and execute the rest of this action normally.
          }

          // === GET TEXT ===
          if ((action as any).getText) {
            const raw = String((action as any).getText).trim();
            const loc = makeLocator(raw);
            const text = await loc.textContent();
            console.log(`[getText] "${raw}" =>`, text);
            actionLocalContext.lastGetText = text ?? undefined;
          }

          // === TYPE SLOW (pressSequentially) ===
          if (typeof (action as any).typeSlow === "string") {
            const text = await resolveDynamic((action as any).typeSlow);
            const targetRaw =
              (action as any).loc ??
              (isSelector((action as any).click ?? "")
                ? (action as any).click!
                : undefined);
            if (!targetRaw) {
              throw new Error(
                `Action ${index + 1} in "${
                  value.title
                }" needs a target for typeSlow.`
              );
            }
            const loc = makeLocator(targetRaw);
            await loc.fill("");
            await loc.pressSequentially(text, { delay: 300 });
            actionLocalContext.lastTypedText = text;
          }
          // === TYPE FAST (fill) ===
          else if (typeof (action as any).type === "string") {
            const text = await resolveDynamic((action as any).type);
            const targetRaw =
              (action as any).loc ??
              (isSelector((action as any).click ?? "")
                ? (action as any).click!
                : undefined);
            if (!targetRaw) {
              throw new Error(
                `Action ${index + 1} in "${
                  value.title
                }" needs a target for type.`
              );
            }
            const loc = makeLocator(targetRaw);
            await loc.fill(text);
            actionLocalContext.lastTypedText = text;
          }

          // === CLICK ===
          if ((action as any).click) {
            const c = String((action as any).click).trim();
            const typed = actionLocalContext.lastTypedText;

            // Pattern: "<prefix> {type}" — click descendant showing lastTypedText under <prefix>.
            const m = c.match(/^(.*?)\s*\{type\}$/);
            if (m) {
              const prefix = m[1].trim();
              if (!typed) {
                throw new Error(
                  `Action ${index + 1} in "${
                    value.title
                  }" used click "${c}" but no prior typed text.`
                );
              }
              if (prefix) {
                // Use :has-text on descendants of <prefix>
                let locator = makeLocator(`${prefix} *:has-text("${typed}")`);
                try {
                  await locator.click();
                } catch {}
              } else {
                // Pure text click using last typed text
                let locator = makeLocator(typed);
                try {
                  await locator.click();
                } catch {}
              }
            }
            // Pattern: "{type}" — click element showing lastTypedText.
            else if (c === "{type}") {
              if (!typed) {
                throw new Error(
                  `Action ${index + 1} in "${
                    value.title
                  }" used click "{type}" but no prior typed text.`
                );
              }
              let locator = makeLocator(typed);
              try {
                await locator.click();
              } catch {}
            }
            // Standard click: CSS/XPath selector, "tag > text", or exact text.
            else {
              let locator = makeLocator(c);
              try {
                await locator.click();
              } catch {}
            }
          }

          // === HOVER ===
          if ((action as any).hover) {
            const loc = makeLocator(String((action as any).hover).trim());
            await loc.hover();
          }

          // === PRESS (locator or page keyboard) ===
          if ((action as any).press) {
            if ((action as any).loc) {
              const loc = makeLocator((action as any).loc);
              await loc.press((action as any).press);
            } else if (
              (action as any).click &&
              isSelector((action as any).click)
            ) {
              const loc = makeLocator((action as any).click);
              await loc.press((action as any).press);
            } else {
              await page.keyboard.press((action as any).press);
            }
          }

          // === CHECK / UNCHECK ===
          if ((action as any).check !== undefined) {
            await handleCheckLikeScoped(
              scope,
              page,
              (action as any).check,
              true,
              action,
              value.context
            );
          }
          if ((action as any).uncheck !== undefined) {
            await handleCheckLikeScoped(
              scope,
              page,
              (action as any).uncheck,
              false,
              action,
              value.context
            );
          }

          // === SELECT ===
          if ((action as any).select) {
            const rawTarget =
              (action as any).loc ??
              (isSelector((action as any).click ?? "")
                ? (action as any).click!
                : undefined);
            if (!rawTarget) {
              throw new Error(
                `select needs 'loc' or 'click' (selector) in "${value.title}".`
              );
            }
            const loc = makeLocator(rawTarget);
            const sel = (action as any).select;
            if ("value" in sel) await loc.selectOption(sel.value as any);
            else if ("label" in sel) await loc.selectOption(sel.label as any);
            else if ("index" in sel) await loc.selectOption(sel.index as any);
          }

          // === UPLOAD ===
          if ((action as any).upload) {
            const rawTarget =
              (action as any).loc ??
              (isSelector((action as any).click ?? "")
                ? (action as any).click!
                : undefined);
            if (!rawTarget) {
              throw new Error(
                `upload needs 'loc' or 'click' (selector) in "${value.title}".`
              );
            }
            const loc = makeLocator(rawTarget);
            await loc.setInputFiles((action as any).upload as any);
          }

          // === EXPECT TEXT (with or without target) ===
          if ((action as any).expectText !== undefined) {
            const rawTarget =
              (action as any).loc ??
              (isSelector((action as any).click ?? "")
                ? (action as any).click!
                : undefined);
            const et = (action as any).expectText as {
              equals?: any;
              contains?: any;
              timeout?: number;
            };
            if (
              !et ||
              typeof et !== "object" ||
              (et.equals === undefined && et.contains === undefined)
            ) {
              throw new Error(
                `expectText needs one of: { equals | contains } in "${value.title}".`
              );
            }
            // interpolate expected text too
            if (typeof et.equals === "string")
              et.equals = interpolateTokens(et.equals, vars);
            if (typeof et.contains === "string")
              et.contains = interpolateTokens(et.contains, vars);

            const loc = rawTarget ? makeLocator(rawTarget) : undefined;
            if (loc) {
              if (et.equals !== undefined) {
                await expect(loc).toHaveText(et.equals as any, {
                  timeout: et.timeout,
                });
              } else {
                await expect(loc).toContainText(et.contains as any, {
                  timeout: et.timeout,
                });
              }
            } else {
              if (et.equals !== undefined) {
                await expect(
                  page.getByText(et.equals as any, { exact: true })
                ).toBeVisible({ timeout: et.timeout });
              } else {
                await expect(page.locator("body")).toContainText(
                  et.contains as any,
                  { timeout: et.timeout }
                );
              }
            }
          }

          // === EXPECT VISIBLE ===
          if ("expectVisible" in (action as any)) {
            let rawTarget: string | undefined;
            let to: number | undefined;
            if (typeof (action as any).expectVisible === "string") {
              rawTarget = (action as any).expectVisible;
              to = (action as any).timeout;
            } else if (
              (action as any).expectVisible &&
              typeof (action as any).expectVisible === "object"
            ) {
              rawTarget =
                (action as any).loc ??
                (isSelector((action as any).click ?? "")
                  ? (action as any).click!
                  : undefined);
              to =
                (action as any).expectVisible.timeout ??
                (action as any).timeout;
            }
            if (!rawTarget) {
              throw new Error(
                `expectVisible needs a target: use string or object form with loc/click.`
              );
            }
            const loc = makeLocator(rawTarget);
            await expect(loc).toBeVisible({ timeout: to });
          }

          // === EXPECT URL (equals or contains) ===
          if ((action as any).expectUrl) {
            // Also interpolate URL expectation if string
            if (typeof (action as any).expectUrl.equals === "string") {
              (action as any).expectUrl.equals = interpolateTokens(
                (action as any).expectUrl.equals,
                vars
              );
            }
            if (typeof (action as any).expectUrl.contains === "string") {
              (action as any).expectUrl.contains = interpolateTokens(
                (action as any).expectUrl.contains,
                vars
              );
            }
            if ((action as any).expectUrl.equals !== undefined) {
              await expect(page).toHaveURL(
                (action as any).expectUrl.equals as any,
                {
                  timeout: (action as any).expectUrl.timeout,
                }
              );
            } else {
              await expect(page).toHaveURL(
                new RegExp(escapeRegex((action as any).expectUrl.contains!)),
                { timeout: (action as any).expectUrl.timeout }
              );
            }
          }

          // === WAIT NETWORK RESPONSE ===
          if ((action as any).waitRequest) {
            await handleWaitRequest(page, (action as any).waitRequest);
          }

          // === WAIT TIMEOUT (ms) ===
          if ((action as any).wait) {
            await page.waitForTimeout((action as any).wait);
          }

          // === SCREENSHOT (page or target) ===
          if ((action as any).screenshot) {
            // interpolate path
            if (typeof (action as any).screenshot.path === "string") {
              (action as any).screenshot.path = interpolateTokens(
                (action as any).screenshot.path,
                vars
              );
            }
            const rawTarget =
              (action as any).loc ??
              (isSelector((action as any).click ?? "")
                ? (action as any).click!
                : undefined);
            const loc = rawTarget ? makeLocator(rawTarget) : undefined;
            if (loc) {
              await loc.screenshot({
                path: (action as any).screenshot.path,
                omitBackground: false,
              });
            } else {
              await page.screenshot({
                path: (action as any).screenshot.path,
                fullPage: !!(action as any).screenshot.fullPage,
              });
            }
          }
        }
      });
    }
  });
}

/* ===================== Helpers ===================== */

/** Splits "tag > text" into { tag, text } or returns null. */
function splitTagTextPattern(
  input: string
): { tag: string; text: string } | null {
  if (!input.includes(">")) return null;
  const [tagRaw, textRaw] = input.split(">").map((s) => s.trim());
  if (!tagRaw || !textRaw) return null;
  return { tag: tagRaw.toLowerCase(), text: textRaw };
}

/**
 * Applies index strategy using action-level overrides first, then case-level:
 * - If `nth` is set, it cannot be combined with `first`/`last`.
 * - Else `last`, else `first`, else default to `.first()`.
 */
function applyIndex(
  loc: Locator,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  const nth = actionCtx?.nth ?? caseCtx?.nth;
  const first = actionCtx?.first ?? caseCtx?.first;
  const last = actionCtx?.last ?? caseCtx?.last;

  if (typeof nth === "number" && (first || last)) {
    throw new Error(
      `Invalid index config: 'nth' cannot be combined with 'first' or 'last'.`
    );
  }
  if (typeof nth === "number") return loc.nth(nth);
  if (last) return loc.last();
  if (first) return loc.first();
  return loc.first(); // default
}

/**
 * Builds the action scope by chaining:
 *  frame(s)/iframe(s) → root → parent(+index climbs) → within
 *
 * - frame/iframe: string | string[] → scope.frameLocator(...)
 * - root: selector relative to current scope
 * - parent: selector OR exact text → resolve, then climb via locator("..") "index" times (default 1)
 * - within: additional narrowing selector on the final scope
 */
async function buildScope(
  page: Page,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
): Promise<Page | FrameLocator | Locator> {
  const frameSel =
    (actionCtx as any)?.frame ??
    (actionCtx as any)?.iframe ??
    (caseCtx as any)?.frame ??
    (caseCtx as any)?.iframe;

  const rootSel = (actionCtx as any)?.root ?? undefined;
  const parentSel = (actionCtx as any)?.parent ?? undefined;
  const parentIndexUp = (actionCtx as any)?.index; // number of ".." climbs
  const withinSel = (actionCtx as any)?.within ?? (caseCtx as any)?.within;

  let scope: Page | FrameLocator | Locator = page;

  // 1) frame(s)/iframe(s)
  const chain = Array.isArray(frameSel) ? frameSel : frameSel ? [frameSel] : [];
  for (const sel of chain) {
    // @ts-ignore
    scope = (scope as any).frameLocator(sel);
  }

  // 2) root
  if (rootSel) {
    // @ts-ignore
    scope = (scope as any).locator(rootSel);
  }

  // 3) parent (+index climbs)
  if (parentSel) {
    let parentLocator: Locator;
    if (isSelector(parentSel)) {
      // @ts-ignore
      parentLocator = (scope as any).locator(parentSel);
    } else {
      // By text (exact)
      // @ts-ignore
      parentLocator = (scope as any).getByText(String(parentSel), {
        exact: true,
      });
    }

    const exists = (await parentLocator.count()) > 0;
    if (!exists) {
      throw new Error(`parent not found: ${String(parentSel)}`);
    }

    const up =
      typeof parentIndexUp === "number" && parentIndexUp >= 1
        ? Math.floor(parentIndexUp)
        : 1;

    let climbed: Locator = parentLocator;
    for (let i = 0; i < up; i++) {
      climbed = climbed.locator("..");
    }
    // @ts-ignore
    scope = climbed;
  }

  // 4) within
  if (withinSel) {
    // @ts-ignore
    scope = (scope as any).locator(withinSel);
  }

  return scope;
}

/**
 * Creates a locator from the given scope and raw target string.
 * Supports:
 *  - "tag > text" → scope.locator(tag, { hasText: text })
 *  - selector → scope.locator(selector)
 *  - exact text → scope.getByText(text, { exact: true })
 * Applies index (nth/first/last) unless `unindexed` = true.
 */
function makeLocatorFromScope(
  scope: Page | FrameLocator | Locator,
  raw: string,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext,
  unindexed: boolean = false
): Locator {
  const tt = splitTagTextPattern(raw);
  let loc: Locator;
  if (tt) {
    // @ts-ignore
    loc = (scope as any).locator(tt.tag, { hasText: tt.text });
  } else if (isSelector(raw)) {
    // @ts-ignore
    loc = (scope as any).locator(raw);
  } else {
    // @ts-ignore
    loc = (scope as any).getByText(raw, { exact: true });
  }
  return unindexed ? (loc as Locator) : applyIndex(loc, actionCtx, caseCtx);
}

/**
 * Scoping-aware helper for check/uncheck.
 * Accepts:
 *  - string
 *  - { loc: string }
 *  - true (legacy resolution via action/case's loc or click when selector)
 */
async function handleCheckLikeScoped(
  scope: Page | FrameLocator | Locator,
  page: Page,
  raw: string | { loc: string } | true | undefined,
  makeChecked: boolean,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  let targetRaw: string | undefined;
  if (typeof raw === "string") {
    targetRaw = raw;
  } else if (raw && typeof raw === "object" && "loc" in raw) {
    targetRaw = raw.loc;
  }
  if (!targetRaw) {
    const legacy = (ctx?: { loc?: string; click?: string }) => {
      if (ctx?.loc) return ctx.loc;
      if (ctx?.click && isSelector(ctx?.click as any)) return ctx.click as any;
      return undefined;
    };
    targetRaw = legacy(actionCtx as any) ?? legacy(caseCtx as any);
  }
  if (!targetRaw) {
    throw new Error(
      `${
        makeChecked ? "check" : "uncheck"
      } needs a target. Use loc or click selector.`
    );
  }
  const loc = makeLocatorFromScope(scope, targetRaw, actionCtx, caseCtx);
  if (makeChecked) {
    await loc.check();
  } else {
    await loc.uncheck();
  }
}

/** Escapes a string to be used inside a RegExp constructor. */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------------- Interpolate an entire action object -----------------
   Walks the action and interpolates string fields using {resultFunc...}.
------------------------------------------------------------------------ */
function interpolateAction<T extends Record<string, any>>(
  action: T,
  vars: Record<string, any>
): T {
  if (!action || typeof action !== "object") return action;

  // Shallow clone so we don't mutate the original reference
  const out: Record<string, any> = { ...action };

  // List of keys we know to be string or contain strings
  const stringKeys = [
    "exist",
    "getText",
    "click",
    "hover",
    "press",
    "loc",
    "root",
    "parent",
  ];
  const nestedStringKeys = [
    ["expectUrl", "equals"],
    ["expectUrl", "contains"],
    ["expectText", "equals"],
    ["expectText", "contains"],
    ["screenshot", "path"],
    ["select", "value"], // could be string or string[]
    ["select", "label"], // idem
    ["upload"], // could be string or string[]
  ];

  for (const k of stringKeys) {
    if (typeof out[k] === "string") out[k] = interpolateTokens(out[k], vars);
  }

  // type / typeSlow can be dynamic via resolveDynamic, but still interpolate first
  for (const k of ["type", "typeSlow"]) {
    if (typeof out[k] === "string") out[k] = interpolateTokens(out[k], vars);
  }

  for (const path of nestedStringKeys) {
    const [a, b] = path;
    if (out[a] && typeof out[a] === "object" && typeof out[a][b] === "string") {
      out[a] = { ...out[a], [b]: interpolateTokens(out[a][b], vars) };
    } else if (a === "upload" && typeof out[a] === "string") {
      out[a] = interpolateTokens(out[a], vars);
    } else if (a === "select" && out[a] && typeof out[a] === "object") {
      // value/label may be string|string[]
      if (typeof out[a].value === "string")
        out[a].value = interpolateTokens(out[a].value, vars);
      if (Array.isArray(out[a].value))
        out[a].value = out[a].value.map((v: any) =>
          typeof v === "string" ? interpolateTokens(v, vars) : v
        );
      if (typeof out[a].label === "string")
        out[a].label = interpolateTokens(out[a].label, vars);
      if (Array.isArray(out[a].label))
        out[a].label = out[a].label.map((v: any) =>
          typeof v === "string" ? interpolateTokens(v, vars) : v
        );
    }
  }

  return out as T;
}
