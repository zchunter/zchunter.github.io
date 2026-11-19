/**
 * Section 3: Rise-documented limitations (docs/SCOPE-V1.md, maintenance rule).
 *
 * This file holds the staleness rule. The list itself (hand-written data drawn
 * from Articulate's published accessibility maturity plan) is added in a later
 * step; until a registry is supplied the section reports that it is absent
 * rather than implying there is nothing to report.
 */

export const STALE_AFTER_DAYS = 90;

/** True when the list's "as of" date is unknown, unparseable, or older than the limit. */
export function isStale(asOf, now = new Date(), days = STALE_AFTER_DAYS) {
  const t = Date.parse(asOf);
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > days * 24 * 60 * 60 * 1000;
}

/**
 * @param {null | { asOf: string, sourceUrl: string, entries?: Array }} registry
 * @param {Date} now
 */
export function limitationsSection(registry, now = new Date()) {
  if (!registry) return { available: false };
  return {
    available: true,
    asOf: registry.asOf ?? null,
    sourceUrl: registry.sourceUrl ?? null,
    stale: isStale(registry.asOf, now),
    staleAfterDays: STALE_AFTER_DAYS,
    entries: [],
  };
}
