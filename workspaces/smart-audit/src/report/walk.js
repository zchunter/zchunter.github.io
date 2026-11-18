/**
 * Shared course walker.
 *
 * Every v1 check reads the raw parsed Rise course (the object returned by
 * extractCourse) through these helpers, so each finding can say exactly where
 * it was found: which lesson, which block, which nested item.
 *
 * Pure functions: no DOM, no ZIP access, no network. See docs/SCOPE-V1.md.
 *
 * Shapes observed in real exports:
 *   course.lessons[]            type: 'blocks' | 'section' | 'quiz'
 *   lesson.items[]              blocks (family/type/variant) for 'blocks' lessons;
 *                               questions (no family/variant) for 'quiz' lessons;
 *                               absent for 'section' lessons by design
 *   block.items[]               item rows, nested arbitrarily via .items[]
 */

/** Course-wide location, for findings that do not belong to one block. */
export function courseLocation() {
  return { scope: 'course' };
}

/**
 * "family/type/variant". Missing parts are shown as "?" rather than the
 * string "undefined" (quiz-lesson questions have no family or variant).
 */
export function blockIdentity(block) {
  const part = (v) => (v === undefined || v === null || v === '' ? '?' : String(v));
  return `${part(block?.family)}/${part(block?.type)}/${part(block?.variant)}`;
}

/**
 * Match an identity against a pattern. A segment of "*" matches anything.
 * A pattern with fewer segments than the identity must end in "*", which then
 * matches all remaining segments: "text/*" matches "text/text/paragraph",
 * and "*" matches everything.
 */
export function matchesIdentity(pattern, identity) {
  const p = String(pattern).split('/');
  const i = String(identity).split('/');
  const last = p.length - 1;
  if (p[last] === '*' && p.length <= i.length) {
    return p.slice(0, last).every((seg, k) => seg === '*' || seg === i[k]);
  }
  return p.length === i.length && p.every((seg, k) => seg === '*' || seg === i[k]);
}

export function lessonsOf(courseData) {
  const lessons = courseData?.course?.lessons;
  return Array.isArray(lessons) ? lessons : [];
}

/** Every lesson, including section dividers and quiz lessons. */
export function* walkLessons(courseData) {
  const lessons = lessonsOf(courseData);
  for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
    const lesson = lessons[lessonIndex];
    yield {
      lesson,
      lessonIndex,
      location: {
        scope: 'lesson',
        lessonIndex,
        lessonId: lesson?.id ?? null,
        lessonTitle: typeof lesson?.title === 'string' ? lesson.title : '',
        lessonType: lesson?.type ?? null,
      },
    };
  }
}

/** Every entry in lesson.items[]: blocks, or questions in quiz lessons. */
export function* walkBlocks(courseData) {
  for (const { lesson, lessonIndex, location: lessonLocation } of walkLessons(courseData)) {
    const items = Array.isArray(lesson?.items) ? lesson.items : [];
    for (let blockIndex = 0; blockIndex < items.length; blockIndex++) {
      const block = items[blockIndex];
      const identity = blockIdentity(block);
      yield {
        lesson,
        lessonIndex,
        block,
        blockIndex,
        identity,
        location: {
          ...lessonLocation,
          scope: 'block',
          blockIndex,
          blockId: block?.id ?? null,
          identity,
        },
      };
    }
  }
}

/**
 * Every nested item under a block, depth-first, with a path such as
 * "items[2].items[0]". Takes an entry yielded by walkBlocks().
 */
export function* walkItems(blockEntry) {
  yield* visitItems(blockEntry.block?.items, 'items', blockEntry.location, 1);
}

function* visitItems(items, path, baseLocation, depth) {
  if (!Array.isArray(items)) return;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemPath = `${path}[${i}]`;
    yield {
      item,
      itemPath,
      depth,
      location: { ...baseLocation, scope: 'item', itemPath, itemId: item?.id ?? null },
    };
    if (item && typeof item === 'object') {
      yield* visitItems(item.items, `${itemPath}.items`, baseLocation, depth + 1);
    }
  }
}

/** Every string anywhere inside a value, with its property path. */
export function* walkStrings(value, path = '') {
  if (typeof value === 'string') {
    yield { value, path };
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* walkStrings(value[i], `${path}[${i}]`);
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) yield* walkStrings(value[key], path ? `${path}.${key}` : key);
  }
}

/** Human-readable location, for the report. Titles come first; positions are 1-based. */
export function describeLocation(location) {
  if (!location || location.scope === 'course') return 'Whole course';
  const parts = [];
  if (location.lessonIndex !== undefined) {
    const position = `outline item ${location.lessonIndex + 1}`;
    parts.push(location.lessonTitle ? `“${location.lessonTitle}” (${position})` : position);
  }
  if (location.blockIndex !== undefined) parts.push(`block ${location.blockIndex + 1} (${location.identity})`);
  if (location.itemPath) parts.push(location.itemPath);
  return parts.join(' › ');
}
