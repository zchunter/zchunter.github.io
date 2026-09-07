/**
 * Produces a complete human-readable inventory of an extracted Rise course.
 * Use this to manually verify extraction completeness against the actual course.
 *
 * Returns a plain object — JSON.stringify(dump, null, 2) to inspect,
 * or pass to the renderer in index.html.
 */

import { toStr, isEmptyAlt } from './extract.js';

// ─── Known sets ──────────────────────────────────────────────────────────────

// Fields we explicitly handle at the block level (not item level)
const HANDLED_BLOCK_FIELDS = new Set([
  'id', 'family', 'type', 'variant', 'items', 'media',
  // Styling / layout — present on nearly every block, no auditable content:
  'background',  // image placeholder container; only surfaced when key/crushedKey present
  'settings',    // padding, colors, animation flags — pure presentation
  'data',        // always {} in observed data
]);

export const KNOWN_BLOCK_IDENTITIES = new Set([
  'buttons/interactive/button',
  'buttons/interactive/button stack',
  'continue/divider/continue',
  'divider/divider/divider',
  'flashcard/interactive/flashcard',
  'image/image/hero',
  'image/image/text aside',
  'impact/text/d',
  'interactive-fullscreen/interactive/labeledgraphic',
  'interactive-fullscreen/interactive/process',
  'interactive-fullscreen/interactive/scenario',
  'interactive-fullscreen/interactive/timeline',
  'interactive/interactive/accordion',
  'interactive/interactive/tabs',
  'knowledgeCheck/knowledgeCheck/multiple choice',
  'list/list/bulleted',
  'text/text/heading',
  'text/text/heading paragraph',
  'text/text/paragraph',
  'text/text/subheading',
  'text/text/subheading paragraph',
]);

// Fields we explicitly read and surface in the dump
const HANDLED_ITEM_FIELDS = new Set([
  'heading', 'paragraph', 'description', 'title', 'label', 'caption', 'completeHint', 'date',
  'media', 'destination', 'slides', 'items',
  'front', 'back',                              // flashcard
  'answers', 'feedbackType', 'feedbackCorrect', 'feedbackIncorrect', 'feedback', // knowledge check
  'character', 'background',                    // scenario
]);

// Fields that are present but intentionally not content (metadata, positioning, styling)
const IGNORED_ITEM_FIELDS = new Set([
  'id', 'type', 'x', 'y', 'icon', 'hasMedia', 'isActive', 'isHidden', 'isNewlyInserted',
  'buttonColor', 'goTo', 'nextSlide', 'emotion', 'hasCharacter', 'position',
  'duplicatedFromId', 'createdAt', 'updatedAt', 'deleted', 'ready',
]);

/**
 * @param {object} courseData - Parsed courseData from extractCourse()
 * @param {object} meta       - Meta object from extractCourse()
 * @returns {object}          Full structured inventory
 */
/**
 * @param {object} courseData - Parsed courseData from extractCourse()
 * @param {object} meta       - Meta object from extractCourse()
 * @returns {object}          Full structured inventory
 */
export function dumpCourse(courseData, meta) {
  const course = courseData.course;

  return {
    meta: {
      id:          meta.id,
      title:       meta.title,
      description: meta.description,
      activityId:  meta.activityId,
      coverImage:  dumpImage(course.coverImage?.media?.image, 'course.coverImage.media.image'),
      logo:        dumpImage(course.media?.image, 'course.media.image'),
    },
    summary: {
      lessonCount: course.lessons?.length ?? 0,
      lessons:     (course.lessons ?? []).map(l => ({
        id: l.id, title: l.title, type: l.type,
        blockCount: l.items?.length ?? 0,
      })),
    },
    lessons: (course.lessons ?? []).map(dumpLesson),
  };
}

// ─── Lesson ──────────────────────────────────────────────────────────────────

function dumpLesson(lesson) {
  return {
    id:     lesson.id,
    title:  lesson.title,
    type:   lesson.type,   // 'section' | 'blocks'
    blocks: (lesson.items ?? []).map(dumpBlock),
  };
}

// ─── Block ───────────────────────────────────────────────────────────────────

