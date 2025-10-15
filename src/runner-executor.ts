// runner-executor.ts
import type {
  BrowserContext,
  FrameLocator,
  Locator,
  Page,
  TestType,
} from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// usa suas utilities
import { isSelector, resolveDynamic } from "./util";

/* ===================== Options ===================== */
export type ExecOpts = {
  baseURLOverride?: string;
  /** Optional path to a file that exports class RunPluginFunctions */
  functionsPath?: string;
};

/* ===================== Helpers ===================== */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function globToRegExp(glob: string) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*");
  return new RegExp("^" + escaped + "$");
}

function splitTagTextPattern(
  input: string
): { tag: string; text: string } | null {
  if (!input.includes(">")) return null;
  const [tagRaw, textRaw] = input.split(">").map((s) => s.trim());
  if (!tagRaw || !textRaw) return null;
  return { tag: tagRaw.toLowerCase(), text: textRaw };
}

function getByPath(obj: any, pathStr: string) {
  if (!pathStr) return obj;
  return pathStr
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

/* ===================== Dynamic function loader ===================== */
type FunctionsCtor = new () => any;
async function loadRunFunctions(
  functionsPath?: string
): Promise<any | undefined> {
  const projectRoot = process.env.INIT_CWD || process.cwd();
  const fixturesDir = path.resolve(projectRoot, "help");
  const candidates = functionsPath
    ? [functionsPath]
    : [
        `${fixturesDir}/plugin-func.ts`,
        `${fixturesDir}/plugin-func.js`,
        `${fixturesDir}/plugin-fns.ts`,
        `${fixturesDir}/plugin-fns.js`,
      ];
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
      /* tenta o próximo */
    }
  }
  return undefined;
}

/* ===================== JSON loader ===================== */
function loadJSON(absPath: string): any {
  const raw = fs.readFileSync(absPath, "utf-8");
  return JSON.parse(raw);
}

