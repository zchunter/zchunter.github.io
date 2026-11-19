/**
 * Check 3: link purpose (WCAG SC 2.4.4, Level A).
 *
 * Reads links in rich text and Rise buttons (label + destination).
 *
 *   FAIL    a link with no accessible name. axe's link-name rule is Level A for
 *           2.4.4 and 4.1.2, and W3C failure F89 covers it.
 *   REVIEW  link text that is a bare URL, or generic ("click here", "read more").
 *           SC 2.4.4 lets purpose come from surrounding context, and does not
 *           define a bare URL as a failure, so neither can be FAIL.
 *   REVIEW  identical link text pointing at different destinations in a lesson.
 */

import { walkItems } from '../walk.js';
import { linksIn, htmlToText, ownStrings } from '../rich-text.js';

const GENERIC_NAMES = new Set([
  'click here', 'here', 'read more', 'learn more', 'more', 'this link', 'link', 'this page', 'download', 'see more',
]);
const EDGE_PUNCTUATION = /^[\s.:;,!?\-–—»›>→←«‹<()[\]"'“”‘’]+|[\s.:;,!?\-–—»›>→←«‹<()[\]"'“”‘’]+$/g;

export const normalizeLinkName = (name) => String(name).toLowerCase().replace(EDGE_PUNCTUATION, '').replace(/\s+/g, ' ').trim();
export const isBareUrl = (name) => /^(https?:\/\/|www\.)/i.test(name.trim()) || name.includes('://');
export const isGenericName = (name) => GENERIC_NAMES.has(normalizeLinkName(name));

const shorten = (s, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function assess({ name, href, location }) {
  const to = href ? ` It links to ${shorten(href)}.` : '';
  if (!name) {
    return [
      {
        severity: 'FAIL',
        sc: ['2.4.4', '4.1.2'],
        location,
        message: `This link has no text, so assistive technology cannot tell where it goes.${to}`,
        remediation: 'Add link text that says where the link goes, or a descriptive label if it contains only an image.',
      },
    ];
  }
  if (isBareUrl(name)) {
    return [
      {
        severity: 'REVIEW',
        location,
        message: `The link text is a web address (${shorten(name, 60)}). Screen readers read it out character by character, though it can be acceptable if the address itself is meaningful.`,
        remediation: 'Replace the address with words that say where the link goes, for example the name of the page.',
      },
    ];
  }
  if (isGenericName(name)) {
    return [
      {
        severity: 'REVIEW',
        location,
        message: `The link text "${name}" does not say where the link goes. That is acceptable only if the surrounding sentence makes the purpose clear.`,
        remediation: 'Rewrite the link text to describe the destination, for example "Read the enrolment guide".',
      },
    ];
  }
  return [];
}

export const linkPurpose = {
  id: 'link-purpose',
  title: 'Link purpose',
  sc: ['2.4.4'],
  // Every string in every block is scanned for links, including custom HTML.
  inspects: ['*'],

  run({ course, blocks }) {
    const results = [];
    const perLesson = new Map(); // lessonIndex -> Map(normalizedName -> { name, hrefs:Set, location })

    const record = (lessonIndex, name, href, location) => {
      if (!name || lessonIndex === undefined) return;
      const key = normalizeLinkName(name);
      if (!key) return;
      const lesson = perLesson.get(lessonIndex) ?? new Map();
      const entry = lesson.get(key) ?? { name, hrefs: new Set(), location };
      if (href) entry.hrefs.add(href);
      lesson.set(key, entry);
      perLesson.set(lessonIndex, lesson);
    };

    const scanOwner = (owner, location, itemPathPrefix) => {
      for (const { value, path } of ownStrings(owner)) {
        for (const { href, name } of linksIn(value)) {
          const where = { ...location, itemPath: itemPathPrefix ? `${itemPathPrefix}.${path}` : path };
          results.push(...assess({ name, href, location: where }));
          record(location.lessonIndex, name, href, where);
        }
      }
      // A Rise button: its text is `label`, its target is `destination`.
      if (owner && typeof owner.destination === 'string' && owner.destination.trim()) {
        const name = htmlToText(owner.label);
        const where = { ...location, itemPath: itemPathPrefix ? `${itemPathPrefix}.label` : 'label' };
        results.push(...assess({ name, href: owner.destination.trim(), location: where }));
        record(location.lessonIndex, name, owner.destination.trim(), where);
      }
    };

    for (const entry of blocks) {
      scanOwner(entry.block, entry.location, '');
      for (const it of walkItems(entry)) scanOwner(it.item, it.location, it.itemPath);
    }

    // Links in the course description.
    for (const { value, path } of ownStrings({ description: course?.description })) {
      for (const { href, name } of linksIn(value)) {
        results.push(...assess({ name, href, location: { scope: 'course', itemPath: path } }));
      }
    }

    // The same words leading to different places within one lesson.
    for (const lesson of perLesson.values()) {
      for (const { name, hrefs, location } of lesson.values()) {
        if (hrefs.size < 2) continue;
        results.push({
          severity: 'REVIEW',
          location,
          message: `The link text "${shorten(name, 60)}" is used for ${hrefs.size} different destinations in this lesson, so learners cannot tell the links apart.`,
          remediation: 'Give each link text that is specific to its own destination.',
        });
      }
    }
    return results;
  },
};
