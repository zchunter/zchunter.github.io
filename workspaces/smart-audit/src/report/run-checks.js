/**
 * Runs checks over a parsed course and reports what no check examined.
 */

import { walkBlocks, courseLocation, matchesIdentity } from './walk.js';
import { createFinding } from './finding.js';

/** A malformed check definition is a programming error, so it throws. */
export function validateCheck(check) {
  const problems = [];
  if (!check || typeof check !== 'object') problems.push('check must be an object');
  else {
    if (typeof check.id !== 'string' || !check.id) problems.push('id is required');
    if (typeof check.title !== 'string' || !check.title) problems.push('title is required');
    if (!Array.isArray(check.sc) || !check.sc.length) problems.push('sc must list at least one success criterion');
    if (typeof check.run !== 'function') problems.push('run must be a function');
    if (check.inspects !== undefined && !Array.isArray(check.inspects)) problems.push('inspects must be an array of identity patterns');
  }
  if (problems.length) {
    throw new TypeError(`Invalid check${check?.id ? ` "${check.id}"` : ''}: ${problems.join('; ')}`);
  }
}

/**
 * Run every check. Returns validated, frozen findings (all severities,
 * unsorted). A check that throws, or that emits a malformed finding, never
 * crashes the report and never silently passes: its results are dropped and
 * replaced with one NOT CHECKED entry saying so.
 */
export function runChecks(courseData, checks, blocks = [...walkBlocks(courseData)]) {
  const ctx = { courseData, course: courseData?.course ?? {}, blocks };
  const results = [];

  for (const check of checks) {
    validateCheck(check);
    try {
      const produced = (check.run(ctx) ?? []).map((raw) =>
        createFinding({ checkId: check.id, sc: check.sc, ...raw }),
      );
      results.push(...produced);
    } catch (err) {
      results.push(
        createFinding({
          checkId: check.id,
          sc: check.sc,
          severity: 'NOT CHECKED',
          location: courseLocation(),
          message: `The "${check.title}" check could not complete, so its results are missing: ${err.message}`,
        }),
      );
    }
  }
  return results;
}

/**
 * Blocks that no check declared it reads, grouped by identity. This is what
 * lets the report say "N blocks of this type were not examined" instead of
 * letting an unexamined block look like a passing one.
 */
export function summarizeUninspected(blocks, checks) {
  const patterns = checks.flatMap((c) => c.inspects ?? []);
  const byIdentity = new Map();

  for (const entry of blocks) {
    if (patterns.some((p) => matchesIdentity(p, entry.identity))) continue;
    const slot = byIdentity.get(entry.identity) ?? { identity: entry.identity, count: 0, firstLocation: entry.location };
    slot.count += 1;
    byIdentity.set(entry.identity, slot);
  }
  return [...byIdentity.values()].sort((a, b) => b.count - a.count || a.identity.localeCompare(b.identity));
}
