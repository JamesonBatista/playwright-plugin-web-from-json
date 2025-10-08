import { Page } from "@playwright/test";
import { WaitRequestInput } from "./types";
// ...demais imports

export async function handleWaitRequest(page: Page, cfg: WaitRequestInput) {
  const includesList = toArray(cfg.urlIncludes).filter(
    (s) => typeof s === "string" && s.length > 0
  );
  if (includesList.length === 0) {
    throw new Error(
      "waitRequest.urlIncludes must be a non-empty string or string[]"
    );
  }
  const statuses = toArray(cfg.status);
  const timeout = cfg.timeout ?? 50_000;

  await page.waitForResponse(
    (res) => {
      const url = res.url();
      const urlOk = includesList.some((snippet) => url.includes(snippet));
      if (!urlOk) return false;

      if (statuses.length === 0) return true; // qualquer status
      const st = res.status();
      return statuses.includes(st);
    },
    { timeout }
  );
}
function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}
