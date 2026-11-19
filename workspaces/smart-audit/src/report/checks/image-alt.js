/**
 * Check 1: image alternative text (WCAG SC 1.1.1, Level A).
 *
 * Presence and plausibility only. Whether alt text is actually good is not
 * mechanically decidable and is deliberately out of scope.
 *
 * The hard part is knowing which image slots can carry alt text at all, and a
 * missing alt is only a certain failure where Rise offers an alt field. Slots
 * are classified from what real exports show (see docs/SCOPE-V1-EVIDENCE.md):
 *
 *   confirmed    alt has been seen populated or explicitly empty in real
 *                exports, so the field exists. Missing alt -> REVIEW: Rise
 *                publishes it as alt="" (decorative), verified 2026-11-19 by
 *                rendering a real export, so it is a defect only if the image
 *                carries information, which needs human judgment.
 *   unconfirmed  only a missing alt has ever been seen, so the export cannot
 *                prove Rise offers a field. Missing alt -> REVIEW, never FAIL.
 *   limited      Articulate documents a bug: alt text is not output. -> REVIEW.
 *   no-field     Rise has no alt field here (backgrounds, flashcard faces,
 *                avatars, unused editor slots). -> NOT CHECKED, grouped per
 *                lesson so a deck of decorative backgrounds is one line.
 *
 * This check therefore never produces FAIL. Every finding about one image
 * carries an image reference (file name, stored alt, ZIP paths) so the
 * reviewer can find it in Rise and preview it.
 */

import { walkItems, matchesIdentity } from '../walk.js';
import { imageRef } from '../image-ref.js';

const SC = ['1.1.1'];

// ─── slot classification ─────────────────────────────────────────────────────

const CONFIRMED = [
  { identity: 'image/image/text aside', level: 'item' },
  { identity: 'image/image/hero', level: 'item' },
  { identity: 'interactive-fullscreen/interactive/labeledgraphic', level: 'block' },
  { identity: 'interactive-fullscreen/interactive/process', level: 'item' },
  { identity: 'interactive/interactive/accordion', level: 'item' },
];
const LIMITED = [{ identity: 'image/image/text overlay', level: 'item' }];

const NO_FIELD_GROUPS = [
  { group: 'editor-slot', matches: (p) => p.split('.').includes('tmp'), noun: 'image in an unused editor slot', nouns: 'images in unused editor slots' },
  { group: 'flashcard', matches: (p) => /^(front|back)\./.test(p), noun: 'flashcard image', nouns: 'flashcard images' },
  { group: 'avatar', matches: (p) => /^avatar\./.test(p), noun: 'avatar image', nouns: 'avatar images' },
  { group: 'background', matches: (p) => /^background\./.test(p), noun: 'background image', nouns: 'background images' },
];

/**
 * relPath is the path inside the block or item that owns the image, e.g.
 * "media.image". Returns { kind, group?, noun? }; kind is one of
 * 'confirmed' | 'unconfirmed' | 'limited' | 'no-field'.
 */
export function classifySlot(identity, level, relPath) {
  const noField = NO_FIELD_GROUPS.find((g) => g.matches(relPath));
  if (noField) return { kind: 'no-field', group: noField.group, noun: noField.noun, nouns: noField.nouns };

  if (relPath === 'media.image') {
    if (LIMITED.some((r) => r.level === level && matchesIdentity(r.identity, identity))) return { kind: 'limited' };
    if (CONFIRMED.some((r) => r.level === level && matchesIdentity(r.identity, identity))) return { kind: 'confirmed' };
  }
  return { kind: 'unconfirmed' };
}

// ─── alt text state and plausibility ─────────────────────────────────────────

/** 'absent' | 'empty' | 'present'. The literal two-character string "" counts as empty. */
export function altState(record) {
  const alt = record?.alt;
  if (alt === undefined || alt === null) return 'absent';
  if (typeof alt !== 'string') return 'present';
  const t = alt.trim();
  return t === '' || t === '""' ? 'empty' : 'present';
}

const PLACEHOLDERS = new Set(['image', 'picture', 'photo', 'graphic', 'logo', 'icon', 'untitled', 'alt text']);
const FILE_EXTENSION = /\.(jpe?g|png|gif|svg|webp|bmp|tiff?)(?![a-z0-9])/i;
const CAMERA_OR_SCREENSHOT = [/\bIMG[_-]?\d{3,}/i, /\bDSC[_-]?\d{3,}/i, /\bScreenshot[ _-]?\d{4}[-_ .]\d{2}[-_ .]\d{2}/i];
export const MAX_ALT_LENGTH = 150;

