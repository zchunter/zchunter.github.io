/**
 * Builds the four-section report (docs/SCOPE-V1.md):
 *   1. findings       author-fixable FAIL / REVIEW results
 *   2. keepInMind     manual-review reminders keyed to what the course contains
 *   3. limitations    Rise-documented gaps the author cannot fix
 *   4. notChecked     everything seen but not examined, and what is out of scope
 *
 * Pure: takes the raw parsed course, returns a plain object. Rendering is in
 * render-report.js. The report never claims conformance.
 */

import { walkBlocks, lessonsOf } from './walk.js';
import { sortFindings } from './finding.js';
import { runChecks, summarizeUninspected } from './run-checks.js';
import { buildInventory } from './inventory.js';
import { scanFacts, buildReminders } from './reminders.js';
import { limitationsSection } from './limitations.js';
import { NOT_CHECKED_SCOPE } from './scope.js';
import { CHECKS } from './checks/index.js';

/**
 * @param {object} courseData raw parsed Rise course (from extractCourse)
 * @param {{ extraction?: object, checks?: Array, registry?: object|null, now?: Date }} [options]
 */
export function buildReport(courseData, { extraction = null, checks = CHECKS, registry = null, now = new Date() } = {}) {
  const course = courseData?.course ?? {};
  const blocks = [...walkBlocks(courseData)];

  const results = sortFindings(runChecks(courseData, checks, blocks));
  const findings = results.filter((r) => r.severity !== 'NOT CHECKED');
  const notCheckedItems = results.filter((r) => r.severity === 'NOT CHECKED');

  const inventory = buildInventory(blocks);
  const facts = scanFacts(courseData, blocks, inventory);

  return {
    meta: {
      title: typeof course.title === 'string' ? course.title : null,
      lessonCount: lessonsOf(courseData).length,
      blockCount: blocks.length,
      extraction,
      generatedAt: now.toISOString(),
      checks: checks.map((c) => ({ id: c.id, title: c.title, sc: [...c.sc] })),
    },
    summary: {
      fail: findings.filter((f) => f.severity === 'FAIL').length,
      review: findings.filter((f) => f.severity === 'REVIEW').length,
      notChecked: notCheckedItems.length,
    },
    findings,
    keepInMind: buildReminders(facts),
    limitations: limitationsSection(registry, now),
    notChecked: {
      items: notCheckedItems,
      inventory,
      uninspected: summarizeUninspected(blocks, checks),
      scope: NOT_CHECKED_SCOPE,
    },
  };
}
