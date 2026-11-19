/**
 * Maintainer-only helpers for keeping the Rise limitations list current.
 *
 * NOT part of the shipped tool: the browser tool never fetches anything (that
 * is what keeps "nothing leaves your machine" true). These functions are used
 * by tooling/check-limitations.js, which a person runs by hand.
 *
 * Articulate's page lays the gap list out as rows of columns
 * (div.wp-block-columns.is-tablerow): description + WCAG criterion list,
 * status, workaround, planned action. parseGaps() reads those rows. If the
 * page is redesigned the parse finds nothing, and the CLI fails loudly instead
 * of reporting "no changes".
 *
 * The snapshot stores a fingerprint of each description rather than the
 * description itself, so the repository does not carry a copy of Articulate's
 * page. Differences are reported using the live page's own wording.
 */

import { createHash } from 'node:crypto';

const text = (node) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
export const fingerprint = (description) =>
  createHash('sha256').update(description.toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16);

/** "Last updated: September 24, 2026" -> "2026-09-24", or null. */
export function parsePageDate(document) {
  const m = text(document.body).match(/Last updated:\s*([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (!m) return null;
  const t = Date.parse(`${m[1]} UTC`);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

/**
 * Read the "Identified Accessibility Gaps" rows, in page order.
 * @param {Document} document
 * @returns {Array<{ description: string, sc: string[], level: string|null, status: string, hasWorkaround: boolean, workaround: string, fingerprint: string }>}
 */
export function parseGaps(document) {
  const heading = [...document.querySelectorAll('h2')].find((h) => /identified accessibility gaps/i.test(h.textContent));
  const resolved = [...document.querySelectorAll('h2')].find((h) => /^\s*resolved\s*$/i.test(h.textContent));
  if (!heading) return [];

  const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING (jsdom and browsers)
  const PRECEDING = 2;
  const rows = [...document.querySelectorAll('.wp-block-columns.is-tablerow')].filter((row) => {
    const after = heading.compareDocumentPosition(row) & FOLLOWING;
    const before = !resolved || (resolved.compareDocumentPosition(row) & PRECEDING);
    return after && before;
  });

  const gaps = [];
  for (const row of rows) {
    const cols = [...row.children].filter((c) => c.classList.contains('wp-block-column'));
    if (cols.length < 3) continue;
    const description = text(cols[0].querySelector('p'));
    const criteria = [...cols[0].querySelectorAll('li')].map(text);
    if (!description || criteria.length === 0) continue; // header row or decoration
    const sc = [];
    let level = null;
    for (const c of criteria) {
      const m = c.match(/^(\d\.\d{1,2}\.\d{1,2})\b.*\(Level (A{1,3})\)/i);
      if (m) {
        sc.push(m[1]);
        level = m[2].toUpperCase();
      }
    }
    const workaround = text(cols[2]);
    gaps.push({
      description,
      sc,
      level,
      status: text(cols[1]),
      hasWorkaround: workaround !== '' && !/^none available$/i.test(workaround),
      workaround,
      fingerprint: fingerprint(description),
    });
  }
  return gaps;
}

/** The stored form: no vendor prose, only what is needed to notice a change. */
export function toSnapshot(gaps, pageDate, checkedOn) {
  return {
    asOf: pageDate,
    checkedOn,
    gaps: gaps.map(({ fingerprint: f, sc, level, status, hasWorkaround }) => ({ fingerprint: f, sc, level, status, hasWorkaround })),
  };
}

/**
 * What changed between the stored snapshot and the live page.
 * @returns {{ added: object[], removed: object[], changed: Array<{ gap: object, was: object, what: string[] }>, dateChanged: boolean, pairs: Array<{ added: object, removed: object }> }}
 */
export function diffGaps(snapshot, gaps, pageDate) {
  const stored = new Map(snapshot.gaps.map((g) => [g.fingerprint, g]));
  const live = new Map(gaps.map((g) => [g.fingerprint, g]));

  const added = gaps.filter((g) => !stored.has(g.fingerprint));
  const removed = snapshot.gaps.filter((g) => !live.has(g.fingerprint));

  const changed = [];
  for (const g of gaps) {
    const was = stored.get(g.fingerprint);
    if (!was) continue;
    const what = [];
    if (was.status !== g.status) what.push(`status ${was.status} -> ${g.status}`);
    if (was.sc.join() !== g.sc.join() || was.level !== g.level) what.push(`criterion ${was.sc.join(', ')} (${was.level}) -> ${g.sc.join(', ')} (${g.level})`);
    if (was.hasWorkaround !== g.hasWorkaround) what.push(g.hasWorkaround ? 'a workaround was added' : 'the workaround was removed');
    if (what.length) changed.push({ gap: g, was, what });
  }

  // An added and a removed gap sharing a criterion are probably one gap that was reworded.
  const pairs = [];
  for (const a of added) {
    const r = removed.find((x) => x.sc.join() === a.sc.join());
    if (r) pairs.push({ added: a, removed: r });
  }

  return { added, removed, changed, dateChanged: snapshot.asOf !== pageDate, pairs };
}

/** Does our data file still line up with the live page? Compared by position, criterion, level and status. */
export function compareWithRegistry(registry, gaps) {
  const problems = [];
  if (registry.entries.length !== gaps.length) problems.push(`the registry has ${registry.entries.length} entries but the page lists ${gaps.length} gaps`);
  const n = Math.min(registry.entries.length, gaps.length);
  for (let i = 0; i < n; i++) {
    const e = registry.entries[i];
    const g = gaps[i];
    if (e.sc.join() !== g.sc.join()) problems.push(`gap ${i + 1}: registry says WCAG ${e.sc.join(', ')}, page says ${g.sc.join(', ')}`);
    if (e.level !== g.level) problems.push(`gap ${i + 1}: registry says Level ${e.level}, page says Level ${g.level}`);
    if (e.status !== g.status) problems.push(`gap ${i + 1}: registry says "${e.status}", page says "${g.status}"`);
    if (Boolean(e.workaround) !== g.hasWorkaround) problems.push(`gap ${i + 1}: workaround ${e.workaround ? 'present' : 'absent'} in the registry but ${g.hasWorkaround ? 'present' : 'absent'} on the page`);
  }
  return problems;
}