function dumpBlock(block) {
  const identity = `${block.family}/${block.type}/${block.variant}`;
  const isUnknown = !KNOWN_BLOCK_IDENTITIES.has(identity);
  const out = {
    id:       block.id,
    identity,
    family:   block.family,
    unknown:  isUnknown,
  };

  // block.media.image — background image on interactive-fullscreen blocks
  if (block.media?.image) {
    out.backgroundImage = dumpImage(block.media.image, 'block.media.image');
  }

  // block.background.media.image — styling placeholder on nearly every block type.
  // Only surface when a real image is present (key or crushedKey populated).
  if (block.background?.media?.image) {
    const bgImg = block.background.media.image;
    if (bgImg.key || bgImg.crushedKey) {
      out.backgroundImage = out.backgroundImage
        ?? dumpImage(bgImg, 'block.background.media.image');
    }
  }

  // Track any block-level fields we haven't explicitly handled
  const unknownBlockFields = Object.entries(block)
    .filter(([k, v]) => !HANDLED_BLOCK_FIELDS.has(k) && v !== null && v !== undefined)
    .map(([k, v]) => ({ key: k, valueType: Array.isArray(v) ? 'array' : typeof v, value: v }));
  if (unknownBlockFields.length) out.unknownBlockFields = unknownBlockFields;

  out.items = (block.items ?? []).map((item, idx) => dumpItem(item, block, idx));

  // For unknown block types, also store the raw block structure so it can be
  // inspected and fed back to update handling in future iterations.
  if (isUnknown) {
    out.rawBlock = {
      family:  block.family,
      type:    block.type,
      variant: block.variant,
      media:   block.media ?? null,
      items:   block.items ?? [],
    };
  }

  return out;
}

// ─── Item (generic dispatcher) ───────────────────────────────────────────────

function dumpItem(item, parentBlock, index = 0) {
  const family  = parentBlock?.family  ?? '';
  const variant = parentBlock?.variant ?? '';

  // Dispatch to specialised handlers where structure differs meaningfully
  if (family === 'flashcard')                                              return dumpFlashcardItem(item);
  if (family === 'knowledgeCheck')                                         return dumpKnowledgeCheckItem(item);
  if (item.slides)                                                         return dumpScenarioItem(item);
  if (family === 'interactive-fullscreen' && variant === 'labeledgraphic') return dumpLabeledGraphicItem(item, index);

  return dumpGenericItem(item, parentBlock);
}

// ─── Generic item ────────────────────────────────────────────────────────────

function dumpGenericItem(item, parentBlock) {
  const out = { id: item.id, type: item.type };

  // Collect all text-bearing fields by name so the dump shows exactly where content came from.
  // Rise uses different field names per block family — collect them all.
  const textFields = ['heading', 'paragraph', 'description', 'title', 'label', 'caption', 'completeHint', 'date'];
  for (const field of textFields) {
    const val = toStr(item[field]);
    if (val) out[field] = val;
  }

  // media field handling:
  //   - item.media absent:         block type doesn't support a media slot → omit image row
  //   - item.media = {}:           slot exists but nothing placed → flag as empty
  //   - item.media.image present:  real image → dump it
  if (item.media !== undefined && item.media !== null) {
    if (item.media.image) {
      out.image = dumpImage(item.media.image, 'item.media.image');
    } else {
      out.imageSlotEmpty = true;  // slot intentionally present but no image placed
    }
  }

  // Links embedded in any HTML field
  const allHtml = textFields.map(f => toStr(item[f])).join(' ');
  const links = extractLinks(allHtml);
  if (links.length) out.links = links;

  // Button / link destination
  if (item.destination !== undefined) {
    out.destination = dumpDestination(item.destination);
  }

  // Nested sub-items (accordion panels, tabs, button-stack entries, process/timeline steps, labeled graphic markers)
  if (item.items?.length) {
    out.items = item.items.map(child => dumpGenericItem(child, parentBlock));
  }

  // Track fields present in the data that we don't explicitly handle or intentionally ignore.
  // Captures actual values so unknowns can be reported back for future handling.
  const unknownFields = Object.entries(item)
    .filter(([k, v]) =>
      !HANDLED_ITEM_FIELDS.has(k) &&
      !IGNORED_ITEM_FIELDS.has(k) &&
      !textFields.includes(k) &&
      v !== null && v !== undefined && v !== ''
    )
    .map(([k, v]) => ({
      key:       k,
      valueType: Array.isArray(v) ? 'array' : typeof v,
      // Include the actual value so it can be reviewed and fed back for future handling.
      // Strings are stored as-is (HTML included); objects/arrays are stored whole.
      value: v,
    }));

  if (unknownFields.length) out.unknownFields = unknownFields;

  return out;
}

