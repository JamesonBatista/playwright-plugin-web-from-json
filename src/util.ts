// util.ts — tudo junto: seletor, import dinâmico faker (ESM/CJS-safe), parsing e resolveDynamic
import { parseDynamicDateString } from "./generate";

/* =========================
   1) utilidades de seletor
   ========================= */
const KNOWN_TAGS = new Set<string>([
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "svg",
  "path",
  "g",
  "circle",
  "rect",
  "polygon",
  "line",
  "polyline",
  "text",
]);

/** Decide se `raw` é seletor CSS (sua lógica original). */
export function isSelector(raw: string): boolean {
  if (!raw) return false;
  const s = raw.trim();
  if (!s) return false;

  if (s.startsWith("css:")) return true; // força seletor
  if (KNOWN_TAGS.has(s)) return true; // tag pura
  if (/^[#.\[\]>+~]/.test(s)) return true; // início típico
  if (/[>+~]/.test(s)) return true; // combinadores
  if (/(^|[a-zA-Z0-9\)\]])\:[a-zA-Z-]+/.test(s)) return true; // pseudo-classes
  if (/^[a-z][a-z0-9-]*(?:[#.][a-zA-Z0-9_-]+|\[.+\])/i.test(s)) return true; // tag + id/class/attr
  return false; // caso contrário, texto
}

/* ===========================================================
   2) import dinâmico do faker (ESM) com compat CJS + cache
   =========================================================== */
const dynamicImport: (s: string) => Promise<any> = new Function(
  "s",
  "return import(s)"
) as any;

let _fakerLoader: Promise<any> | null = null;

/** Carrega @faker-js/faker e permite locale/seed opcionais. */
async function getFaker(opts?: {
  locale?: string;
  seed?: number | number[];
  configure?: (faker: any) => void;
}): Promise<any> {
  if (!_fakerLoader) {
    _fakerLoader = dynamicImport("@faker-js/faker").then((mod: any) => {
      // v10 ESM: export { faker }; alguns bundlers expõem default
      const fk = mod?.faker ?? mod?.default ?? mod;
      return fk;
    });
  }
  const faker = await _fakerLoader;

  if (opts?.locale) {
    try {
      faker.locale = opts.locale;
    } catch {}
  }
  if (opts?.seed !== undefined) {
    try {
      faker.seed(opts.seed as any);
    } catch {}
  }
  if (opts?.configure) {
    try {
      opts.configure(faker);
    } catch {}
  }
  return faker;
}

/* ============================================
   3) parsing de faker com argumentos seguros
   ============================================ */

/** faker.mod.fn(...args?) — com ou sem argumentos (whitespace/newlines ok) */
const FAKER_CALL_RE = /^faker\.([a-zA-Z0-9_.]+)\(\s*(?<args>[\s\S]*?)\s*\)\s*$/;

/**
 * Divide argumentos top-level respeitando {}, [], (), "" e ''.
 * Ex.: a, {x:1,y:[2,3]}, "b,c", 'd,e' => ["a","{x:1,y:[2,3]}","\"b,c\"","'d,e'"]
 */
function splitTopLevelArgs(src: string): string[] {
  const out: string[] = [];
  if (!src) return out;

  let i = 0,
    start = 0;
  let dCurly = 0,
    dSquare = 0,
    dParen = 0;
  let inSingle = false,
    inDouble = false,
    esc = false;

  const push = (end: number) => {
    const piece = src.slice(start, end).trim();
    if (piece) out.push(piece);
    start = end + 1;
  };

  while (i < src.length) {
    const ch = src[i];

    if (esc) {
      esc = false;
      i++;
      continue;
    }

    if (inSingle) {
      if (ch === "\\") esc = true;
      else if (ch === "'") inSingle = false;
      i++;
      continue;
    }
    if (inDouble) {
      if (ch === "\\") esc = true;
      else if (ch === '"') inDouble = false;
      i++;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      i++;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      i++;
      continue;
    }

    if (ch === "{") dCurly++;
    else if (ch === "}") dCurly--;
    else if (ch === "[") dSquare++;
    else if (ch === "]") dSquare--;
    else if (ch === "(") dParen++;
    else if (ch === ")") dParen--;

    if (ch === "," && dCurly === 0 && dSquare === 0 && dParen === 0) {
      push(i);
    }
    i++;
  }

  const tail = src.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/**
 * Converte argumento textual em valor JS **sem executar código**.
 * Suporta:
 * - JSON/Array (começa com { ou [}) → JSON.parse (com normalização leve)
 * - literais: true/false/null
 * - números (int/float/sci)
 * - strings com aspas simples/dobras
 * - fallback: string crua
 */
function coerceArg(raw: string): any {
  const s = raw.trim();

  // { ... } ou [ ... ]
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch {}
    // normalização simples: aspas simples → duplas; chaves sem aspas → com aspas
    const normalized = s
      .replace(/'([^'\\]*?)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`)
      .replace(/([{,\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    try {
      return JSON.parse(normalized);
    } catch {}
    throw new Error(`Invalid JSON-like argument: ${raw}`);
  }

  // literais
  if (/^(true|false|null)$/i.test(s)) {
    return s.toLowerCase() === "true"
      ? true
      : s.toLowerCase() === "false"
      ? false
      : null;
  }

  // número
  if (/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) {
    return Number(s);
  }

  // strings entre aspas
  const mSingle = s.match(/^'(.*)'$/s);
  if (mSingle) return mSingle[1].replace(/\\'/g, "'");
  const mDouble = s.match(/^"(.*)"$/s);
  if (mDouble) return mDouble[1].replace(/\\"/g, '"');

  // fallback: string crua (ex.: foo@bar.com)
  return s;
}

/**
 * Resolve:
 *  - date(...)
 *  - faker.* com argumentos opcionais
 *  - literal (retorna como veio)
 *
 * Retorno SEMPRE string:
 *  - Date -> ISO (toISOString)
 *  - object/array -> JSON.stringify
 *  - demais -> String(...)
 */
export async function resolveDynamic(
  text: string,
  fakerOptions?: {
    locale?: string;
    seed?: number | number[];
    configure?: (faker: any) => void;
  }
): Promise<string> {
  const t = text?.trim() ?? "";
  if (!t) return t;

  // date(...)
  if (/^date\s*\(/i.test(t)) {
    return parseDynamicDateString(t);
  }

  // faker.module.fn(...args?)
  const m = t.match(FAKER_CALL_RE);
  if (m) {
    const path = m[1].split(".");
    const rawArgs = m.groups?.args?.trim() ?? "";
    const args = rawArgs ? splitTopLevelArgs(rawArgs).map(coerceArg) : [];

    const faker = await getFaker(fakerOptions);

    // navega nas chaves: ["person","fullName"], etc.
    let cur: any = faker;
    for (const k of path) cur = cur?.[k];

    if (typeof cur !== "function") {
      throw new Error(`Invalid faker path: faker.${path.join(".")}()`);
    }

    const val = cur(...args);

    if (val instanceof Date) return val.toISOString();
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return String(val);
  }

  // literal => texto
  return t;
}
