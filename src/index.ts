import type { TestType } from "@playwright/test";
import path from "path";
import { readJsonFiles } from "./json-loader";
import { createDescribeForFile } from "./runner-executor";

export type PluginOptions = {
  /** Folder with JSON files (relative or absolute). */
  dir: string;
  /**
   * Forces a baseURL (overrides Playwright's config baseURL).
   * Usually leave undefined to use Playwright's baseURL.
   */
  baseURLOverride?: string;
};

/**
 * Generate Playwright suites/tests from JSON files.
 * Call this inside a .spec.ts and pass Playwright's `test`.
 */
export function generateTestsFromJson(
  opts: PluginOptions,
  testRef: TestType<any, any>
): void {
  if (!opts?.dir) {
    throw new Error("`dir` is required in generateTestsFromJson()");
  }

  const baseDir = path.resolve(process.cwd(), opts.dir);
  const jsonFiles = readJsonFiles(baseDir); // stable order

  for (const file of jsonFiles) {
    createDescribeForFile(file, testRef, {
      baseURLOverride: opts.baseURLOverride,
    });
  }
}