// ─── Flashcard item ──────────────────────────────────────────────────────────

// ─── Labeled graphic marker ──────────────────────────────────────────────────

// Confirmed icon code → display label mappings (verified against real Rise exports).
// Codes 17–21 = numbered circles 1–5, confirmed via a 5-marker labeled graphic.
// TODO: identify codes for arrows, pins, and other non-numbered marker styles.
//       Codes beyond 21 likely continue the numbered sequence (22 = 6, etc.) but are unverified.
const KNOWN_ICON_LABELS = {
  '17': '1', '18': '2', '19': '3', '20': '4', '21': '5',
};

function dumpLabeledGraphicItem(item, index) {
  const iconLabel = item.icon != null ? (KNOWN_ICON_LABELS[item.icon] ?? null) : null;

  const out = {
    id:        item.id,
    blockType: 'labeledgraphic',
    sequence:  index + 1,         // 1-based position in the marker list — always valid
    icon:      item.icon ?? null, // raw code; Rise uses this to select the icon style at runtime
    iconLabel,                    // confirmed display label (e.g. "1"), or null if unrecognised
    x: item.x !== undefined ? `${parseFloat(item.x).toFixed(1)}%` : null,
    y: item.y !== undefined ? `${parseFloat(item.y).toFixed(1)}%` : null,
    title:       toStr(item.title)       || null,
    description: toStr(item.description) || null,
  };

  const HANDLED_LG = new Set(['id', 'icon', 'x', 'y', 'title', 'description',
                               'isActive', 'hasMedia', 'isNewlyInserted']);
  const unknownFields = Object.entries(item)
    .filter(([k, v]) => !HANDLED_LG.has(k) && v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({ key: k, valueType: Array.isArray(v) ? 'array' : typeof v, value: v }));
  if (unknownFields.length) out.unknownFields = unknownFields;

  return out;
}

// ─── Flashcard item ──────────────────────────────────────────────────────────

function dumpFlashcardItem(item) {
  const out = { id: item.id, type: item.type, blockType: 'flashcard' };

  out.front = {
    description: toStr(item.front?.description) || null,
    // Flashcard images have no alt field in the Rise data model — flag for manual review
    image: item.front?.media?.image
      ? { ...dumpImage(item.front.media.image, 'item.front.media.image'), noAltField: true }
      : null,
  };

  out.back = {
    description: toStr(item.back?.description) || null,
    image: item.back?.media?.image
      ? { ...dumpImage(item.back.media.image, 'item.back.media.image'), noAltField: true }
      : null,
  };

  return out;
}

// ─── Knowledge check item ────────────────────────────────────────────────────

function dumpKnowledgeCheckItem(item) {
  // Question text is in item.title (HTML); answer text is in answer.title (not answer.text)
  const answers = (item.answers ?? []).map((a, i) => ({
    index:    i,
    text:     toStr(a.title),   // NOTE: field is 'title', not 'text'
    correct:  a.correct ?? false,
    feedback: toStr(a.feedback) || null,
  }));

  return {
    id:   item.id,
    type: item.type,
    blockType: 'knowledgeCheck',
    questionText:   toStr(item.title),
    feedbackType:   item.feedbackType ?? null,    // 'CHOICE' | 'GENERAL'
    feedbackCorrect:   toStr(item.feedbackCorrect) || null,
    feedbackIncorrect: toStr(item.feedbackIncorrect) || null,
    answers,
    // Derived flags
    hasCorrectAnswer: answers.some(a => a.correct),
    missingGeneralFeedback:
      item.feedbackType === 'GENERAL' && (!item.feedbackCorrect || !item.feedbackIncorrect),
    answersWithMissingChoiceFeedback:
      item.feedbackType === 'CHOICE'
        ? answers.filter(a => !a.feedback).map(a => a.index)
        : [],
  };
}

// ─── Scenario item ───────────────────────────────────────────────────────────

function dumpScenarioItem(item) {
  return {
    id:    item.id,
    type:  item.type,
    blockType: 'scenario',
    title: toStr(item.title) || null,
    // character.src is the character image — no alt field in data model
    character: item.character
      ? { name: item.character.name ?? null, src: item.character.src ?? null, noAltField: true }
      : null,
    // background.media (not background.media.image directly)
    backgroundImage: item.background?.media?.image
      ? dumpImage(item.background.media.image, 'item.background.media.image')
      : null,
    slides: (item.slides ?? []).map(dumpSlide),
  };
}