/* ===================== Scope / locator helpers ===================== */
function applyIndex(loc: Locator, actionCtx?: any, caseCtx?: any) {
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

function describeCtx(actionCtx?: any, caseCtx?: any) {
  const parts: string[] = [];
  const push = (k: string) => {
    const v = (actionCtx && actionCtx[k]) ?? (caseCtx && caseCtx[k]);
    if (v !== undefined) parts.push(`${k}=${JSON.stringify(v)}`);
  };
  [
    "frame",
    "iframe",
    "root",
    "within",
    "parent",
    "index",
    "nth",
    "first",
    "last",
  ].forEach(push);
  return parts.length ? ` [ctx ${parts.join(" ")}]` : "";
}

/** Cria um Locator a partir do escopo e string (selector ou texto/tag>text) */
function makeLocatorFromScope(
  scope: Page | FrameLocator | Locator,
  raw: string,
  actionCtx?: any,
  caseCtx?: any,
  unindexed = false
): Locator {
  const tt = splitTagTextPattern(raw);
  let loc: Locator;

  if (tt) {
    // "button > Salvar"
    // @ts-ignore
    loc = (scope as any).locator(tt.tag, { hasText: tt.text });
  } else if (isSelector(raw)) {
    try {
      // @ts-ignore
      loc = (scope as any).locator(raw);
    } catch {
      // @ts-ignore
      loc = (scope as any).getByText(raw, { exact: true });
    }
  } else {
    // @ts-ignore
    loc = (scope as any).getByText(raw, { exact: true });
  }

  return unindexed ? (loc as Locator) : applyIndex(loc, actionCtx, caseCtx);
}

/** Valida que o locator existe (count>0). Erra com mensagem útil. */
async function ensureFound(
  loc: Locator,
  raw: string,
  ctxNote = ""
): Promise<void> {
  let count = 0;
  try {
    count = await loc.count();
  } catch {
    /* e.g. bad selector */
  }
  if (count === 0) {
    throw new Error(
      `Selector/text not found: ${JSON.stringify(raw)}${ctxNote}`
    );
  }
}

/** Shortcut para criar + validar locator */
async function locateOrFail(
  scope: Page | FrameLocator | Locator,
  raw: string,
  actionCtx?: any,
  caseCtx?: any,
  unindexed = false
): Promise<Locator> {
  const ctxNote = describeCtx(actionCtx, caseCtx);
  const loc = makeLocatorFromScope(scope, raw, actionCtx, caseCtx, unindexed);
  await ensureFound(loc, raw, ctxNote);
  return loc;
}

async function buildScope(
  page: Page,
  actionCtx?: any,
  caseCtx?: any,
  baseScope?: Page | FrameLocator | Locator
): Promise<Page | FrameLocator | Locator> {
  const frameSel =
    (actionCtx as any)?.frame ??
    (actionCtx as any)?.iframe ??
    (caseCtx as any)?.frame ??
    (caseCtx as any)?.iframe;

  const rootSel = (actionCtx as any)?.root ?? (caseCtx as any)?.root;
  const parentSel = (actionCtx as any)?.parent ?? (caseCtx as any)?.parent;
  const parentIndexUp = (actionCtx as any)?.index ?? (caseCtx as any)?.index;
  const withinSel = (actionCtx as any)?.within ?? (caseCtx as any)?.within;

  let scope: Page | FrameLocator | Locator = baseScope ?? page;

  // frame chain
  const chain = Array.isArray(frameSel) ? frameSel : frameSel ? [frameSel] : [];
  for (const sel of chain) {
    // @ts-ignore
    scope = (scope as any).frameLocator(sel);
  }

  // root (VALIDA)
  if (rootSel) {
    // @ts-ignore
    const candidate: Locator = (scope as any).locator(rootSel);
    await ensureFound(candidate, String(rootSel), " [root]");
    scope = candidate;
  }

  // parent (+ climbs) (VALIDA parent base)
  if (parentSel) {
    let parentLocator: Locator;
    if (isSelector(parentSel)) {
      // @ts-ignore
      parentLocator = (scope as any).locator(parentSel);
    } else {
      // @ts-ignore
      parentLocator = (scope as any).getByText(String(parentSel), {
        exact: true,
      });
    }

    await ensureFound(parentLocator, String(parentSel), " [parent]");

    const up =
      typeof parentIndexUp === "number" && parentIndexUp >= 1
        ? Math.floor(parentIndexUp)
        : 1;
    let climbed: Locator = parentLocator;
    for (let i = 0; i < up; i++) climbed = climbed.locator("..");
    // @ts-ignore
    scope = climbed;
  }

  // within (VALIDA)
  if (withinSel) {
    // @ts-ignore
    const candidate: Locator = (scope as any).locator(withinSel);
    await ensureFound(candidate, String(withinSel), " [within]");
    scope = candidate;
  }

  return scope;
}

/* ===================== URL resolver ===================== */
function resolveUrlForCase(
  caseUrl: string | undefined,
  suiteUrl: string | undefined,
  vars: Record<string, any>,
  baseURL?: string,
  baseURLOverride?: string,
  caseTitle?: string
): string | undefined {
  const raw = caseUrl ?? suiteUrl;
  if (raw === undefined) return undefined;

  const trimmed = String(interpolateTokens(raw ?? "", vars)).trim();
  const effectiveBase = baseURLOverride ?? baseURL;

  if (!trimmed) {
    if (!effectiveBase)
      throw new Error(
        `No baseURL to open when url is empty${
          caseTitle ? ` in "${caseTitle}"` : ""
        }.`
      );
    return effectiveBase;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (!effectiveBase) {
    throw new Error(
      `Relative url "${trimmed}" without baseURL${
        caseTitle ? ` in "${caseTitle}"` : ""
      }.`
    );
  }
  return new URL(trimmed, effectiveBase).toString();
}

/* ===================== Core executor ===================== */
async function processAction(
  page: Page,
  value: any,
  actionRaw: any,
  vars: Record<string, any>,
  pluginFns: any,
  expect: typeof import("@playwright/test").expect,
  baseScope?: Page | FrameLocator | Locator,
  memo?: { lastTypedText?: string; lastGetText?: string }
) {
  // --- RUN PRIMEIRO (antes de interpolar) ---
  if ((actionRaw as any).run) {
    if (!pluginFns) {
      throw new Error(
        `This action uses "run" but RunPluginFunctions was not found. ` +
          `Create help/plugin-func.ts exporting class RunPluginFunctions, or pass opts.functionsPath.`
      );
    }
    const fnName = String((actionRaw as any).run).trim();
    const fn = pluginFns[fnName];
    if (typeof fn !== "function") {
      throw new Error(`RunPluginFunctions does not have a method "${fnName}"`);
    }
    const out = fn.call(pluginFns);
    const result = out && typeof out.then === "function" ? await out : out;

    const asKey = String((actionRaw as any).as ?? "resultFunc");
    vars[asKey] = result;
    if (asKey !== "resultFunc") vars.resultFunc = result;

    const moreKeys = Object.keys(actionRaw).filter(
      (k) => k !== "run" && k !== "as"
    );
    if (moreKeys.length === 0) return;
  }

  // --- Interpolar agora (após run) ---
  const action = JSON.parse(JSON.stringify(actionRaw), (_k, v) =>
    typeof v === "string" ? interpolateTokens(v, vars) : v
  );

  const scope = await buildScope(page, action, value?.context, baseScope);
  const locate = async (raw: string) =>
    await locateOrFail(scope, raw, action, value?.context);
  const locateUnindexed = async (raw: string) =>
    await locateOrFail(scope, raw, undefined, undefined, true);

  /* exist (gate) */
  if ((action as any).exist) {
    const raw = String((action as any).exist).trim();
    const base = await locateUnindexed(raw);
    const found = (await base.count()) > 0;
    if (!found) return;
  }

  /* forEach */
  if ((action as any).forEach && typeof (action as any).forEach === "object") {
    const fe = (action as any).forEach;
    const itemsSel: string = String(fe.items ?? "").trim();
    if (!itemsSel) throw new Error(`forEach needs "items" selector/text.`);
    const itemBase = await locateUnindexed(itemsSel); // valida existir pelo menos 1
    const count = await itemBase.count();
    for (let i = 0; i < count; i++) {
      const item = itemBase.nth(i);
      try {
        await item.scrollIntoViewIfNeeded();
      } catch {}
      const itemMemo = { ...(memo ?? {}) };
      if (Array.isArray(fe.actions)) {
        for (const sub of fe.actions) {
          await processAction(
            page,
            value,
            sub,
            vars,
            pluginFns,
            expect,
            item,
            itemMemo
          );
        }
      }
    }
  }

  /* getText */
  if ((action as any).getText) {
    const raw = String((action as any).getText).trim();
    const loc = await locate(raw);
    const text = await loc.textContent();
    if (memo) memo.lastGetText = text ?? undefined;
    vars.lastGetText = memo?.lastGetText;
  }

  /* type / typeSlow */
  if (
    typeof (action as any).typeSlow === "string" ||
    typeof (action as any).type === "string"
  ) {
    const rawText = (action as any).typeSlow ?? (action as any).type;
    const text = await resolveDynamic(String(rawText));
    const tIsSlow = (action as any).typeSlow != null;

    let targetRaw: string | undefined = (action as any).loc;
    if (!targetRaw && isSelector((action as any).click))
      targetRaw = (action as any).click;
    if (!targetRaw)
      throw new Error(
        `This action needs a selector target for ${
          tIsSlow ? "typeSlow" : "type"
        }. Use "loc" or "click" (selector).`
      );

    const loc = await locate(targetRaw);
    if (tIsSlow) {
      await loc.fill("");
      await loc.pressSequentially(String(text), { delay: 300 });
    } else {
      await loc.fill(String(text));
    }
    if (memo) memo.lastTypedText = String(text);
    vars.lastTypedText = memo?.lastTypedText;
  }

  /* click */
  if ((action as any).click) {
    const c = String((action as any).click).trim();
    const typed = memo?.lastTypedText;

    const m = c.match(/^(.*?)\s*\{type\}$/);
    if (m) {
      const prefix = m[1].trim();
      if (!typed) throw new Error(`click "${c}" used but no prior typed text.`);
      const targetRaw = prefix ? `${prefix} *:has-text("${typed}")` : typed;
      const locator = await locate(targetRaw);
      await locator.click();
    } else if (c === "{type}") {
      if (!typed)
        throw new Error(`click "{type}" used but no prior typed text.`);
      const locator = await locate(typed);
      await locator.click();
    } else {
      const locator = await locate(c);
      await locator.click();
    }
  }

  /* hover */
  if ((action as any).hover) {
    const loc = await locate(String((action as any).hover).trim());
    await loc.hover();
  }

  /* press */
  if ((action as any).press) {
    if ((action as any).loc) {
      const loc = await locate((action as any).loc);
      await loc.press((action as any).press);
    } else if ((action as any).click && isSelector((action as any).click)) {
      const loc = await locate((action as any).click);
      await loc.press((action as any).press);
    } else {
      await page.keyboard.press((action as any).press);
    }
  }

  /* check / uncheck */
  async function handleCheckLike(raw: any, makeChecked: boolean) {
    let targetRaw: string | undefined;
    if (typeof raw === "string") targetRaw = raw;
    else if (raw && typeof raw === "object" && "loc" in raw)
      targetRaw = (raw as any).loc;
    if (!targetRaw) {
      const legacy = (ctx?: { loc?: string; click?: string }) => {
        if (ctx?.loc) return ctx.loc;
        if (ctx?.click && isSelector(ctx?.click as any))
          return ctx.click as any;
        return undefined;
      };
      targetRaw = legacy(action as any) ?? legacy(value?.context as any);
    }
    if (!targetRaw)
      throw new Error(
        `${
          makeChecked ? "check" : "uncheck"
        } needs a target. Use loc or click selector.`
      );
    const loc = await locate(targetRaw);
    if (makeChecked) await loc.check();
    else await loc.uncheck();
  }
  if ((action as any).check !== undefined)
    await handleCheckLike((action as any).check, true);
  if ((action as any).uncheck !== undefined)
    await handleCheckLike((action as any).uncheck, false);

  /* select */
  if ((action as any).select) {
    const rawTarget =
      (action as any).loc ??
      (isSelector((action as any).click ?? "")
        ? (action as any).click!
        : undefined);
    if (!rawTarget)
      throw new Error(`select needs 'loc' or 'click' (selector).`);
    const loc = await locate(rawTarget);
    const sel = (action as any).select;
    if ("value" in sel) await loc.selectOption(sel.value as any);
    else if ("label" in sel) await loc.selectOption(sel.label as any);
    else if ("index" in sel) await loc.selectOption(sel.index as any);
  }

  /* upload */
  if ((action as any).upload !== undefined) {
    const up = (action as any).upload;
    if (!up || typeof up !== "object") {
      throw new Error(
        `upload must be an object like { loc?: string, files: string[] }`
      );
    }

    const rawTarget: string | undefined =
      up.loc ??
      ((isSelector((action as any).click ?? "") && (action as any).click) ||
        undefined);

    if (!rawTarget) {
      throw new Error(
        `upload needs a target. Use "upload.loc" or "click" (selector).`
      );
    }

    const input = await locate(rawTarget); // valida existência

    // Confirma que é input type=file
    const tagName = (await input.evaluate((el) => el.nodeName)).toLowerCase();
    const typeAttr = (await input.getAttribute("type"))?.toLowerCase();
    if (!(tagName === "input" && typeAttr === "file")) {
      throw new Error(
        `upload target is not <input type="file"> (got <${tagName} type="${
          typeAttr ?? ""
        }">) for ${JSON.stringify(rawTarget)}`
      );
    }

    const filesRaw = Array.isArray(up.files)
      ? up.files
      : up.files != null
      ? [up.files]
      : [];
    const expectedCount = filesRaw.length;

    // Base para caminhos relativos (se desejar, preencha value.__jsonBaseDir no createDescribeForFile/runJsonFileInline)
    const baseDir = (value && (value as any).__jsonBaseDir) || process.cwd();
    const absFiles = filesRaw.map((p: string) =>
      path.isAbsolute(p) ? p : path.resolve(baseDir, p)
    );

    for (const f of absFiles) {
      if (!fs.existsSync(f)) {
        throw new Error(`upload file not found on disk: ${f}`);
      }
    }

    await input.setInputFiles(absFiles);

    // Verificação pós-upload
    const filesLen = await input.evaluate(
      (el) => (el as HTMLInputElement).files?.length ?? 0
    );
    if (filesLen !== expectedCount) {
      throw new Error(
        `upload mismatch: expected ${expectedCount} file(s), input now has ${filesLen}. Target=${JSON.stringify(
          rawTarget
        )}`
      );
    }
  }

  /* expectText */
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
      throw new Error(`expectText needs one of: { equals | contains }.`);
    }
    if (rawTarget) {
      const loc = await locate(rawTarget);
      if (et.equals !== undefined) {
        await expect(loc).toHaveText(et.equals as any, { timeout: et.timeout });
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
        await expect(page.locator("body")).toContainText(et.contains as any, {
          timeout: et.timeout,
        });
      }
    }
  }

  /* expectVisible */
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
      to = (action as any).expectVisible.timeout ?? (action as any).timeout;
    }
    if (!rawTarget)
      throw new Error(
        `expectVisible needs a target: use string or object form with loc/click.`
      );
    const loc = await locate(rawTarget);
    await expect(loc).toBeVisible({ timeout: to });
  }

  /* expectValue */
  if ((action as any).expectValue) {
    const ev = (action as any).expectValue;
    if (!ev || typeof ev !== "object" || !ev.loc)
      throw new Error(`expectValue needs { loc, equals|contains }`);
    const loc = await locate(String(ev.loc));
    if (ev.equals !== undefined) {
      await expect(loc).toHaveValue(ev.equals as any, { timeout: ev.timeout });
    } else if (ev.contains !== undefined) {
      const v = await loc.inputValue();
      if (!v.includes(String(ev.contains))) {
        throw new Error(
          `expectValue: value "${v}" does not contain "${String(ev.contains)}".`
        );
      }
    } else {
      throw new Error(`expectValue requires either "equals" or "contains".`);
    }
  }

  /* expectUrl */
  if ((action as any).expectUrl) {
    if ((action as any).expectUrl.equals !== undefined) {
      await expect(page).toHaveURL((action as any).expectUrl.equals as any, {
        timeout: (action as any).expectUrl.timeout,
      });
    } else {
      await expect(page).toHaveURL(
        new RegExp(escapeRegex((action as any).expectUrl.contains!)),
        {
          timeout: (action as any).expectUrl.timeout,
        }
      );
    }
  }

  /* waitRequest */
  if ((action as any).waitRequest) {
    const wr = (action as any).waitRequest as {
      urlIncludes?: string;
      status?: number;
      timeout?: number;
    };
    const timeout = wr.timeout ?? 30000;
    await page.waitForResponse(
      (res) =>
        (!wr.urlIncludes || res.url().includes(wr.urlIncludes)) &&
        (wr.status ? res.status() === wr.status : true),
      { timeout }
    );
  }

  /* waitResponse (glob) */
  if ((action as any).waitResponse) {
    const wr = (action as any).waitResponse;
    const timeout = wr.timeout ?? 30000;
    const urlGlob = String(wr.url);
    const re = globToRegExp(urlGlob);
    const resp = await page.waitForResponse(
      (res) =>
        re.test(res.url()) && (wr.status ? res.status() === wr.status : true),
      { timeout }
    );
    if (wr.bodyContains) {
      const body = await resp.text();
      if (!body.includes(String(wr.bodyContains))) {
        throw new Error(
          `waitResponse matched URL but body didn't contain "${wr.bodyContains}".`
        );
      }
    }
  }

  /* wait / scrollTo / screenshot */
  if ((action as any).wait) await page.waitForTimeout((action as any).wait);

  if ((action as any).scrollTo) {
    const st = (action as any).scrollTo;
    if (typeof st === "string") {
      const dir = st.toLowerCase();
      if (dir === "top") {
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "auto" })
        );
      } else if (dir === "bottom") {
        await page.evaluate(() =>
          window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" })
        );
      } else {
        throw new Error(`scrollTo string must be "top" or "bottom".`);
      }
    } else if (typeof st === "object") {
      if (typeof st.x === "number" || typeof st.y === "number") {
        await page.evaluate(
          ([x, y, behavior]) =>
            window.scrollTo({
              top: y ?? window.scrollY,
              left: x ?? window.scrollX,
              behavior,
            }),
          [st.x ?? null, st.y ?? null, st.behavior ?? "auto"]
        );
      } else if (st.to) {
        const target = String(st.to);
        const loc = await locate(target);
        await loc.scrollIntoViewIfNeeded();
      } else {
        throw new Error(`scrollTo object requires either { to } or { x|y }.`);
      }
    }
  }

  if ((action as any).screenshot) {
    const rawTarget =
      (action as any).loc ??
      (isSelector((action as any).click ?? "")
        ? (action as any).click!
        : undefined);
    const loc = rawTarget ? await locate(rawTarget) : undefined;
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

/* ===================== run JSON inline (suite.before) ===================== */
async function runJsonFileInline(
  jsonAbsPath: string,
  page: Page,
  expect: typeof import("@playwright/test").expect,
  pluginFns: any,
  baseURL?: string,
  opts?: ExecOpts,
  inheritedVars?: Record<string, any>
) {
  const rc: any = loadJSON(jsonAbsPath);
  const describeBlock = rc?.describe ?? {};
  const suiteUrl: string | undefined = describeBlock?.url;

  const varsFromParent = { ...(inheritedVars ?? {}) };

  for (const [k, v] of Object.entries(describeBlock)) {
    if (k === "text" || k === "url" || k === "before") continue;
    const value: any = (v ?? {}) as any;

    // fornece baseDir p/ caminhos relativos em upload, etc.
    (value as any).__jsonBaseDir = path.dirname(jsonAbsPath);

    const targetUrl = resolveUrlForCase(
      value.url,
      suiteUrl,
      varsFromParent,
      baseURL,
      opts?.baseURLOverride,
      value.title
    );
    if (targetUrl) await page.goto(targetUrl);

    const actions = Array.isArray(value.actions) ? value.actions : [];
    for (const actionRaw of actions) {
      await processAction(
        page,
        value,
        actionRaw,
        varsFromParent,
        pluginFns,
        expect,
        undefined,
        {}
      );
    }
  }
}

/* ===================== Main ===================== */
export function createDescribeForFile(
  filePath: string,
  testRef: TestType<any, any>,
  opts?: ExecOpts
) {
  const rc: any = loadJSON(filePath);
  const block = rc?.describe ?? {};
  const describeText: string = block?.text || path.basename(filePath);
  const suiteUrl: string | undefined = block?.url;
  const suiteBefore = block?.before as string | string[] | undefined;

  const entries = Object.entries(block).filter(
    ([k]) => !["text", "url", "before"].includes(k)
  );

  testRef.describe.serial(describeText, () => {
    let context!: BrowserContext;
    let page!: Page;
    let pluginFns: any;

    testRef.beforeAll(async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      pluginFns = await loadRunFunctions(opts?.functionsPath);
    });

    testRef.afterAll(async () => {
      await page?.close();
      await context?.close();
    });

    if (entries.length === 0) {
      testRef("noop: JSON has no cases (only metadata?)", async () => {
        throw new Error(
          `[runner] JSON has no test cases. keys=${JSON.stringify(
            Object.keys(block)
          )}`
        );
      });
      return;
    }

    for (const [caseKey, rawCase] of entries) {
      const value: any = (rawCase ?? {}) as any;
      const title =
        typeof value.title === "string" && value.title.trim()
          ? value.title
          : `Tests in feature ${caseKey}`;

      testRef(title, async () => {
        const expect = testRef.expect;
        const baseURL = testRef.info().project.use.baseURL as
          | string
          | undefined;

        const vars: Record<string, any> = {};
        const memo: { lastTypedText?: string; lastGetText?: string } = {};

        // BEFORE (suite-level)
        if (suiteBefore) {
          const files = Array.isArray(suiteBefore)
            ? suiteBefore
            : [suiteBefore];
          for (const f of files) {
            const absPath = path.isAbsolute(f)
              ? f
              : path.resolve(path.dirname(filePath), f);
            await runJsonFileInline(
              absPath,
              page,
              expect,
              pluginFns,
              baseURL,
              opts,
              vars
            );
          }
        }

        // fornece baseDir p/ caminhos relativos em upload, etc. deste próprio JSON
        (value as any).__jsonBaseDir = path.dirname(filePath);

        // Navegação: prioridade case.url -> describe.url
        const targetUrl = resolveUrlForCase(
          value.url,
          suiteUrl,
          vars,
          baseURL,
          opts?.baseURLOverride,
          title
        );
        if (targetUrl) await page.goto(targetUrl);

        // Actions
        if (!value.actions?.length) return;
        for (const actionRaw of value.actions) {
          await processAction(
            page,
            value,
            actionRaw,
            vars,
            pluginFns,
            expect,
            undefined,
            memo
          );
        }
      });
    }
  });
}
