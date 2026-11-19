/**
 * Check 2: heading structure (WCAG SC 1.3.1 and 2.4.6).
 *
 * Rise stores heading text as plain paragraphs; the heading LEVEL comes from
 * the block type. Verified by rendering a published Rise course and matching
 * it block-by-block against its data (docs/SCOPE-V1-EVIDENCE.md):
 *
 *   lesson title                              -> h1
 *   text/text/heading, heading paragraph      -> h2
 *   text/text/subheading, subheading paragraph -> h3
 *
 * Other blocks (statement, quote, accordion, tab, process, labeled graphic)
 * also emit headings, but their levels are not verified, so they are left out
 * of the outline and named once in NOT CHECKED.
 *
 * Severity. WCAG defines no failure for a skipped level or an empty heading
 * (W3C 2.4.6 does not address empty headings; G141 is advisory for 1.3.1; axe
 * classes both as best practice). They are REVIEW and labelled best practice.
 * A very short heading may be heading markup used only for appearance, which
 * the W3C failure F43 covers, so it is a WCAG REVIEW.
 */

import { walkLessons, walkItems, matchesIdentity } from '../walk.js';
import { htmlToText, headingsIn, ownStrings } from '../rich-text.js';

const LEVEL_BY_IDENTITY = new Map([
  ['text/text/heading', 2],
  ['text/text/heading paragraph', 2],
  ['text/text/subheading', 3],
  ['text/text/subheading paragraph', 3],
]);
const UNVERIFIED_HEADING_BLOCKS = [
  'impact/*',
  'quote/*',
  'interactive/interactive/accordion',
  'interactive/interactive/tabs',
  'interactive-fullscreen/interactive/process',
  'interactive-fullscreen/interactive/timeline',
  'interactive-fullscreen/interactive/labeledgraphic',
];
const SPACING_BLOCKS = ['continue/*', 'divider/*'];
const SHORT_HEADING = 4;

export const headingStructure = {
  id: 'heading-structure',
  title: 'Heading structure',
  sc: ['1.3.1', '2.4.6'],
  inspects: ['text/*'],

  run({ courseData, blocks }) {
    const results = [];
    const byLesson = new Map();
    for (const entry of blocks) {
      const list = byLesson.get(entry.lessonIndex) ?? [];
      list.push(entry);
      byLesson.set(entry.lessonIndex, list);
    }

    let unverified = 0;

    for (const { lesson, lessonIndex, location: lessonLocation } of walkLessons(courseData)) {
      if (lesson?.type !== 'blocks') continue;
      const entries = byLesson.get(lessonIndex) ?? [];

      // The outline of this lesson, in reading order. The lesson title is the h1.
      const outline = [{ level: 1, text: typeof lesson.title === 'string' ? lesson.title.trim() : '', isTitle: true, location: lessonLocation }];
      let hasHeadingBlock = false;

      for (const entry of entries) {
        if (UNVERIFIED_HEADING_BLOCKS.some((p) => matchesIdentity(p, entry.identity))) unverified += 1;

        const level = LEVEL_BY_IDENTITY.get(entry.identity);
        if (level) {
          hasHeadingBlock = true;
          for (const it of walkItems(entry)) {
            if (it.depth !== 1) continue;
            outline.push({ level, text: htmlToText(it.item?.heading), location: { ...it.location, itemPath: `${it.itemPath}.heading` } });
          }
        } else if (matchesIdentity('text/*', entry.identity)) {
          // Literal <h1>-<h6> typed into other text blocks.
          for (const it of walkItems(entry)) {
            for (const { value, path } of ownStrings(it.item)) {
              for (const h of headingsIn(value)) outline.push({ level: h.level, text: h.text, location: { ...it.location, itemPath: `${it.itemPath}.${path}` } });
            }
          }
        }
      }

      // Empty and very short headings.
      for (const h of outline) {
        if (h.isTitle) continue;
        if (h.text === '') {
          results.push({
            severity: 'REVIEW',
            basis: 'best-practice',
            sc: ['1.3.1', '2.4.6'],
            location: h.location,
            message: `This level ${h.level} heading is empty. Screen readers announce a heading with nothing after it.`,
            remediation: 'Add heading text, or delete the block if it is only there for spacing.',
          });
        } else if (h.text.length < SHORT_HEADING) {
          results.push({
            severity: 'REVIEW',
            sc: ['1.3.1'],
            location: h.location,
            message: `The heading "${h.text}" is only ${h.text.length} character${h.text.length === 1 ? '' : 's'} long. Short headings are often a heading style used for emphasis rather than structure.`,
            remediation: 'If this is not a real section heading, use bold text in a paragraph instead.',
          });
        }
      }

      // Skipped levels, in reading order.
      for (let i = 1; i < outline.length; i++) {
        const prev = outline[i - 1];
        const cur = outline[i];
        if (cur.level > prev.level + 1) {
          results.push({
            severity: 'REVIEW',
            basis: 'best-practice',
            sc: ['1.3.1'],
            location: cur.location,
            message: `A level ${cur.level} heading follows a level ${prev.level} heading with no level ${prev.level + 1} between them${prev.isTitle ? ' (the lesson title is level 1)' : ''}. W3C guidance advises against skipping levels, though it is not a WCAG failure.`,
            remediation: `Reorder the blocks, or add a level ${prev.level + 1} heading, so levels step down one at a time.`,
          });
        }
      }

      // A lesson with content but no heading blocks at all.
      const content = entries.filter((e) => !SPACING_BLOCKS.some((p) => matchesIdentity(p, e.identity)));
      if (content.length > 0 && !hasHeadingBlock) {
        results.push({
          severity: 'REVIEW',
          basis: 'best-practice',
          sc: ['1.3.1'],
          location: lessonLocation,
          message: 'This lesson has no heading or subheading blocks, so a learner navigating by headings finds only the lesson title.',
          remediation: 'Add heading blocks to introduce the main sections of the lesson.',
        });
      }
    }

    if (unverified > 0) {
      results.push({
        severity: 'NOT CHECKED',
        location: { scope: 'course' },
        message: `${unverified} block${unverified === 1 ? '' : 's'} (statement, quote, accordion, tab, process, timeline, labeled graphic) can contain headings whose level has not been verified, so ${unverified === 1 ? 'it was' : 'they were'} left out of the heading outline.`,
      });
    }
    return results;
  },
};
