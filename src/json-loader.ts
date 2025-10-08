import * as fs from "fs";
import path from "path";
import { DescribeBlock, NewFormat, TestCase } from "./types";

let describeCounter = 1;

export function readJsonFiles(dir: string): string[] {
  let files: string[] = [];
  const items = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) files = files.concat(readJsonFiles(fullPath));
    else if (item.isFile() && item.name.endsWith(".json")) files.push(fullPath);
  }
  return files;
}

function loadJson(filePath: string): NewFormat {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !("describe" in parsed)) {
    throw new Error(
      `❌ Formato inválido em: ${filePath}. Esperado { "describe": { ... } }`
    );
  }
  return parsed as NewFormat;
}

/**
 * Resolve cadeia de 'before':
 * Retorna describeText + lista de casos em ordem: [ ...before..., ...atual... ]
 */
export function resolveCasesChain(
  filePath: string,
  visited: Set<string> = new Set()
): { describeText: string; cases: Array<[caseName: string, value: any]> } {
  const abs = path.resolve(filePath);
  if (visited.has(abs)) {
    throw new Error(`❌ Cycle detected in 'before': ${abs}`);
  }
  visited.add(abs);

  const json = loadJson(abs);
  const block = json.describe ?? json; // se você também suporta JSON sem "describe", mantenha só 'json.describe'
  const describeText =
    typeof block.text === "string" && block.text.trim()
      ? block.text
      : `All Tests ${String(describeCounter++).padStart(2, "0")}`;

  let cases: Array<[string, any]> = [];
  function normalizeBeforeList(
    before: string | string[] | undefined
  ): string[] {
    if (!before) return [];
    if (Array.isArray(before)) return before.filter(Boolean);
    return [before];
  }

  // --- BEFORE(s) em ordem ---
  const beforeList = normalizeBeforeList(block.before);
  for (const beforeEntry of beforeList) {
    const beforePath = beforeEntry.startsWith("/")
      ? beforeEntry
      : path.resolve(path.dirname(abs), beforeEntry);

    if (!fs.existsSync(beforePath)) {
      throw new Error(`❌ 'before' file not found: ${beforePath}`);
    }
    const beforeResolved = resolveCasesChain(beforePath, visited);
    cases = cases.concat(beforeResolved.cases);
  }

  // --- Casos do arquivo atual ---
  const entries = Object.entries(block).filter(
    ([k]) => k !== "text" && k !== "before"
  );
  for (const [caseName, raw] of entries) {
    cases.push([caseName, raw as any]);
  }

  visited.delete(abs);
  return { describeText, cases };
}
