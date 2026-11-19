/**
 * Tests for the first v1 checks: image alternative text and theme contrast,
 * plus the colour maths and the finding "basis" label.
 *
 * Fixtures are hand-built. Real third-party exports are never committed; one
 * skip-safe test at the end runs the checks over a local sample if present.
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { parseHex, toHex, contrastRatio, formatRatio, nearestCompliantOnWhite } from '../src/report/colour.js';
import { classifySlot, altState, altTextProblems, imageAlt, MAX_ALT_LENGTH } from '../src/report/checks/image-alt.js';
import { themeContrast } from '../src/report/checks/theme-contrast.js';
import { CHECKS } from '../src/report/checks/index.js';
import { runChecks } from '../src/report/run-checks.js';
import { buildReport } from '../src/report/report.js';
import { renderReport } from '../src/report/render-report.js';
import { createFinding } from '../src/report/finding.js';
import { courseLocation } from '../src/report/walk.js';
import { extractCourse } from '../src/extract.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const img = (extra = {}) => ({ key: 'folder/file.png', type: 'image', ...extra });
const block = (identity, props = {}) => {
  const [family, type, variant] = identity.split('/');
  return { id: `b-${identity}`, family, type, variant, items: [], ...props };
};
const course = (blocks, courseProps = {}) => ({
  course: { title: 'T', lessons: [{ id: 'l1', title: 'Lesson', type: 'blocks', items: blocks }], ...courseProps },
});
const run = (courseData, check = imageAlt) => runChecks(courseData, [check]);
const bySeverity = (results, severity) => results.filter((r) => r.severity === severity);

// ─── colour maths ────────────────────────────────────────────────────────────

describe('colour', () => {
  test.each([
    ['#fff', { r: 255, g: 255, b: 255 }],
    ['#FFFFFF', { r: 255, g: 255, b: 255 }],
    ['0b5cad', { r: 11, g: 92, b: 173 }],
    ['  #000 ', { r: 0, g: 0, b: 0 }],
  ])('parseHex(%s)', (input, expected) => expect(parseHex(input)).toEqual(expected));

  test.each(['', 'red', '#12', '#12345', '#1234567', 'rgb(1,2,3)', null, undefined, 42])('parseHex rejects %p', (input) => {
    expect(parseHex(input)).toBeNull();
  });

  test('toHex round-trips and clamps', () => {
    expect(toHex({ r: 11, g: 92, b: 173 })).toBe('#0b5cad');
    expect(toHex({ r: 300, g: -5, b: 0.4 })).toBe('#ff0000');
  });

  test('contrast ratio matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5); // the well-known lightest grey that passes
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5); // order and shorthand do not matter
  });

  test('contrast ratio is null for an invalid colour', () => {
    expect(contrastRatio('nope', '#fff')).toBeNull();
  });

  test('formatRatio truncates and never rounds a failing ratio up to a pass', () => {
    expect(formatRatio(4.4999)).toBe('4.49');
    expect(formatRatio(4.5)).toBe('4.50');
    expect(formatRatio(21)).toBe('21.00');
  });

  test('nearestCompliantOnWhite darkens just enough, keeping the hue', () => {
    const out = nearestCompliantOnWhite('#777777');
    const ratio = contrastRatio(out, '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeLessThan(4.6); // minimal change, not a jump to black
    const orange = nearestCompliantOnWhite('#ff8800');
    expect(contrastRatio(orange, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    const { r, g, b } = parseHex(orange);
    expect(r).toBeGreaterThan(b); // still orange
  });

  test('nearestCompliantOnWhite leaves a passing colour alone and rejects invalid input', () => {
    expect(nearestCompliantOnWhite('#000000')).toBe('#000000');
    expect(nearestCompliantOnWhite('nope')).toBeNull();
  });

  test.each(['#ffff00', '#ffffff', '#7c5aed', '#e51f30', '#cccccc'])('suggestion for %s always passes 4.5:1', (hex) => {
    expect(contrastRatio(nearestCompliantOnWhite(hex), '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

// ─── finding basis ───────────────────────────────────────────────────────────

describe('finding basis', () => {
  const base = { checkId: 'c', sc: ['2.4.6'], severity: 'REVIEW', location: courseLocation(), message: 'm', remediation: 'r' };

  test('defaults to wcag', () => {
    expect(createFinding(base).basis).toBe('wcag');
  });

  test('best practice is allowed for REVIEW but can never be FAIL', () => {
    expect(createFinding({ ...base, basis: 'best-practice' }).basis).toBe('best-practice');
    expect(() => createFinding({ ...base, severity: 'FAIL', basis: 'best-practice' })).toThrow(/never be FAIL/);
  });

  test('rejects an unknown basis', () => {
    expect(() => createFinding({ ...base, basis: 'opinion' })).toThrow(TypeError);
  });

  test('the report labels best-practice findings', () => {
    const check = { id: 'x', title: 'X', sc: ['2.4.6'], run: () => [{ severity: 'REVIEW', basis: 'best-practice', location: courseLocation(), message: 'm', remediation: 'r' }] };
    const html = renderReport(buildReport(course([]), { checks: [check] }));
    expect(html).toContain('2.4.6 (best practice)');
  });
});

// ─── slot classification ─────────────────────────────────────────────────────

describe('classifySlot', () => {
  test.each([
    ['image/image/text aside', 'item', 'media.image', 'confirmed'],
    ['image/image/hero', 'item', 'media.image', 'confirmed'],
    ['interactive-fullscreen/interactive/labeledgraphic', 'block', 'media.image', 'confirmed'],
    ['interactive-fullscreen/interactive/process', 'item', 'media.image', 'confirmed'],
    ['interactive/interactive/accordion', 'item', 'media.image', 'confirmed'],
    ['image/image/text overlay', 'item', 'media.image', 'limited'],
    ['image/image/full', 'item', 'media.image', 'unconfirmed'],
    ['gallery/image/three column', 'item', 'media.image', 'unconfirmed'],
    ['interactive/interactive/tabs', 'item', 'media.image', 'unconfirmed'],
    ['brand/new/block', 'item', 'media.image', 'unconfirmed'], // unknown never becomes confirmed
    ['interactive-fullscreen/interactive/labeledgraphic', 'item', 'media.image', 'unconfirmed'], // wrong level
    ['text/text/paragraph', 'block', 'background.media.image', 'no-field'],
    ['quote/quote/c', 'item', 'background.media.image', 'no-field'],
    ['quote/quote/a', 'item', 'avatar.media.image', 'no-field'],
    ['flashcard/interactive/flashcard', 'item', 'front.media.image', 'no-field'],
    ['flashcard/interactive/flashcard', 'item', 'back.media.image', 'no-field'],
    ['interactive/interactive/accordion', 'item', 'media.tmp.image', 'no-field'],
  ])('%s (%s, %s) is %s', (identity, level, relPath, expected) => {
    expect(classifySlot(identity, level, relPath).kind).toBe(expected);
  });
});

// ─── alt state and text problems ─────────────────────────────────────────────

describe('altState', () => {
  test.each([
    [{}, 'absent'],
    [{ alt: null }, 'absent'],
    [{ alt: '' }, 'empty'],
    [{ alt: '   ' }, 'empty'],
    [{ alt: '""' }, 'empty'], // a literal pair of quote characters, seen in real exports
    [{ alt: 'A chart' }, 'present'],
  ])('%j is %s', (record, expected) => expect(altState(record)).toBe(expected));
});

describe('altTextProblems', () => {
  test.each([
    ['photo.jpg', 'file name'],
    ['See the .PNG here', 'file name'],
    ['IMG_4521', 'file name'],
    ['DSC00123 final', 'file name'],
    ['Screenshot 2026-03-11 at 4.02.11', 'file name'],
  ])('flags %p as a file name', (alt) => {
    expect(altTextProblems(alt, img()).join(' ')).toMatch(/file name/);
  });

  test('flags a file name taken from the image record itself', () => {
    expect(altTextProblems('Quarterly-Report-Chart', img({ key: 'x/y/Quarterly-Report-Chart' })).join(' ')).toMatch(/file name/);
    // The same words are fine when they do not match this image's own file name.
    expect(altTextProblems('Quarterly-Report-Chart', img({ key: 'x/y/photo-0042' }))).toEqual([]);
    expect(altTextProblems('quarterlyreport.final', img({ originalUrl: 'https://cdn.example/a/QuarterlyReport.final' })).join(' ')).toMatch(/file name/);
  });

  test.each(['image', 'Picture', 'PHOTO', 'graphic.', 'logo', 'Icon', 'untitled', 'alt text', 'Image 1', 'image2'])('flags placeholder %p', (alt) => {
    expect(altTextProblems(alt, img()).join(' ')).toMatch(/placeholder/);
  });

  test.each(['A bar chart of quarterly sales', 'Picture of a golden retriever', 'Company logo with a blue heron', 'Icons used in the legend'])('does not flag %p', (alt) => {
    expect(altTextProblems(alt, img())).toEqual([]);
  });

  test('flags text over the length limit, and not text at it', () => {
    expect(altTextProblems('a'.repeat(MAX_ALT_LENGTH + 1), img()).join(' ')).toMatch(/151 characters/);
    expect(altTextProblems('a'.repeat(MAX_ALT_LENGTH), img())).toEqual([]);
  });

  test('can report several problems at once', () => {
    expect(altTextProblems('image.png', img())).toHaveLength(1); // placeholder check needs the whole text
    expect(altTextProblems(`IMG_1234 ${'x'.repeat(200)}`, img()).length).toBe(2);
  });
});

// ─── the image alt check ─────────────────────────────────────────────────────

describe('image-alt check', () => {
  test('FAIL for a missing alt in a confirmed slot, with a precise location', () => {
    const data = course([block('image/image/text aside', { items: [{ id: 'i', media: { image: img() } }] })]);
    const [f] = run(data);
    expect(f).toMatchObject({ severity: 'FAIL', checkId: 'image-alt', sc: ['1.1.1'], basis: 'wcag' });
    expect(f.location).toMatchObject({ blockIndex: 0, itemPath: 'items[0].media.image', identity: 'image/image/text aside' });
    expect(f.remediation).toBeTruthy();
  });

  test('block-level slot (labeled graphic base image) is located without an item prefix', () => {
    const data = course([block('interactive-fullscreen/interactive/labeledgraphic', { media: { image: img() } })]);
    const [f] = run(data);
    expect(f.severity).toBe('FAIL');
    expect(f.location.itemPath).toBe('media.image');
  });

  test('a nested item is located by its full path', () => {
    const data = course([block('interactive/interactive/accordion', { items: [{ id: 'p', items: [{ id: 'q', media: { image: img() } }] }] })]);
    expect(run(data)[0].location.itemPath).toBe('items[0].items[0].media.image');
  });

  test('missing alt in an unconfirmed slot is REVIEW, never FAIL', () => {
    const data = course([block('gallery/image/two column', { items: [{ media: { image: img() } }] })]);
    const r = run(data);
    expect(bySeverity(r, 'FAIL')).toHaveLength(0);
    expect(r[0]).toMatchObject({ severity: 'REVIEW' });
    expect(r[0].message).toMatch(/cannot show whether Rise offers an alt text field/);
  });

  test('an unknown block type can never produce a FAIL', () => {
    const data = course([block('brand/new/thing', { items: [{ media: { image: img() } }] })]);
    expect(bySeverity(run(data), 'FAIL')).toHaveLength(0);
  });

  test('Text on Image is REVIEW and names the documented Rise problem', () => {
    const data = course([block('image/image/text overlay', { items: [{ media: { image: img() } }] })]);
    const [f] = run(data);
    expect(f.severity).toBe('REVIEW');
    expect(f.message).toMatch(/Text on Image/);
  });

  test.each([[''], ['""'], ['   ']])('empty alt %p is REVIEW, asking whether the image is decorative', (alt) => {
    const data = course([block('image/image/hero', { items: [{ media: { image: img({ alt }) } }] })]);
    const [f] = run(data);
    expect(f.severity).toBe('REVIEW');
    expect(f.message).toMatch(/purely decorative/);
  });

  test('good alt text produces nothing', () => {
    const data = course([block('image/image/hero', { items: [{ media: { image: img({ alt: 'A heron standing in shallow water' }) } }] })]);
    expect(run(data)).toEqual([]);
  });

  test('suspicious alt text is one REVIEW naming every reason', () => {
    const data = course([block('image/image/hero', { items: [{ media: { image: img({ alt: `IMG_4521 ${'x'.repeat(160)}` }) } }] })]);
    const r = run(data);
    expect(r).toHaveLength(1);
    expect(r[0].message).toMatch(/file name/);
    expect(r[0].message).toMatch(/characters/);
    expect(r[0].measured).toMatchObject({ required: '150 or fewer characters' });
  });

  test('items with no image, or an empty media object, produce nothing', () => {
    const data = course([block('image/image/hero', { items: [{ media: {} }, { paragraph: 'x' }, {}] })]);
    expect(run(data)).toEqual([]);
  });

  test('images in no-field slots are NOT CHECKED and grouped per lesson, not per image', () => {
    const bg = { background: { media: { image: img() } } };
    const data = course([
      block('text/text/paragraph', bg),
      block('text/text/heading', bg),
      block('continue/divider/continue', bg),
      block('flashcard/interactive/flashcard', { items: [{ front: { media: { image: img() } }, back: { media: { image: img() } } }] }),
      block('interactive/interactive/accordion', { items: [{ media: { tmp: { image: img() } } }] }),
    ]);
    const r = run(data);
    expect(bySeverity(r, 'FAIL')).toHaveLength(0);
    expect(bySeverity(r, 'REVIEW')).toHaveLength(0);
    const nc = bySeverity(r, 'NOT CHECKED');
    expect(nc).toHaveLength(3); // backgrounds, flashcard faces, editor slot
    const backgrounds = nc.find((n) => /background image/.test(n.message));
    expect(backgrounds.message).toMatch(/^3 background images in this lesson have no alt text field/);
    expect(backgrounds.location).toMatchObject({ scope: 'lesson', lessonIndex: 0, lessonTitle: 'Lesson' });
    expect(nc.find((n) => /flashcard image/.test(n.message)).message).toMatch(/^2 flashcard images/);
    expect(nc.find((n) => /editor slot/.test(n.message)).message).toMatch(/^1 image in an unused editor slot in this lesson has no alt text field/);
  });

  test('grouping is per lesson', () => {
    const bg = { background: { media: { image: img() } } };
    const data = {
      course: {
        lessons: [
          { id: 'a', title: 'A', type: 'blocks', items: [block('text/text/paragraph', bg)] },
          { id: 'b', title: 'B', type: 'blocks', items: [block('text/text/paragraph', bg), block('text/text/paragraph', bg)] },
        ],
      },
    };
    const nc = bySeverity(run(data), 'NOT CHECKED');
    expect(nc.map((n) => [n.location.lessonIndex, n.message.split(' ')[0]])).toEqual([[0, '1'], [1, '2']]);
  });

  test('scenario slides and responses with no alt are REVIEW, with exact paths', () => {
    const data = course([
      block('interactive-fullscreen/interactive/scenario', {
        items: [{ id: 's', slides: [{ id: 'x', alt: 'A nurse smiling', responses: [{ alt: '' }, { alt: 'ok' }] }, { id: 'y', responses: [] }] }],
      }),
    ]);
    const paths = run(data).map((f) => f.location.itemPath);
    expect(paths).toEqual(['items[0].slides[0].responses[0].alt', 'items[0].slides[1].alt']);
    expect(run(data).every((f) => f.severity === 'REVIEW')).toBe(true);
  });

  test('course cover and logo: missing alt is REVIEW at course scope; good alt is silent', () => {
    const missing = course([], { coverImage: { media: { image: img() } }, media: { image: img({ alt: 'Company logo, a blue heron' }) } });
    const r = run(missing);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severity: 'REVIEW', location: { scope: 'course' } });
    expect(r[0].message).toMatch(/cover image/);
  });

  test('a malformed course never throws', () => {
    expect(run({})).toEqual([]);
    expect(run({ course: { lessons: [{ items: [null, 5, { items: [null] }] }] } })).toEqual([]);
  });

  test('declares the blocks whose image slots it understands', () => {
    expect(imageAlt.inspects).toEqual(expect.arrayContaining(['image/*', 'gallery/*', 'interactive/interactive/accordion']));
    expect(imageAlt.inspects).not.toContain('*');
  });
});

// ─── the theme contrast check ────────────────────────────────────────────────

describe('theme-contrast check', () => {
  const withAccent = (hex, where = 'theme') => (where === 'theme' ? { course: { theme: { colorAccent: hex }, lessons: [] } } : { course: { color: hex, lessons: [] } });

  test('a colour that passes against white produces nothing', () => {
    expect(run(withAccent('#767676'), themeContrast)).toEqual([]);
    expect(run(withAccent('#000000'), themeContrast)).toEqual([]);
  });

  test('a colour just under 4.5:1 is REVIEW with measured ratios and a passing suggestion', () => {
    const [f] = run(withAccent('#777777'), themeContrast);
    expect(f).toMatchObject({ severity: 'REVIEW', sc: ['1.4.3', '1.4.11'], location: { scope: 'course' } });
    expect(f.message).toMatch(/#777777 has a contrast ratio of 4\.4\d:1 against white/);
    expect(f.message).toMatch(/meets the 3:1/);
    expect(f.message).toMatch(/not a confirmed failure/);
    const suggested = /darken it to (#[0-9a-f]{6})/.exec(f.remediation)[1];
    expect(contrastRatio(suggested, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(f.measured).toMatchObject({ required: expect.stringContaining('4.5:1') });
  });

  test('a very light colour also fails the 3:1 threshold and says so', () => {
    const [f] = run(withAccent('#ffee88'), themeContrast);
    expect(f.message).toMatch(/below both the 4\.5:1/);
  });

  test('never produces a FAIL, because the export cannot show where the colour is used', () => {
    for (const hex of ['#ffffff', '#ffff00', '#cccccc', '#777777', '#888']) {
      expect(bySeverity(run(withAccent(hex), themeContrast), 'FAIL')).toHaveLength(0);
    }
  });

  test('falls back to course.color when the theme has no accent', () => {
    expect(run(withAccent('#777777', 'color'), themeContrast)).toHaveLength(1);
  });

  test.each([[undefined], ['rgb(10,20,30)'], ['teal'], ['#12']])('an unusable accent (%p) is NOT CHECKED with a reason', (accent) => {
    const data = { course: { theme: accent === undefined ? {} : { colorAccent: accent }, lessons: [] } };
    const [f] = run(data, themeContrast);
    expect(f.severity).toBe('NOT CHECKED');
    expect(f.message).toBeTruthy();
  });

  test('reads no blocks, so it claims none as examined', () => {
    expect(themeContrast.inspects).toEqual([]);
  });
});

// ─── the checks together ─────────────────────────────────────────────────────

describe('registered checks', () => {
  test('image alt text and theme contrast are enabled', () => {
    expect(CHECKS.map((c) => c.id)).toEqual(['image-alt', 'theme-contrast']);
  });

  test('a full report over a small course has findings, NOT CHECKED items and honest coverage', () => {
    const data = {
      course: {
        title: 'Demo',
        theme: { colorAccent: '#999999' },
        lessons: [
          {
            id: 'l',
            title: 'L',
            type: 'blocks',
            items: [
              block('image/image/hero', { background: { media: { image: img() } }, items: [{ media: { image: img() } }] }),
              block('text/text/paragraph', { items: [{ paragraph: '<p>x</p>' }] }),
              block('html/html/inline', { items: [{ html: '<div></div>' }] }),
            ],
          },
        ],
      },
    };
    const report = buildReport(data, { now: new Date('2026-11-19T00:00:00Z') });
    expect(report.summary).toMatchObject({ fail: 1, review: 1, notChecked: 1 });
    expect(report.findings.map((f) => f.checkId)).toEqual(['image-alt', 'theme-contrast']);
    // The paragraph and the custom HTML block are not read by either check, and the report says so.
    expect(report.notChecked.uninspected.map((u) => u.identity)).toEqual(expect.arrayContaining(['text/text/paragraph', 'html/html/inline']));
    expect(report.notChecked.uninspected.map((u) => u.identity)).not.toContain('image/image/hero');
    const html = renderReport(report);
    expect(html).toContain('This image has no alt text.');
    expect(html).toContain('1 background image in this lesson has no alt text field');
  });
});

// ─── real local sample (skip-safe; never committed) ─────────────────────────

const samplePath = path.resolve(__dirname, '../../samples/big-course-tool-checker-xapi-tweLjOIK.zip');
const hasSample = fs.existsSync(samplePath);

describe('real local sample', () => {
  (hasSample ? test : test.skip)('every enabled check runs to completion on a real course', async () => {
    const { courseData, extraction } = await extractCourse(fs.readFileSync(samplePath), { JSZip });
    const report = buildReport(courseData, { extraction, now: new Date('2026-11-19T00:00:00Z') });
    const crashed = report.notChecked.items.filter((i) => /could not complete/.test(i.message));
    expect(crashed).toEqual([]);
    expect(report.summary.fail + report.summary.review).toBeGreaterThan(0);
    // Every finding has a usable location and a one-line fix.
    for (const f of report.findings) {
      expect(f.location.scope).toBeTruthy();
      expect(f.remediation).toBeTruthy();
    }
  });
});