function basenames(record) {
  const names = [];
  for (const field of ['key', 'crushedKey', 'originalUrl', 'src']) {
    const v = record?.[field];
    if (typeof v !== 'string') continue;
    let name = v.split(/[?#]/)[0].split('/').pop();
    try { name = decodeURIComponent(name); } catch { /* keep the raw name */ }
    if (name && name.length >= 5) names.push(name.toLowerCase());
  }
  return names;
}

/** Plain-language reasons the alt text looks like a placeholder or file name. Empty array if none. */
export function altTextProblems(alt, record) {
  const problems = [];
  const text = String(alt);
  const lower = text.toLowerCase();

  if (FILE_EXTENSION.test(text) || CAMERA_OR_SCREENSHOT.some((re) => re.test(text)) || basenames(record).some((n) => lower.includes(n))) {
    problems.push('it looks like a file name');
  }
  if (PLACEHOLDERS.has(lower.trim().replace(/[\s.!:_-]+$/g, '').replace(/\s*\d+$/, ''))) {
    problems.push('it is a placeholder word, not a description');
  }
  if (text.length > MAX_ALT_LENGTH) {
    problems.push(`it is ${text.length} characters, over ${MAX_ALT_LENGTH}; long descriptions usually belong in a caption or the surrounding text`);
  }
  return problems;
}

// ─── finding messages ────────────────────────────────────────────────────────

const REMEDY_MISSING = 'Add alt text describing what the image conveys, or mark it decorative if it carries no information.';
const REMEDY_CHECK = 'Open the image in Rise: add alt text if it conveys information, or confirm that it is purely decorative.';
const REMEDY_EMPTY = 'If the image conveys information, add alt text. If it is purely decorative, an empty alt is correct.';
const REMEDY_TEXT = 'Rewrite the alt text as a short description of what the image conveys, with no file name or placeholder word.';

/** Findings for one image record in a slot of a given class. */
function assess({ slot, record, location }) {
  const image = imageRef(record);
  return assessState({ slot, record, location }).map((f) => ({ ...f, image }));
}

function assessState({ slot, record, location }) {
  const state = altState(record);

  if (state === 'absent') {
    if (slot.kind === 'confirmed') {
      return [
        {
          severity: 'REVIEW',
          location,
          message: 'This image has no alt text. Rise publishes it as decorative (an empty alt), so screen readers skip it. That is correct only if the image carries no information.',
          remediation: REMEDY_MISSING,
        },
      ];
    }
    const why =
      slot.kind === 'limited'
        ? 'No alt text was found. Articulate documents a Rise problem where alt text on Text on Image blocks is not output, so this cannot be confirmed from the export.'
        : 'No alt text was found. The export cannot show whether Rise offers an alt text field for this kind of image.';
    return [{ severity: 'REVIEW', location, message: why, remediation: REMEDY_CHECK }];
  }

  if (state === 'empty') {
    return [{ severity: 'REVIEW', location, message: 'The alt text is empty. That is correct only if the image is purely decorative.', remediation: REMEDY_EMPTY }];
  }

  const problems = altTextProblems(record.alt, record);
  if (!problems.length) return [];
  return [
    {
      severity: 'REVIEW',
      location,
      message: `The alt text may need attention: ${problems.join('; ')}.`,
      remediation: REMEDY_TEXT,
      measured: String(record.alt).length > MAX_ALT_LENGTH ? { value: String(record.alt).length, required: `${MAX_ALT_LENGTH} or fewer characters` } : null,
    },
  ];
}

// ─── locating image records ──────────────────────────────────────────────────

function isImageRecord(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v) && (typeof v.key === 'string' || typeof v.originalUrl === 'string' || typeof v.src === 'string');
}

/** Every image record inside an object, except under .items (the walker visits child items itself). */
function* imageRecords(node, path = '') {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* imageRecords(node[i], `${path}[${i}]`);
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === 'items') continue;
    const value = node[key];
    const p = path ? `${path}.${key}` : key;
    if (key === 'image' && isImageRecord(value)) yield { path: p, record: value };
    else yield* imageRecords(value, p);
  }
}

// ─── walking every image slot ────────────────────────────────────────────────

/** Every block and item that can own images, with its location and item path. */
function* owners(blocks) {
  for (const entry of blocks) {
    yield { owner: entry.block, level: 'block', identity: entry.identity, location: entry.location, prefix: '' };
    for (const it of walkItems(entry)) yield { owner: it.item, level: 'item', identity: entry.identity, location: it.location, prefix: it.itemPath };
  }
}

/**
 * Every image in the course, in course order: cover and logo first, then each
 * block and item. Shared by the check and the "All images" table so the two
 * can never disagree about which images exist or how a slot is classified.
 * Yields { slot, record, where }; course images have slot.kind 'course'.
 */
export function* imageSlots(course, blocks) {
  for (const [label, record] of [
    ['cover image', course?.coverImage?.media?.image],
    ['logo', course?.media?.image],
  ]) {
    if (isImageRecord(record)) yield { slot: { kind: 'course', label }, record, where: { scope: 'course' } };
  }
  for (const { owner, level, identity, location, prefix } of owners(blocks)) {
    for (const { path, record } of imageRecords(owner)) {
      yield { slot: classifySlot(identity, level, path), record, where: { ...location, itemPath: prefix ? `${prefix}.${path}` : path } };
    }
  }
}