function dumpSlide(slide) {
  return {
    id:          slide.id,
    type:        slide.type,
    title:       toStr(slide.title) || null,
    description: toStr(slide.description) || null,
    // Character alt text lives directly on the slide
    alt:      slide.alt ?? null,
    altEmpty: isEmptyAlt(slide.alt),
    path:     'slides[n].alt',
    responses: (slide.responses ?? []).map((r, i) => ({
      index:    i,
      alt:      r.alt ?? null,
      altEmpty: isEmptyAlt(r.alt),
      path:     'slides[n].responses[n].alt',
      text:     toStr(r.description ?? r.text) || null,
    })),
  };
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function dumpImage(image, path) {
  if (!image) return null;
  // useCrushedKey determines which field holds the local asset filename:
  //   true  → crushedKey is the filename in assets/
  //   false → key is the filename in assets/
  const localKey    = image.useCrushedKey ? image.crushedKey : image.key;
  const rawFilename = localKey ? localKey.split('/').pop() : null;

  // crushedKey/key values are sometimes percent-encoded ("SSML%20Play%20Prompt.jpg") while
  // the actual file in assets/ uses literal characters.  Decode for reliable lookup.
  let localFilename = rawFilename;
  if (rawFilename) {
    try { localFilename = decodeURIComponent(rawFilename); } catch { /* malformed — use raw */ }
  }

  const filename = image.originalUrl ?? localFilename ?? null;
  return {
    filename,
    localFilename,   // decoded bare filename for blob URL lookup in the browser
    rawFilename,     // original (possibly encoded) form as fallback
    alt:      image.alt ?? null,
    altEmpty: isEmptyAlt(image.alt),
    path,
    // Remote fallbacks — not in the ZIP. The browser layer (src/images.js) prefers
    // a local blob URL and only falls back to these for display.
    originalUrl:  image.originalUrl ?? null,
    thumbnailUrl: image.thumbnail ?? null,
    remoteSrc:    (typeof image.src === 'string' && image.src.startsWith('http')) ? image.src : null,
  };
}

function dumpDestination(value) {
  return {
    value:          value ?? null,
    empty:          !value,
    missingProtocol: value
      ? value.startsWith('www.') && !value.startsWith('http')
      : false,
  };
}

function extractLinks(html) {
  if (!html) return [];
  const links = [];
  const re = /href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    links.push({
      href,
      empty:           !href,
      missingProtocol: href
        ? href.startsWith('www.') && !href.startsWith('http')
        : false,
    });
  }
  return links;
}

// ─── Unknowns report ─────────────────────────────────────────────────────────

/**
 * Aggregates all unknown blocks and unknown fields from a completed dump into
 * a single report object suitable for pasting back to update handling.
 *
 * @param {object} dump - Output of dumpCourse()
 * @returns {object}    { unknownBlocks, unknownFields } — both arrays, empty if nothing new found
 */
export function buildUnknownsReport(dump) {
  const unknownBlocks      = [];
  const unknownBlockFields = [];
  const unknownFields      = [];

  for (const lesson of dump.lessons) {
    for (const block of lesson.blocks ?? []) {
      if (block.unknown) {
        unknownBlocks.push({
          identity: block.identity,
          lesson:   lesson.title,
          rawBlock: block.rawBlock,
        });
      }

      if (block.unknownBlockFields?.length) {
        unknownBlockFields.push({
          identity: block.identity,
          lesson:   lesson.title,
          fields:   block.unknownBlockFields,
        });
      }

      for (const item of block.items ?? []) {
        collectUnknownFields(item, block.identity, lesson.title, unknownFields);
      }
    }
  }

  return { unknownBlocks, unknownBlockFields, unknownFields };
}

function collectUnknownFields(item, blockIdentity, lessonTitle, out) {
  if (!item.unknownFields?.length) return;

  out.push({
    blockIdentity,
    lesson:        lessonTitle,
    itemId:        item.id,
    unknownFields: item.unknownFields,
  });

  // Recurse into nested items
  for (const child of item.items ?? []) {
    collectUnknownFields(child, blockIdentity, lessonTitle, out);
  }
}
