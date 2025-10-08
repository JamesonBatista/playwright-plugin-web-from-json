// runner-executor.ts
import type {
  BrowserContext,
  FrameLocator,
  Locator,
  Page,
} from "@playwright/test";
import { resolveCasesChain } from "./json-loader";
import { isSelector, resolveDynamic } from "./util";
import {
  AssertionTextInput,
  AssertionVisibleInput,
  LocatorContext,
  SelectOptionInput,
  TestCase,
} from "./types";
import { handleWaitRequest } from "./handleWaitRequest";

/** Opções de execução por arquivo */
type ExecOpts = { baseURLOverride?: string };

/**
 * Cria uma suite describe.serial para um JSON + seus "before"s.
 * Usa somente tipos de @playwright/test; o expect vem de testRef (consumidor).
 */
export function createDescribeForFile(
  filePath: string,
  testRef: typeof import("@playwright/test").test,
  opts?: ExecOpts
) {
  const { describeText, cases } = resolveCasesChain(filePath);

  // use o expect do consumidor
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
        // Navegação: só se o caso definir 'url'
        if (value.url !== undefined) {
          const trimmedUrl = (value.url ?? "").trim();
          const effectiveBase = opts?.baseURLOverride ?? baseURL;

          let targetUrl: string;
          if (!trimmedUrl) {
            if (!effectiveBase) {
              throw new Error(
                `No baseURL to open when url is empty in "${value.title}".`
              );
            }
            targetUrl = effectiveBase; // url: "" => vai pro baseURL
          } else if (trimmedUrl.startsWith("http")) {
            targetUrl = trimmedUrl; // absoluta
          } else {
            if (!effectiveBase) {
              throw new Error(
                `Relative url "${trimmedUrl}" without baseURL in "${value.title}".`
              );
            }
            targetUrl = new URL(trimmedUrl, effectiveBase).toString();
          }

          await page.goto(targetUrl);
        }
        // sem url => continua na página corrente

        if (!value.actions?.length) {
          console.log(`⚠️ Test "${value.title}" has no actions — skipping.`);
          return;
        }

        for (const [index, action] of value.actions.entries()) {
          // CLICK
          if (action.click) {
            await handleClick(page, action.click.trim(), action, value.context);
          }

          // HOVER
          if (action.hover) {
            await handleHover(page, action.hover.trim(), action, value.context);
          }

          // TYPE SLOW
          if (typeof action.typeSlow === "string") {
            await handleType(
              page,
              action.typeSlow,
              { loc: action.loc, click: action.click },
              true,
              action,
              value.context
            );
          }
          // TYPE FAST
          else if (typeof action.type === "string") {
            await handleType(
              page,
              action.type,
              { loc: action.loc, click: action.click },
              false,
              action,
              value.context
            );
          }

          // PRESS
          if (action.press) {
            await handlePress(
              page,
              action.press,
              action.click,
              action.loc,
              action,
              value.context
            );
          }

          if (action.check !== undefined) {
            await handleCheckLike(
              page,
              action.check,
              true,
              action,
              value.context
            );
          }
          if (action.uncheck !== undefined) {
            await handleCheckLike(
              page,
              action.uncheck,
              false,
              action,
              value.context
            );
          }

          // SELECT
          if (action.select) {
            const rawTarget =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
            if (!rawTarget) {
              throw new Error(
                `select needs 'loc' or 'click' (selector) in "${value.title}".`
              );
            }
            await handleSelect(
              page,
              rawTarget,
              action.select,
              action,
              value.context
            );
          }

          // UPLOAD
          if (action.upload) {
            const rawTarget =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
            if (!rawTarget) {
              throw new Error(
                `upload needs 'loc' or 'click' (selector) in "${value.title}".`
              );
            }
            await handleUpload(
              page,
              rawTarget,
              action.upload,
              action,
              value.context
            );
          }

          // ✅ aceita com ou sem loc; só entra se houver valor definido
          if (action.expectText !== undefined) {
            const rawTarget =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined); // pode ser undefined

            // checagem defensiva: precisa ter equals ou contains
            const et = action.expectText;
            if (
              !et ||
              typeof et !== "object" ||
              (et.equals === undefined && et.contains === undefined)
            ) {
              throw new Error(
                `expectText needs one of: { equals | contains } in "${value.title}".`
              );
            }

            await handleExpectText(
              page,
              rawTarget,
              et, // aqui et é garantido como objeto válido
              action,
              value.context,
              expect
            );
          }

          // EXPECT VISIBLE
          if ("expectVisible" in action) {
            let rawTarget: string | undefined;
            let to: number | undefined;

            if (typeof action.expectVisible === "string") {
              // Novo formato: loc direto na string e timeout opcional no nível da action
              rawTarget = action.expectVisible;
              to = action.timeout; // opcional
            } else if (
              action.expectVisible &&
              typeof action.expectVisible === "object"
            ) {
              // Compat: formato antigo { timeout } + loc/select via 'loc' ou 'click' (selector)
              rawTarget =
                action.loc ??
                (isSelector(action.click ?? "") ? action.click! : undefined);
              to = action.expectVisible.timeout ?? action.timeout;
            }

            if (!rawTarget) {
              throw new Error(
                `expectVisible needs a target. Use one of:
       • {"expectVisible": "text=..."}  // novo formato
       • {"expectVisible": {"timeout": N}, "loc": "..."}  // compat
       • {"expectVisible": {}, "loc": "..."} // compat`
              );
            }

            await handleExpectVisible(
              page,
              rawTarget,
              to,
              action,
              value.context,
              expect
            );
          }

          if (action.expectUrl) {
            await handleExpectUrl(page, action.expectUrl, expect);
          }

          // WAIT REQUEST (observa uma resposta de rede)
          if (action.waitRequest) {
            await handleWaitRequest(page, action.waitRequest);
          }

          // WAIT tempo fixo
          if (action.wait) {
            await page.waitForTimeout(action.wait);
          }

          // SCREENSHOT (página toda OU alvo)
          if (action.screenshot) {
            const rawTarget =
              action.loc ??
              (isSelector(action.click ?? "") ? action.click! : undefined);
            await handleScreenshot(
              page,
              action.screenshot,
              rawTarget,
              action,
              value.context
            );
          }
        }
      });
    }
  });
}

