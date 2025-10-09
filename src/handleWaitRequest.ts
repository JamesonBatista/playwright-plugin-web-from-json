import type { Page, Response } from "@playwright/test";
import type { WaitRequestInput } from "./types";

/**
 * Aguarda uma resposta cuja URL contenha pelo menos um trecho de `urlIncludes`
 * e, se `status` for fornecido, que tenha um desses status. Usa Playwright puro.
 */
export async function handleWaitRequest(
  page: Page,
  cfg: WaitRequestInput
): Promise<Response> {
  const includesList = toArray(cfg.urlIncludes)
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (includesList.length === 0) {
    throw new Error(
      "waitRequest.urlIncludes must be a non-empty string or string[] (after trimming)."
    );
  }

  const statuses = toArray(cfg.status);
  const timeout = cfg.timeout ?? 50_000;

  const res = await page.waitForResponse(
    (r) => {
      const url = r.url();
      const urlOk = includesList.some((snippet) => url.includes(snippet));
      if (!urlOk) return false;

      if (statuses.length === 0) return true; // qualquer status serve
      const st = r.status();
      return statuses.includes(st);
    },
    { timeout }
  );

  return res;
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}