/** Findings for one image that has an alt field (or may have one). Never FAIL. */
function assessSlot(slot, record, where) {
  if (slot.kind !== 'course') return assess({ slot, record, location: where });
  const { label } = slot;
  const image = imageRef(record);
  const state = altState(record);
  if (state === 'present') {
    const problems = altTextProblems(record.alt, record);
    return problems.length ? [{ severity: 'REVIEW', location: where, image, message: `The course ${label} alt text may need attention: ${problems.join('; ')}.`, remediation: REMEDY_TEXT }] : [];
  }
  return [
    {
      severity: 'REVIEW',
      location: where,
      image,
      message: `The course ${label} has ${state === 'absent' ? 'no alt text' : 'empty alt text'}. That is fine only if it is purely decorative.`,
      remediation: REMEDY_EMPTY,
    },
  ];
}

/**
 * The "All images" table: one row per image with the alt text stored in the
 * export and what the check concluded. It judges nothing new; "no problem
 * detected" means only that alt text exists and does not look like a
 * placeholder or file name. Whether it is accurate is for a person to decide.
 *
 * @returns {Array<{ location, image, altState: 'absent'|'empty'|'present', result: 'REVIEW'|'NO PROBLEM DETECTED'|'NOT CHECKED', note: string }>}
 */
export function imageInventory(course, blocks) {
  const rows = [];
  for (const { slot, record, where } of imageSlots(course, blocks)) {
    const base = { location: where, image: imageRef(record), altState: altState(record) };
    if (slot.kind === 'no-field') {
      rows.push({ ...base, result: 'NOT CHECKED', note: `Rise has no alt text field for this ${slot.noun.replace(/^image in an /, '')}.` });
      continue;
    }
    const findings = assessSlot(slot, record, where);
    rows.push(
      findings.length
        ? { ...base, result: 'REVIEW', note: findings[0].message }
        : { ...base, result: 'NO PROBLEM DETECTED', note: 'Alt text is present and does not look like a placeholder or file name. Check that it is accurate.' },
    );
  }
  return rows;
}

// ─── the check ───────────────────────────────────────────────────────────────

export const imageAlt = {
  id: 'image-alt',
  title: 'Image alternative text',
  sc: SC,
  // Blocks whose image slots are classified above. Other blocks are scanned only
  // to count decorative backgrounds, and are not claimed as read.
  inspects: [
    'image/*',
    'gallery/*',
    'flashcard/*',
    'quote/*',
    'interactive-fullscreen/interactive/labeledgraphic',
    'interactive-fullscreen/interactive/process',
    'interactive-fullscreen/interactive/scenario',
    'interactive/interactive/accordion',
    'interactive/interactive/tabs',
  ],

  run({ course, blocks }) {
    const results = [];
    const notChecked = new Map(); // `${lessonIndex}|${group}` -> { count, noun, nouns, location }

    for (const { slot, record, where } of imageSlots(course, blocks)) {
      if (slot.kind === 'no-field') {
        const key = `${where.lessonIndex}|${slot.group}`;
        const entry = notChecked.get(key) ?? { count: 0, noun: slot.noun, nouns: slot.nouns, location: { scope: 'lesson', lessonIndex: where.lessonIndex, lessonId: where.lessonId, lessonTitle: where.lessonTitle, lessonType: where.lessonType } };
        entry.count += 1;
        notChecked.set(key, entry);
        continue;
      }
      results.push(...assessSlot(slot, record, where));
    }

    // Scenario slides carry their own alt fields for the character and responses.
    for (const { owner, location, prefix } of owners(blocks)) {
      if (!Array.isArray(owner?.slides)) continue;
      owner.slides.forEach((slide, s) => {
        const slidePath = `${prefix ? `${prefix}.` : ''}slides[${s}]`;
        results.push(...assessSlideAlt(slide, { ...location, itemPath: `${slidePath}.alt` }, 'The scenario slide'));
        (slide?.responses ?? []).forEach((response, r) => {
          results.push(...assessSlideAlt(response, { ...location, itemPath: `${slidePath}.responses[${r}].alt` }, 'The scenario response'));
        });
      });
    }

    for (const { count, noun, nouns, location } of notChecked.values()) {
      results.push({
        severity: 'NOT CHECKED',
        location,
        message: `${count} ${count === 1 ? noun : nouns} in this lesson ${count === 1 ? 'has' : 'have'} no alt text field in Rise's data model, so ${count === 1 ? 'it was' : 'they were'} not checked.`,
      });
    }
    return results;
  },
};

function assessSlideAlt(node, location, subject) {
  const state = altState(node);
  if (state === 'present') {
    const problems = altTextProblems(node.alt, node);
    return problems.length ? [{ severity: 'REVIEW', location, message: `${subject} alt text may need attention: ${problems.join('; ')}.`, remediation: REMEDY_TEXT }] : [];
  }
  return [
    {
      severity: 'REVIEW',
      location,
      message: `${subject} has ${state === 'absent' ? 'no alt text' : 'empty alt text'}. The export cannot show whether it displays an image that needs one.`,
      remediation: REMEDY_CHECK,
    },
  ];
}
