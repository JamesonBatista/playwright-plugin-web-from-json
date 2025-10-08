// utils.ts — CJS-safe dynamic import for @faker-js/faker
import { parseDynamicDateString } from "./generate";

/** Heurística simples: CSS/XPath */
export const isSelector = (s: string) => {
  const t = s.trim();
  return (
    /^[#.\[]|^\/\//.test(t) ||              // id, class, attr, xpath
    /^[a-zA-Z][a-zA-Z0-9]*[:\[#.]/.test(t)  // tag com pseudo/attr/class (ex.: input[name=], h2:has-text())
  );
};

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