/* ========================= Helpers de localização ========================= */

function splitTagTextPattern(
  input: string
): { tag: string; text: string } | null {
  if (!input.includes(">")) return null;
  const [tagRaw, textRaw] = input.split(">").map((s) => s.trim());
  if (!tagRaw || !textRaw) return null;
  return { tag: tagRaw.toLowerCase(), text: textRaw };
}

function getRoot(
  page: Page,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
): Page | FrameLocator | Locator {
  const frameSel = actionCtx?.frame ?? caseCtx?.frame;
  const withinSel = actionCtx?.within ?? caseCtx?.within;

  // Frame chain
  let root: Page | FrameLocator | Locator = page;
  const chain = Array.isArray(frameSel) ? frameSel : frameSel ? [frameSel] : [];
  for (const sel of chain) {
    // @ts-ignore Page/FrameLocator expõem frameLocator
    root = (root as any).frameLocator(sel);
  }

  // Escopo dentro do frame/page
  if (withinSel) {
    // @ts-ignore Page/FrameLocator/Locator expõem locator
    root = (root as any).locator(withinSel);
  }
  return root;
}

// aplica first/last/nth
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
  // comportamento histórico: pegar a primeira
  if (first || true) return loc.first();
  return loc;
}

// locator “inteligente” com tag>texto, seletor, ou texto
function smartLocator(
  page: Page,
  raw: string,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
): Locator {
  const root = getRoot(page, actionCtx, caseCtx) as any;

  const tt = splitTagTextPattern(raw);
  let loc: Locator;
  if (tt) {
    loc = root.locator(tt.tag, { hasText: tt.text });
  } else if (isSelector(raw)) {
    loc = root.locator(raw);
  } else {
    loc = root.getByText(raw, { exact: true });
  }
  return applyIndex(loc, actionCtx, caseCtx);
}

