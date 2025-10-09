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

type ExecOpts = { baseURLOverride?: string };

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

    testRef.beforeAll(async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
    });

    testRef.afterAll(async () => {
      await page?.close();
      await context?.close();
    });

    for (const [caseName, rawCase] of cases) {
      const value: TestCase = rawCase ?? {};
      if (!value.title || typeof value.title !== "string") {
        value.title = `Tests in feature ${caseName}`;
      }

      testRef(value.title, async ({ baseURL }) => {
        // Navegar se houver URL definida
        if (value.url !== undefined) {
          const trimmed = (value.url ?? "").trim();
          const effectiveBase = opts?.baseURLOverride ?? baseURL;
          let targetUrl: string;
          if (!trimmed) {
            if (!effectiveBase)
              throw new Error(
                `No baseURL to open when url is empty in "${value.title}".`
              );
            targetUrl = effectiveBase;
          } else if (trimmed.startsWith("http")) {
            targetUrl = trimmed;
          } else {
            if (!effectiveBase)
              throw new Error(
                `Relative url "${trimmed}" without baseURL in "${value.title}".`
              );
            targetUrl = new URL(trimmed, effectiveBase).toString();
          }
          await page.goto(targetUrl);
        }

        if (!value.actions?.length) {
          console.warn(`⚠️ Test "${value.title}" has no actions — skipping.`);
          return;
        }

        const actionLocalContext: {
          lastTypedText?: string;
          lastGetText?: string;
        } = {};

        for (const [index, action] of value.actions.entries()) {
          // === ESCOPAGEM UNIFICADA (frame -> root -> parent -> within) ===
          const scope = buildScope(page, action, value.context);

          // Resolvedor padrão de alvo + índice
          const makeLocator = (raw: string): Locator =>
            makeLocatorFromScope(scope, raw, action, value.context);

          // === GET TEXT ===
          if (action.getText) {
            const raw = action.getText.trim();
            const loc = makeLocator(raw);
            const text = await loc.textContent();
            console.log(`[getText] "${raw}" =>`, text);
            actionLocalContext.lastGetText = text ?? undefined;
          }

          // === TYPE SLOW ===
          if (typeof action.typeSlow === "string") {
            const text = await resolveDynamic(action.typeSlow);
            const targetRaw =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
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
          // === TYPE FAST ===
          else if (typeof action.type === "string") {
            const text = await resolveDynamic(action.type);
            const targetRaw =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
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
          if (action.click) {
            const c = action.click.trim();
            const typed = actionLocalContext.lastTypedText;

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
                // prefix é seletor relativo ao escopo atual
                let locator = makeLocator(`${prefix} *:has-text("${typed}")`);
                try {
                  await locator.click();
                } catch {
                  await locator.click({ force: true });
                }
              } else {
                // texto puro (busca exata) no escopo atual
                let locator = makeLocator(typed);
                try {
                  await locator.click();
                } catch {
                  await locator.click({ force: true });
                }
              }
            } else if (c === "{type}") {
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
              } catch {
                await locator.click({ force: true });
              }
            } else {
              // seletor, tag>text ou texto — sempre com escopo + índice
              let locator = makeLocator(c);
              try {
                await locator.click();
              } catch {
                await locator.click({ force: true });
              }
            }
          }

          // === HOVER ===
          if (action.hover) {
            const loc = makeLocator(action.hover.trim());
            await loc.hover();
          }

          // === PRESS ===
          if (action.press) {
            if (action.loc) {
              const loc = makeLocator(action.loc);
              await loc.press(action.press);
            } else if (action.click && isSelector(action.click)) {
              const loc = makeLocator(action.click);
              await loc.press(action.press);
            } else {
              await page.keyboard.press(action.press);
            }
          }

          // === CHECK / UNCHECK ===
          if (action.check !== undefined) {
            await handleCheckLikeFixed(
              scope,
              page,
              action.check,
              true,
              action,
              value.context
            );
          }
          if (action.uncheck !== undefined) {
            await handleCheckLikeFixed(
              scope,
              page,
              action.uncheck,
              false,
              action,
              value.context
            );
          }

          // === SELECT ===
          if (action.select) {
            const rawTarget =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
            if (!rawTarget) {
              throw new Error(
                `select needs 'loc' or 'click' (selector) in "${value.title}".`
              );
            }
            const loc = makeLocator(rawTarget);
            if ("value" in action.select)
              await loc.selectOption(action.select.value as any);
            else if ("label" in action.select)
              await loc.selectOption(action.select.label as any);
            else if ("index" in action.select)
              await loc.selectOption(action.select.index as any);
          }

          // === UPLOAD ===
          if (action.upload) {
            const rawTarget =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
            if (!rawTarget) {
              throw new Error(
                `upload needs 'loc' or 'click' (selector) in "${value.title}".`
              );
            }
            const loc = makeLocator(rawTarget);
            await loc.setInputFiles(action.upload as any);
          }

          // === EXPECT TEXT ===
          if (action.expectText !== undefined) {
            const rawTarget =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
            const et = action.expectText as {
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
                ).toBeVisible({
                  timeout: et.timeout,
                });
              } else {
                await expect(page.locator("body")).toContainText(
                  et.contains as any,
                  {
                    timeout: et.timeout,
                  }
                );
              }
            }
          }

          // === EXPECT VISIBLE ===
          if ("expectVisible" in action) {
            let rawTarget: string | undefined;
            let to: number | undefined;
            if (typeof action.expectVisible === "string") {
              rawTarget = action.expectVisible;
              to = action.timeout;
            } else if (
              action.expectVisible &&
              typeof action.expectVisible === "object"
            ) {
              rawTarget =
                action.loc ??
                (isSelector(action.click ?? "") ? action.click! : undefined);
              to = (action.expectVisible as any).timeout ?? action.timeout;
            }
            if (!rawTarget) {
              throw new Error(
                `expectVisible needs a target: use string or object form with loc/click.`
              );
            }
            const loc = makeLocator(rawTarget);
            await expect(loc).toBeVisible({ timeout: to });
          }

          // === EXPECT URL ===
          if (action.expectUrl) {
            if (action.expectUrl.equals !== undefined) {
              await expect(page).toHaveURL(action.expectUrl.equals as any, {
                timeout: action.expectUrl.timeout,
              });
            } else {
              await expect(page).toHaveURL(
                new RegExp(escapeRegex(action.expectUrl.contains!)),
                { timeout: action.expectUrl.timeout }
              );
            }
          }

          // === WAIT REQUEST ===
          if (action.waitRequest) {
            await handleWaitRequest(page, action.waitRequest);
          }

          // === WAIT timeout ===
          if (action.wait) {
            await page.waitForTimeout(action.wait);
          }

          // === SCREENSHOT ===
          if (action.screenshot) {
            const rawTarget =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
            const loc = rawTarget ? makeLocator(rawTarget) : undefined;
            if (loc) {
              await loc.screenshot({
                path: action.screenshot.path,
                omitBackground: false,
              });
            } else {
              await page.screenshot({
                path: action.screenshot.path,
                fullPage: !!action.screenshot.fullPage,
              });
            }
          }
        }
      });
    }
  });
}

