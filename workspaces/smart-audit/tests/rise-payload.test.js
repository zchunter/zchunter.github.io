/**
 * Integration tests for the extraction boundary (PHASE-1-SPEC.md §19, §24-25).
 *
 * These build minimal synthetic Rise-shaped ZIPs in memory rather than
 * committing real course archives — per §19: "Tests should use
 * extracted/sanitized fixture data where practical rather than unnecessarily
 * committing large proprietary course ZIPs."
 *
 * One additional suite runs against the real local sample corpus
 * (workspaces/samples/) when present. Those ZIPs are intentionally gitignored
 * (they contain third-party course content), so that suite is skip-safe and
 * will not run in CI or on a fresh clone — it exists as extra local evidence
 * that the locale-jsonp strategy still handles a real, large course.
 *
 * ── Real-data vs. synthetic fixtures (runtime-data-jsonp) ──────────────────
 * The runtime-data-jsonp tests below use a SYNTHETIC fixture. The strategy
 * was additionally verified, once, against a REAL public Rise export —
 * GriffithUniLibrary/publishing-maze (github.com), root-level runtime-data.js
 * — via a local throwaway script, not committed to this repo and not part of
 * this automated suite. That repository has no LICENSE file (GitHub's
 * license API returns 404 for it), and while the authored course content
 * itself carries a CC BY-NC 4.0 notice, that is a license for the workshop
 * material, not a clear grant to redistribute its raw export files inside an
 * unrelated codebase. So: real data was used only to prove the strategy
 * against real evidence; only synthetic, self-authored fixture data is
 * committed here. See src/rise-payload.js's module header for what was
 * confirmed (exact wrapper match, real decode, real census) and the slice
 * report for full decoded metadata/counts.
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import {
  locateRisePayload,
  decodeRisePayload,
  UnsupportedRisePackageError,
} from '../src/rise-payload.js';
import { extractCourse } from '../src/extract.js';
import { buildCensus } from '../src/census.js';

// ─── fixture helpers ─────────────────────────────────────────────────────────

function sampleCourseData({ title = 'Sample Course', lessons } = {}) {
  return {
    course: {
      id: 'course-1',
      title,
      lessons: lessons ?? [
        {
          id: 'l1', title: 'Lesson One', type: 'blocks', items: [
            { id: 'b1', family: 'text', type: 'text', variant: 'paragraph', items: [{ id: 'i1', paragraph: 'Hello' }] },
            { id: 'b2', family: 'text', type: 'text', variant: 'heading', items: [{ id: 'i2', heading: 'Hi' }] },
          ],
        },
        { id: 's1', title: 'A Section', type: 'section' },
      ],
    },
  };
}

function toBase64(courseData) {
  return Buffer.from(JSON.stringify(courseData), 'utf8').toString('base64');
}

async function buildLocaleZip(courseData, path = 'locales/und.js') {
  const zip = new JSZip();
  zip.file(path, `__resolveJsonp("course:und","${toBase64(courseData)}") ;`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function buildRuntimeDataZip(courseData, path = 'runtime-data.js') {
  const zip = new JSZip();
  zip.file(path, `__jsonp("runtime-data.js","${toBase64(courseData)}") ;`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

// ─── locateRisePayload / decodeRisePayload — locale JSONP ───────────────────

describe('locateRisePayload / decodeRisePayload — locale JSONP', () => {
  test('locates and decodes a locale-jsonp payload at locales/und.js', async () => {
    const buf = await buildLocaleZip(sampleCourseData());
    const zip = await JSZip.loadAsync(buf);

    const source = await locateRisePayload(zip);
    expect(source).toEqual({
      strategy: 'locale-jsonp',
      path: 'locales/und.js',
      wrapper: '__resolveJsonp',
      raw: expect.any(String),
    });

    const courseData = decodeRisePayload(source);
    expect(courseData.course.title).toBe('Sample Course');
  });

  test('also finds the older lib/locales/und.js path', async () => {
    const buf = await buildLocaleZip(sampleCourseData(), 'lib/locales/und.js');
    const zip = await JSZip.loadAsync(buf);

    const source = await locateRisePayload(zip);
    expect(source.path).toBe('lib/locales/und.js');
  });
});

// ─── locateRisePayload / decodeRisePayload — runtime-data JSONP ─────────────

describe('locateRisePayload / decodeRisePayload — runtime-data JSONP', () => {
  test('locates and decodes a runtime-data-jsonp payload at runtime-data.js', async () => {
    const buf = await buildRuntimeDataZip(sampleCourseData({ title: 'RTD Course' }));
    const zip = await JSZip.loadAsync(buf);

    const source = await locateRisePayload(zip);
    expect(source).toEqual({
      strategy: 'runtime-data-jsonp',
      path: 'runtime-data.js',
      wrapper: '__jsonp',
      raw: expect.any(String),
    });

    const courseData = decodeRisePayload(source);
    expect(courseData.course.title).toBe('RTD Course');
  });

  test('also finds runtime-data.js nested under a content root', async () => {
    const buf = await buildRuntimeDataZip(sampleCourseData(), 'scormcontent/runtime-data.js');
    const zip = await JSZip.loadAsync(buf);

    const source = await locateRisePayload(zip);
    expect(source.path).toBe('scormcontent/runtime-data.js');
  });

  test('locale-jsonp is preferred when both are present (does not change existing-sample behavior)', async () => {
    const zip = new JSZip();
    zip.file('locales/und.js', `__resolveJsonp("k","${toBase64(sampleCourseData({ title: 'Locale' }))}") ;`);
    zip.file('runtime-data.js', `__jsonp("runtime-data.js","${toBase64(sampleCourseData({ title: 'RTD' }))}") ;`);
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const loaded = await JSZip.loadAsync(buf);

    const source = await locateRisePayload(loaded);
    expect(source.strategy).toBe('locale-jsonp');
  });
});

// ─── failure modes ───────────────────────────────────────────────────────────

describe('locateRisePayload — failure modes', () => {
  test('a ZIP with no recognizable Rise payload fails clearly (non-Rise ZIP)', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'just a file, not a Rise export');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const loaded = await JSZip.loadAsync(buf);

    await expect(locateRisePayload(loaded)).rejects.toThrow(UnsupportedRisePackageError);
  });

  test('malformed base64 in an otherwise correctly-wrapped file fails clearly, never silently', async () => {
    const zip = new JSZip();
    zip.file('locales/und.js', '__resolveJsonp("k","not-valid-base64-or-json!!!") ;');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const loaded = await JSZip.loadAsync(buf);

    await expect(locateRisePayload(loaded)).rejects.toThrow(UnsupportedRisePackageError);
  });

  test('valid base64 JSON that is not a plausible Rise course is rejected, not accepted', async () => {
    const zip = new JSZip();
    const encoded = Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8').toString('base64');
    zip.file('locales/und.js', `__resolveJsonp("k","${encoded}") ;`);
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const loaded = await JSZip.loadAsync(buf);

    await expect(locateRisePayload(loaded)).rejects.toThrow(UnsupportedRisePackageError);
  });
});

// ─── UTF-8 decoding ──────────────────────────────────────────────────────────
// atob() alone yields a byte-per-char "binary string", not a UTF-8 decode —
// authored course text is not guaranteed to be ASCII. These prove the decode
// path round-trips representative non-ASCII text exactly, and that failure
// modes (bad base64, implausible payload) stay explicit alongside the fix.

describe('UTF-8 decoding', () => {
  test.each([
    ['accented characters', 'Café, naïve, résumé — déjà vu'],
    ['curly quotation marks', '“Smart quotes,” she said — ‘and apostrophes too.’'],
    ['an emoji', 'Nice work! 😀🎉 Keep going.'],
    ['all of the above combined', 'Café “rules” 😀 — the naïve piñata résumé'],
  ])('%s decode exactly via decodeRisePayload', async (_label, text) => {
    const buf = await buildLocaleZip(sampleCourseData({ title: text }));
    const zip = await JSZip.loadAsync(buf);

    const source = await locateRisePayload(zip);
    const courseData = decodeRisePayload(source);

    expect(courseData.course.title).toBe(text);
  });

  test('non-ASCII authored content survives the full extractCourse pipeline unchanged', async () => {
    const text = '“Emoji 😀, accents café, and — dashes” all in one paragraph.';
    const courseData = sampleCourseData({
      lessons: [
        {
          id: 'l1', title: 'Lesson One', type: 'blocks', items: [
            { id: 'b1', family: 'text', type: 'text', variant: 'paragraph', items: [{ id: 'i1', paragraph: text }] },
          ],
        },
      ],
    });
    const buf = await buildLocaleZip(courseData);

    const { courseData: extracted } = await extractCourse(buf, { JSZip });
    // lessons[0].items[0] is the block; .items[0] is the item row within it.
    expect(extracted.course.lessons[0].items[0].items[0].paragraph).toBe(text);
  });

  test('malformed base64 still fails clearly after the UTF-8 fix (not swallowed)', async () => {
    const zip = new JSZip();
    zip.file('locales/und.js', '__resolveJsonp("k","not-valid-base64-or-json!!!") ;');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const loaded = await JSZip.loadAsync(buf);

    await expect(locateRisePayload(loaded)).rejects.toThrow(UnsupportedRisePackageError);
  });

  test('valid base64 that decodes to non-UTF-8 garbage bytes fails clearly, not silently', async () => {
    const zip = new JSZip();
    // Bytes 0x80-0xBF alone (continuation bytes with no leading byte) are
    // invalid UTF-8 on their own — valid base64 syntax, invalid text.
    const garbageBytes = Buffer.from([0x80, 0x81, 0x82, 0x83]);
    zip.file('locales/und.js', `__resolveJsonp("k","${garbageBytes.toString('base64')}") ;`);
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const loaded = await JSZip.loadAsync(buf);

    await expect(locateRisePayload(loaded)).rejects.toThrow(UnsupportedRisePackageError);
  });
});

// ─── extractCourse — integration, injected JSZip ────────────────────────────

describe('extractCourse — integration (injected JSZip)', () => {
  test('extracts via the locale-jsonp strategy end-to-end and reports extraction metadata', async () => {
    const buf = await buildLocaleZip(sampleCourseData());
    const { courseData, meta, extraction } = await extractCourse(buf, { JSZip });

    expect(extraction).toEqual({ strategy: 'locale-jsonp', path: 'locales/und.js', wrapper: '__resolveJsonp' });
    expect(courseData.course.title).toBe('Sample Course');
    expect(meta.title).toBe('Sample Course');
  });

  test('extracts via the runtime-data-jsonp strategy end-to-end', async () => {
    const buf = await buildRuntimeDataZip(sampleCourseData({ title: 'RTD Course' }));
    const { courseData, extraction } = await extractCourse(buf, { JSZip });

    expect(extraction.strategy).toBe('runtime-data-jsonp');
    expect(courseData.course.title).toBe('RTD Course');
  });

  test('an unsupported payload fails loudly rather than returning an empty course', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'not a Rise export');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(extractCourse(buf, { JSZip })).rejects.toThrow(UnsupportedRisePackageError);
  });

  test('throws a clear error when no JSZip implementation is available', async () => {
    const buf = await buildLocaleZip(sampleCourseData());
    await expect(extractCourse(buf, {})).rejects.toThrow(/JSZip/);
  });
});

// ─── buildCensus ─────────────────────────────────────────────────────────────

describe('buildCensus', () => {
  test('counts lessons (including sections), blocks, and identity occurrences', () => {
    const census = buildCensus(sampleCourseData());
    expect(census.lessons).toBe(2); // 1 blocks-lesson + 1 section
    expect(census.blocks).toBe(2);
    expect(census.identities).toEqual({
      'text/text/paragraph': 1,
      'text/text/heading': 1,
    });
  });

  test('tallies repeated and unknown identities', () => {
    const courseData = sampleCourseData({
      lessons: [
        {
          id: 'l1', title: 'L1', type: 'blocks', items: [
            { id: 'b1', family: 'text', type: 'text', variant: 'paragraph', items: [] },
            { id: 'b2', family: 'text', type: 'text', variant: 'paragraph', items: [] },
            { id: 'b3', family: 'weird', type: 'weird', variant: 'mystery', items: [] },
          ],
        },
      ],
    });
    const census = buildCensus(courseData);
    expect(census.identities['text/text/paragraph']).toBe(2);
    expect(census.identities['weird/weird/mystery']).toBe(1);
    expect(census.blocks).toBe(3);
  });
});

// ─── real local sample corpus (skip-safe; not committed, not run in CI) ────

const bigSamplePath = path.resolve(__dirname, '../../samples/big-course-tool-checker-xapi-tweLjOIK.zip');
const hasBigSample = fs.existsSync(bigSamplePath);

describe('extractCourse — real local sample corpus', () => {
  (hasBigSample ? test : test.skip)(
    'extracts and censuses the big sample course via locale-jsonp',
    async () => {
      const buf = fs.readFileSync(bigSamplePath);
      const { courseData, extraction } = await extractCourse(buf, { JSZip });

      expect(extraction.strategy).toBe('locale-jsonp');
      expect(extraction.path).toMatch(/und\.js$/);

      // Exact counts verified by manual inspection of this sample's raw JSON.
      const census = buildCensus(courseData);
      expect(census.lessons).toBe(37);
      expect(census.blocks).toBe(174);
      expect(Object.keys(census.identities).length).toBeGreaterThan(0);
    },
  );
});
