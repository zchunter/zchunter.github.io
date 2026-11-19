/**
 * Initial corpus census (PHASE-1-SPEC.md §9 / §24 deliverable #6).
 *
 * Deliberately minimal: lesson count, block count, and family/type/variant
 * identity occurrence counts. This is NOT the full Phase 1C census — field
 * enumeration, nested-structure enumeration, cross-course aggregation, and
 * support-state classification are later slices. See PHASE-1-SPEC.md §9-11.
 *
 * Independent of any "known identities" list on purpose: census reports what
 * was observed, not whether it was expected. Classifying an identity as
 * known/unknown/supported is a separate later concern.
 */

import { blockIdentity } from './report/walk.js';

/**
 * @param {object} courseData - raw parsed Rise course data (from decodeRisePayload)
 * @returns {{ lessons: number, blocks: number, identities: Record<string, number> }}
 */
export function buildCensus(courseData) {
  const lessons = courseData?.course?.lessons ?? [];
  const identities = {};
  let blocks = 0;

  for (const lesson of lessons) {
    for (const block of lesson.items ?? []) {
      blocks++;
      const identity = blockIdentity(block);
      identities[identity] = (identities[identity] ?? 0) + 1;
    }
  }

  return {
    lessons: lessons.length,
    blocks,
    identities,
  };
}