/* =============================== Handlers ================================ */

async function handleClick(
  page: Page,
  raw: string,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  await smartLocator(page, raw, actionCtx, caseCtx).click();
}

async function handleHover(
  page: Page,
  raw: string,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  await smartLocator(page, raw, actionCtx, caseCtx).hover();
}

async function handlePress(
  page: Page,
  key: string,
  targetRaw?: string,
  loc?: string,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  if (loc) {
    await smartLocator(page, loc, actionCtx, caseCtx).press(key);
  } else if (targetRaw) {
    await smartLocator(page, targetRaw, actionCtx, caseCtx).press(key);
  } else {
    await page.keyboard.press(key);
  }
}

async function handleCheck(
  page: Page,
  rawTarget: string,
  check: boolean,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  const loc = smartLocator(page, rawTarget, actionCtx, caseCtx);
  if (check) await loc.check();
  else await loc.uncheck();
}

async function handleSelect(
  page: Page,
  rawTarget: string,
  input: SelectOptionInput,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  const loc = smartLocator(page, rawTarget, actionCtx, caseCtx);
  if ("value" in input) await loc.selectOption(input.value as any);
  else if ("label" in input) await loc.selectOption(input.label as any);
  else if ("index" in input) await loc.selectOption(input.index as any);
}

async function handleUpload(
  page: Page,
  rawTarget: string,
  files: string | string[],
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  const loc = smartLocator(page, rawTarget, actionCtx, caseCtx);
  await loc.setInputFiles(files);
}

// Digitação (rápida e lenta) com suporte a frame/within/nth e valores dinâmicos
async function handleType(
  page: Page,
  text: string,
  locOrClickRaw: { loc?: string; click?: string },
  slow: boolean,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  // Resolve o alvo: preferimos `loc`; se não houver, aceitamos `click` apenas se for SELETOR
  let locator: Locator | null = null;

  if (locOrClickRaw.loc && locOrClickRaw.loc.trim().length > 0) {
    locator = smartLocator(page, locOrClickRaw.loc, actionCtx, caseCtx);
  } else if (
    locOrClickRaw.click &&
    locOrClickRaw.click.trim().length > 0 &&
    isSelector(locOrClickRaw.click)
  ) {
    locator = smartLocator(page, locOrClickRaw.click, actionCtx, caseCtx);
  } else {
    throw new Error(
      "Typing needs 'loc' or a 'click' that is a selector (text targets are ambiguous)."
    );
  }

  // Limpa antes de digitar
  await locator.fill("");

  // Resolve faker/date(...) de forma assíncrona
  const value = await resolveDynamic(text);

  // Digita
  if (slow) {
    await locator.pressSequentially(value, { delay: 300 });
  } else {
    await locator.fill(value);
  }
}

async function handleExpectText(
  page: Page,
  rawTarget: string | undefined,
  cfg: {
    equals?: string | RegExp;
    contains?: string | RegExp;
    timeout?: number;
  },
  actionCtx: LocatorContext | undefined,
  caseCtx: LocatorContext | undefined,
  expectRef: typeof import("@playwright/test").expect
) {
  const to = cfg.timeout;

  // Com alvo (loc ou click seletor)
  if (rawTarget) {
    const loc = smartLocator(page, rawTarget, actionCtx, caseCtx);
    if (cfg.equals !== undefined) {
      await expectRef(loc).toHaveText(cfg.equals as any, { timeout: to });
    } else if (cfg.contains !== undefined) {
      await expectRef(loc).toContainText(cfg.contains as any, { timeout: to });
    } else {
      throw new Error("expectText needs one of: { equals | contains }");
    }
    return;
  }

  // Sem alvo => página inteira
  if (cfg.equals !== undefined) {
    // procura elemento cujo texto visível seja exatamente o informado
    await expectRef(
      page.getByText(cfg.equals as any, { exact: true })
    ).toBeVisible({
      timeout: to,
    });
  } else if (cfg.contains !== undefined) {
    // verifica que o body contém o trecho (ignora espaços/linhas)
    await expectRef(page.locator("body")).toContainText(cfg.contains as any, {
      timeout: to,
    });
  } else {
    throw new Error("expectText needs one of: { equals | contains }");
  }
}