// ===================== Helpers =====================

function splitTagTextPattern(
  input: string
): { tag: string; text: string } | null {
  if (!input.includes(">")) return null;
  const [tagRaw, textRaw] = input.split(">").map((s) => s.trim());
  if (!tagRaw || !textRaw) return null;
  return { tag: tagRaw.toLowerCase(), text: textRaw };
}

function applyIndex(
  loc: Locator,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  const nth = actionCtx?.nth ?? caseCtx?.nth;
  const first = actionCtx?.first ?? caseCtx?.first;
  const last = actionCtx?.last ?? caseCtx?.last;

  if (typeof nth === "number") return loc.nth(nth);
  if (last) return loc.last();
  if (first || true) return loc.first();
  return loc;
}

// Constrói o escopo combinando frame -> root -> parent -> within
function buildScope(
  page: Page,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
): Page | FrameLocator | Locator {
  const frameSel = actionCtx?.frame ?? caseCtx?.frame;
  const rootSel = (actionCtx as any)?.root ?? undefined;
  const parentSel = (actionCtx as any)?.parent ?? undefined;
  const withinSel = actionCtx?.within ?? caseCtx?.within;

  let scope: Page | FrameLocator | Locator = page;

  // frames (cadeia)
  const chain = Array.isArray(frameSel) ? frameSel : frameSel ? [frameSel] : [];
  for (const sel of chain) {
    // @ts-ignore
    scope = (scope as any).frameLocator(sel);
  }

  // root (seletor relativo ao escopo atual)
  if (rootSel) {
    // @ts-ignore
    scope = (scope as any).locator(rootSel);
  }

  // parent (por seletor ou texto exato) relativo ao escopo atual
  if (parentSel) {
    let parentLocator: Locator;
    if (isSelector(parentSel)) {
      // @ts-ignore
      parentLocator = (scope as any).locator(parentSel);
    } else {
      // @ts-ignore
      parentLocator = (scope as any).getByText(parentSel as string, {
        exact: true,
      });
    }
    // @ts-ignore
    scope = parentLocator.locator("..");
  }

  // within (no final, para que seja relativo ao escopo já reduzido)
  if (withinSel) {
    // @ts-ignore
    scope = (scope as any).locator(withinSel);
  }

  return scope;
}

// Cria locator a partir do escopo, respeitando "tag > text" / seletor / texto, e aplica índice
function makeLocatorFromScope(
  scope: Page | FrameLocator | Locator,
  raw: string,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
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
  return applyIndex(loc, actionCtx, caseCtx);
}

// Versão do handleCheckLike que respeita o escopo unificado
async function handleCheckLikeFixed(
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
      if (ctx?.click && isSelector(ctx.click)) return ctx.click;
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

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
