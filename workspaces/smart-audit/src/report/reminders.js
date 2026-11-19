/**
 * Section 2: "Keep in mind" (docs/SCOPE-V1.md). Things the author controls
 * but a tool cannot check. Static wording, shown only when the course
 * contains the relevant content. Wording is deliberately plain and makes no
 * claim beyond what the export lets us count.
 */

import { matchesIdentity } from './walk.js';

const INTERACTIVE_PATTERNS = ['interactive/*', 'interactive-fullscreen/*', 'flashcard/*', 'knowledgeCheck/*'];
const INLINE_COLOUR = /style\s*=\s*"[^"]*\bcolor\s*:/gi;

/** Count the things reminders depend on. Reads the raw course; never mutates it. */
export function scanFacts(courseData, blocks, inventory) {
  const facts = { images: 0, videos: 0, embeds: inventory.embeds.length, attachments: inventory.attachments.length, inlineColours: 0, interactiveBlocks: 0 };

  facts.interactiveBlocks = blocks.filter((b) => INTERACTIVE_PATTERNS.some((p) => matchesIdentity(p, b.identity))).length;

  const visit = (node, key) => {
    if (typeof node === 'string') {
      const m = node.match(INLINE_COLOUR);
      if (m) facts.inlineColours += m.length;
    } else if (Array.isArray(node)) {
      node.forEach((n) => visit(n, key));
    } else if (node && typeof node === 'object') {
      if (key === 'image' && (node.key || node.originalUrl || node.src)) facts.images += 1;
      if (key === 'video' && (node.key || node.url)) facts.videos += 1;
      for (const k of Object.keys(node)) visit(node[k], k);
    }
  };
  visit(courseData?.course?.lessons, 'lessons');
  return facts;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const REMINDERS = Object.freeze([
  {
    id: 'alt-quality',
    sc: ['1.1.1'],
    title: 'Alt text quality',
    when: (f) => f.images > 0,
    text: (f) =>
      `This course has ${plural(f.images, 'image reference')}. The tool checks that alt text exists and looks plausible, not that it describes the image well. Read each image's alt text next to the image.`,
  },
  {
    id: 'media-alternatives',
    sc: ['1.2.2', '1.2.3', '1.2.5'],
    title: 'Captions and audio description',
    when: (f) => f.videos + f.embeds > 0,
    text: (f) =>
      `This course has ${plural(f.videos, 'video')} and ${plural(f.embeds, 'external embed')}. Caption accuracy and audio description cannot be verified from the export. Play each one with captions on, and check that important visual information is also available as text or audio.`,
  },
  {
    id: 'inline-colour',
    sc: ['1.4.1', '1.4.3'],
    title: 'Text colours set inside content',
    when: (f) => f.inlineColours > 0,
    text: (f) =>
      `${plural(f.inlineColours, 'text colour setting')} appear inside rich text and were not contrast-checked; v1 checks only the theme accent colour. Check them by eye or with a colour tool, and make sure colour is never the only way meaning is conveyed.`,
  },
  {
    id: 'interactive-blocks',
    sc: ['2.1.1', '2.4.3', '2.4.7', '4.1.2'],
    title: 'Interactive blocks',
    when: (f) => f.interactiveBlocks > 0,
    text: (f) =>
      `This course has ${plural(f.interactiveBlocks, 'interactive block')}. Their keyboard and screen reader behaviour comes from Rise and was not tested here. Try each one using only the keyboard.`,
  },
  {
    id: 'attached-documents',
    sc: ['1.1.1', '1.3.1'],
    title: 'Attached documents',
    when: (f) => f.attachments > 0,
    text: (f) =>
      `This course attaches ${plural(f.attachments, 'document')}. Each is a separate file that must meet accessibility requirements of its own; they were not opened.`,
  },
  {
    id: 'sensory-language',
    sc: ['1.3.3'],
    title: 'Instructions that rely on appearance or position',
    when: () => true,
    text: () =>
      'Instructions such as "click the green button" or "see the image on the right" depend on colour, shape or position that some learners cannot perceive. Read your text for them.',
  },
  {
    id: 'human-read-through',
    sc: ['1.3.2', '2.4.6'],
    title: 'A human read-through',
    when: () => true,
    text: () =>
      'Reading order, and whether headings and links describe what follows, need a person. This tool reads the export, not the running course: test the published course with a keyboard and a screen reader before relying on any result.',
  },
]);

/** The reminders that apply to this course. */
export function buildReminders(facts) {
  return REMINDERS.filter((r) => r.when(facts)).map((r) => ({
    id: r.id,
    sc: r.sc,
    title: r.title,
    text: r.text(facts),
  }));
}