async function handleExpectVisible(
  page: Page,
  rawTarget: string,
  timeout: number | undefined,
  actionCtx: LocatorContext | undefined,
  caseCtx: LocatorContext | undefined,
  expectRef: typeof import("@playwright/test").expect
) {
  const loc = smartLocator(page, rawTarget, actionCtx, caseCtx);
  await expectRef(loc).toBeVisible({ timeout });
}

async function handleExpectUrl(
  page: Page,
  cfg: { equals?: string | RegExp; contains?: string; timeout?: number },
  expectRef: typeof import("@playwright/test").expect
) {
  if (cfg.equals !== undefined) {
    await expectRef(page).toHaveURL(cfg.equals as any, {
      timeout: cfg.timeout,
    });
  } else if (cfg.contains !== undefined) {
    await expectRef(page).toHaveURL(new RegExp(escapeRegex(cfg.contains)), {
      timeout: cfg.timeout,
    });
  } else {
    throw new Error("expectUrl needs one of: { equals | contains }");
  }
}

async function handleScreenshot(
  page: Page,
  cfg: { path?: string; fullPage?: boolean },
  rawTarget?: string,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  const imgPath = cfg.path;
  if (!imgPath) throw new Error("screenshot.path is required");

  const { dirname } = await import("path");
  const { mkdirSync } = await import("fs");
  mkdirSync(dirname(imgPath), { recursive: true });

  if (rawTarget) {
    await smartLocator(page, rawTarget, actionCtx, caseCtx).screenshot({
      path: imgPath,
      omitBackground: false,
    });
  } else {
    await page.screenshot({ path: imgPath, fullPage: !!cfg.fullPage });
  }
}

export function resolveTypingTarget(
  loc: string | undefined,
  click: string | undefined,
  actionIndex: number,
  testTitle: string
): string {
  const locTrim = loc?.trim();
  if (locTrim) return locTrim;

  const clickTrim = click?.trim();
  if (clickTrim && isSelector(clickTrim)) return clickTrim;

  throw new Error(
    `Action ${actionIndex + 1} in "${testTitle}" needs a target.\n` +
      `Provide "loc": "<selector>" or make "click" a selector (e.g. "#id", ".cls", "input[name=...]", "//xpath").`
  );
}

async function handleCheckLike(
  page: Page,
  raw: string | { loc: string } | true | undefined,
  makeChecked: boolean,
  actionCtx?: LocatorContext,
  caseCtx?: LocatorContext
) {
  // 1) Resolver o alvo:
  let targetRaw: string | undefined;

  if (typeof raw === "string") {
    targetRaw = raw; // nova forma: check: "input[name=...]"
  } else if (raw && typeof raw === "object" && "loc" in raw) {
    targetRaw = raw.loc; // nova forma: check: { loc: "..." }
  }

  // Legado: check: true + loc|click (seletor) no action
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
      `${makeChecked ? "check" : "uncheck"} precisa de um alvo. ` +
        `Use "check": "<seletor>" ou "check": { "loc": "<seletor>" } ` +
        `(ou informe "loc" no action para compat legada).`
    );
  }

  // 2) Gerar locator respeitando frame/within/nth
  const loc = smartLocator(page, targetRaw, actionCtx, caseCtx);

  // 3) Executar
  if (makeChecked) await loc.check();
  else await loc.uncheck();
}

/* =============================== Utils ================================== */

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
