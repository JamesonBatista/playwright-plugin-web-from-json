// src/index.ts
import type { TestType } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { createDescribeForFile } from "./runner-executor";

export type PluginOptions = {
  /** Pasta com os JSONs (relativa ou absoluta). */
  dir: string;
  /** Força um baseURL (sobrepõe o baseURL do Playwright config). */
  baseURLOverride?: string;
  /** Caminho opcional para arquivo que exporta class RunPluginFunctions. */
  functionsPath?: string;
  /** Quando true, cria testes "noop" úteis pra DX quando não achar nada. */
  allowNoopWhenEmpty?: boolean;
  /**
   * Resolver dinâmico aplicado em type/typeSlow (ex.: faker, date(...)).
   * Ex: (s) => parseDynamicDateString(s) ou seu resolveDynamic().
   */
  resolveValue?: (input: string) => string | Promise<string>;
};

export function generateTestsFromJson(
  opts: PluginOptions,
  testRef: TestType<any, any>
): void {
  if (!opts?.dir)
    throw new Error("`dir` é obrigatório em generateTestsFromJson()");

  const baseDir = path.isAbsolute(opts.dir)
    ? opts.dir
    : path.resolve(process.cwd(), opts.dir);

  if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
    const msg = `[json-runner] Diretório inexistente ou não é pasta: ${baseDir}`;
    if (opts.allowNoopWhenEmpty) {
      testRef("noop: JSON base directory not found", () => {
        throw new Error(msg);
      });
      return;
    }
    throw new Error(msg);
  }

  const files = fs
    .readdirSync(baseDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(baseDir, f))
    .sort();

  if (!files.length) {
    if (opts.allowNoopWhenEmpty) {
      testRef("noop: no JSON files discovered", () => {
        throw new Error(`[json-runner] Nenhum .json em ${baseDir}`);
      });
    }
    return;
  }

  let suites = 0;
  for (const file of files) {
    createDescribeForFile(
      file,
      testRef,
      {
        baseURLOverride: opts.baseURLOverride,
        functionsPath: opts.functionsPath,
        // repassa pro runner — é opcional
        // se você estiver usando o seu util.resolveDynamic direto no runner, deixe também:
        // resolveValue: opts.resolveValue,
      } as any /* caso seu runner-executor ainda não exporte o tipo ExecOpts */
    );
    suites++;
  }

  if (suites === 0 && opts.allowNoopWhenEmpty) {
    testRef("noop: JSON files parsed but produced no suites/cases", () => {
      throw new Error(
        "[json-runner] JSONs parseados, mas nenhum suite/case gerado (só metadata?)."
      );
    });
  }
}
