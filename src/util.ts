// utils.ts — CJS-safe dynamic import for @faker-js/faker
import { parseDynamicDateString } from "./generate";

// util.ts
const KNOWN_TAGS = new Set([
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

/**
 * Decide se `raw` é um seletor CSS:
 * - "css:<...>" => sempre seletor
 * - tag pura conhecida (ex: "input") => seletor
 * - começa com # . [ : > + ~ => seletor
 * - contém combinadores > + ~ => seletor
 * - tem padrão de pseudo-classe válido (a:hover, :nth-child, etc) => seletor
 * - tag com #id/.class/[attr] => seletor
 * Caso contrário => trata como TEXTO.
 */
export function isSelector(raw: string): boolean {
  if (!raw) return false;
  const s = raw.trim();
  if (!s) return false;

  if (s.startsWith("css:")) return true; // força seletor
  if (KNOWN_TAGS.has(s)) return true; // tag pura

  if (/^[#.\[\]>+~]/.test(s)) return true; // início típico de CSS
  if (/[>+~]/.test(s)) return true; // combinadores presentes

  // pseudo-classe real: algo como "a:hover", ":nth-child", "div:has(...)" etc
  if (/(^|[a-zA-Z0-9\)\]])\:[a-zA-Z-]+/.test(s)) return true;

  // tag seguida de id/class/attr
  if (/^[a-z][a-z0-9-]*(?:[#.][a-zA-Z0-9_-]+|\[.+\])/i.test(s)) return true;

  // Se tem espaços e não bate com nada acima, trate como texto (ex: "Campo X:")
  return false;
}

/** import() blindado contra transpile para require() em builds CJS */
const dynamicImport: (s: string) => Promise<any> = new Function(
  "s",
  "return import(s)"
) as any;

/** cache para não importar faker repetidamente */
let _fakerLoader: Promise<any> | null = null;
async function getFaker(): Promise<any> {
  if (!_fakerLoader) {
    _fakerLoader = dynamicImport("@faker-js/faker").then((mod: any) => {
      // v9/v8: export { faker }; algumas builds expõem default
      return mod?.faker ?? mod?.default ?? mod;
    });
  }
  return _fakerLoader;
}

/** Regex para "faker.algo()" ou "faker.mod.algo()" sem argumentos */
const FAKER_CALL_RE = /^faker\.([a-zA-Z0-9_.]+)\(\s*\)\s*$/;

/** Agora ASSÍNCRONA: resolve date(...) e faker.* sem require de ESM */
export async function resolveDynamic(text: string): Promise<string> {
  const t = text?.trim() ?? "";
  if (!t) return t;

  // date(...)
  if (/^date\s*\(/i.test(t)) {
    return parseDynamicDateString(t);
  }

  // faker.something()
  const m = t.match(FAKER_CALL_RE);
  if (m) {
    const path = m[1].split(".");
    const faker = await getFaker();

    // navega pelas chaves: ex. ["person","fullName"]
    let cur: any = faker;
    for (const k of path) cur = cur?.[k];

    if (typeof cur !== "function") {
      throw new Error(`Invalid faker path: faker.${path.join(".")}()`);
    }

    const val = cur(); // zero-arg only
    return String(val);
  }

  // literal
  return t;
}
