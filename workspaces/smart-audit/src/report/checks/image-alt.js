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
 *                exports, so the field exists. Missing alt -> FAIL.
 *   unconfirmed  only a missing alt has ever been seen, so the export cannot
 *                prove Rise offers a field. Missing alt -> REVIEW, never FAIL.
 *   limited      Articulate documents a bug: alt text is not output. -> REVIEW.
 *   no-field     Rise has no alt field here (backgrounds, flashcard faces,
 *                avatars, unused editor slots). -> NOT CHECKED, grouped per
 *                lesson so a deck of decorative backgrounds is one line.
 *
 * Unknown slots default to "unconfirmed": a new block type must never
 * produce a FAIL until real evidence promotes it to "confirmed".
 */

import { walkItems, matchesIdentity } from '../walk.js';

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
  { group: 'editor-slot', matches: (p) => p.split('.').includes('tmp'), noun: 'image in an unused editor slot' },
  { group: 'flashcard', matches: (p) => /^(front|back)\./.test(p), noun: 'flashcard image' },
  { group: 'avatar', matches: (p) => /^avatar\./.test(p), noun: 'avatar image' },
  { group: 'background', matches: (p) => /^background\./.test(p), noun: 'background image' },
];

/**
 * relPath is the path inside the block or item that owns the image, e.g.
 * "media.image". Returns { kind, group?, noun? }; kind is one of
 * 'confirmed' | 'unconfirmed' | 'limited' | 'no-field'.
 */
export function classifySlot(identity, level, relPath) {
  const noField = NO_FIELD_GROUPS.find((g) => g.matches(relPath));
  if (noField) return { kind: 'no-field', group: noField.group, noun: noField.noun };

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
  const state = altState(record);

  if (state === 'absent') {
    if (slot.kind === 'confirmed') {
      return [{ severity: 'FAIL', location, message: 'This image has no alt text.', remediation: REMEDY_MISSING }];
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
    const notChecked = new Map(); // `${lessonIndex}|${kind}` -> { count, noun, location }

    const visit = (owner, level, identity, location, itemPathPrefix) => {
      for (const { path, record } of imageRecords(owner)) {
        const slot = classifySlot(identity, level, path);
        const where = { ...location, itemPath: itemPathPrefix ? `${itemPathPrefix}.${path}` : path };

        if (slot.kind === 'no-field') {
          const key = `${location.lessonIndex}|${slot.group}`;
          const entry = notChecked.get(key) ?? { count: 0, noun: slot.noun, location: { scope: 'lesson', lessonIndex: location.lessonIndex, lessonId: location.lessonId, lessonTitle: location.lessonTitle, lessonType: location.lessonType } };
          entry.count += 1;
          notChecked.set(key, entry);
          continue;
        }
        results.push(...assess({ slot, record, location: where }));
      }

      // Scenario slides carry their own alt fields for the character and responses.
      if (owner && Array.isArray(owner.slides)) {
        owner.slides.forEach((slide, s) => {
          const slidePath = `${itemPathPrefix ? `${itemPathPrefix}.` : ''}slides[${s}]`;
          results.push(...assessSlideAlt(slide, { ...location, itemPath: `${slidePath}.alt` }, 'The scenario slide'));
          (slide?.responses ?? []).forEach((response, r) => {
            results.push(...assessSlideAlt(response, { ...location, itemPath: `${slidePath}.responses[${r}].alt` }, 'The scenario response'));
          });
        });
      }
    };

    for (const entry of blocks) {
      visit(entry.block, 'block', entry.identity, entry.location, '');
      for (const it of walkItems(entry)) visit(it.item, 'item', entry.identity, it.location, it.itemPath);
    }

    // Course-level images: cover and logo.
    const courseWhere = { scope: 'course' };
    for (const [label, record] of [
      ['cover image', course?.coverImage?.media?.image],
      ['logo', course?.media?.image],
    ]) {
      if (!isImageRecord(record)) continue;
      const state = altState(record);
      if (state === 'present') {
        const problems = altTextProblems(record.alt, record);
        if (problems.length) results.push({ severity: 'REVIEW', location: courseWhere, message: `The course ${label} alt text may need attention: ${problems.join('; ')}.`, remediation: REMEDY_TEXT });
      } else {
        results.push({
          severity: 'REVIEW',
          location: courseWhere,
          message: `The course ${label} has ${state === 'absent' ? 'no alt text' : 'empty alt text'}. That is fine only if it is purely decorative.`,
          remediation: REMEDY_EMPTY,
        });
      }
    }

    for (const { count, noun, location } of notChecked.values()) {
      results.push({
        severity: 'NOT CHECKED',
        location,
        message: `${count} ${noun}${count === 1 ? '' : 's'} in this lesson ${count === 1 ? 'has' : 'have'} no alt text field in Rise's data model, so ${count === 1 ? 'it was' : 'they were'} not checked.`,
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
