/**
 * Section 3: Rise-documented limitations (docs/SCOPE-V1.md, maintenance rule).
 *
 * The list itself is data (limitations-data.js). This file decides which
 * entries apply to a course and whether the list is stale.
 *
 * Staleness uses `checkedOn` (the day a person last compared the list with
 * Articulate's page), falling back to `asOf`. The page's own date alone is
 * not enough: a page untouched for a year says nothing about whether anyone
 * has looked at it since.
 *
 * Without a registry the section reports that it is absent rather than
 * implying there is nothing to report.
 */

import { matchesIdentity, walkStrings } from './walk.js';

export const STALE_AFTER_DAYS = 90;

/** True when the date is unknown, unparseable, or older than the limit. */
export function isStale(date, now = new Date(), days = STALE_AFTER_DAYS) {
  const t = Date.parse(date);
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > days * 24 * 60 * 60 * 1000;
}

const TABLE = /<table[\s>]/i;

/** Named content tests. Each takes the context and returns a short reason, or null. */
const CONTENT_TESTS = {
  video(ctx) {
    const n = ctx.blocks.filter((b) => matchesIdentity('multimedia/multimedia/video', b.identity)).length;
    return n > 0 ? `${n} video block${n === 1 ? '' : 's'} in this course` : null;
  },
  'missing-alt'(ctx) {
    const n = ctx.findings.filter((f) => f.checkId === 'image-alt' && f.severity === 'FAIL').length;
    return n > 0 ? `${n} image${n === 1 ? '' : 's'} with no alt text (see Findings)` : null;
  },
  table(ctx) {
    let n = 0;
    for (const { value } of walkStrings(ctx.courseData?.course?.lessons)) if (TABLE.test(value)) n += 1;
    return n > 0 ? `${n} rich-text field${n === 1 ? '' : 's'} containing a table` : null;
  },
};

const readPath = (object, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), object);

/** Why an entry applies to this course, or null if it does not (or cannot be told). */
export function matchTrigger(trigger, ctx) {
  switch (trigger?.kind) {
    case 'identity': {
      const n = ctx.blocks.filter((b) => trigger.patterns.some((p) => matchesIdentity(p, b.identity))).length;
      return n > 0 ? `${n} matching block${n === 1 ? '' : 's'} in this course` : null;
    }
    case 'setting': {
      const course = ctx.courseData?.course ?? {};
      const has = readPath(course, trigger.path) === trigger.equals || readPath(course, `theme.${trigger.path}`) === trigger.equals;
      return has ? `course setting ${trigger.path} is ${String(trigger.equals)}` : null;
    }
    case 'content':
      return CONTENT_TESTS[trigger.test]?.(ctx) ?? null;
    default:
      return null; // standing and dormant entries never "match"
  }
}

/**
 * @param {null | object} registry see limitations-data.js
 * @param {Date} now
 * @param {{ courseData?: object, blocks?: Array, findings?: Array }} [context]
 */
export function limitationsSection(registry, now = new Date(), context = {}) {
  if (!registry) return { available: false };
  const ctx = { courseData: context.courseData ?? null, blocks: context.blocks ?? [], findings: context.findings ?? [] };
  const all = registry.entries ?? [];

  const toRow = (e, because = null) => ({
    id: e.id,
    gap: e.gap ?? null,
    title: e.title,
    sc: e.sc ?? [],
    level: e.level ?? null,
    summary: e.summary,
    workaround: e.workaround ?? null,
    status: e.status ?? null,
    because,
  });

  const matched = [];
  const standing = [];
  let notDetectable = 0;
  let notPresent = 0;
  for (const e of all) {
    if (e.trigger?.kind === 'standing') standing.push(toRow(e));
    else if (e.trigger?.kind === 'dormant') notDetectable += 1;
    else {
      const because = matchTrigger(e.trigger, ctx);
      if (because) matched.push(toRow(e, because));
      else notPresent += 1;
    }
  }

  const checkedOn = registry.checkedOn ?? null;
  return {
    available: true,
    asOf: registry.asOf ?? null,
    checkedOn,
    sourceTitle: registry.sourceTitle ?? null,
    sourceUrl: registry.sourceUrl ?? null,
    stale: isStale(checkedOn ?? registry.asOf, now),
    staleAfterDays: STALE_AFTER_DAYS,
    entries: matched,
    standing,
    counts: { listed: all.length, matched: matched.length, standing: standing.length, notPresent, notDetectable },
  };
}
