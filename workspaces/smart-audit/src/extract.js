/**
 * Extracts full course data from an Articulate Rise export ZIP.
 *
 * Payload discovery is generalized (see ./rise-payload.js): the Rise course
 * JSON is not assumed to live at any fixed path. See docs/PHASE-1-SPEC.md and
 * docs/rise-extraction.md for the packaging strategies this recognizes.
 */

import { locateRisePayload, decodeRisePayload } from './rise-payload.js';

/**
 * @param {File|Buffer|ArrayBuffer} file - The uploaded/loaded .zip file
 * @param {{ JSZip?: typeof import('jszip') }} [deps] - Inject a JSZip
 *   implementation (e.g. under Jest, where there is no browser-supplied
 *   global). In the browser this is omitted and the CDN-loaded global
 *   `JSZip` is used automatically.
 * @returns {Promise<{ courseData: object, meta: object, zip: object, extraction: { strategy: string, path: string, wrapper: string } }>}
 */
export async function extractCourse(file, { JSZip: ZipImpl } = {}) {
  const Zip = ZipImpl ?? globalThis.JSZip;
  if (!Zip) {
    throw new Error(
      'JSZip is required — pass { JSZip } explicitly (e.g. in tests), or load it as a ' +
        'global before calling extractCourse (index.html does this via a CDN <script>).',
    );
  }

  const zip = await Zip.loadAsync(file);
  const { courseData, source } = await extractCourseData(zip);
  const meta = extractCourseMeta(courseData, await extractTcConfig(zip), await extractTincan(zip));
  // `zip` is returned so the browser layer can build its image blob map from the
  // same archive instead of loading the ZIP a second time (courses run to tens of MB).
  return {
    courseData,
    meta,
    zip,
    extraction: { strategy: source.strategy, path: source.path, wrapper: source.wrapper },
  };
}

async function extractCourseData(zip) {
  const source = await locateRisePayload(zip);
  const courseData = decodeRisePayload(source);
  return { courseData, source };
}

async function extractTcConfig(zip) {
  const file = zip.file('tc-config.js');
  if (!file) return {};
  const raw = await file.async('string');

  // tc-config.js uses bare global assignments: TC_COURSE_ID = "...", TC_COURSE_NAME = { "en-US": "..." }
  const idMatch    = raw.match(/TC_COURSE_ID\s*=\s*["']([^"']+)["']/);
  const nameMatch  = raw.match(/TC_COURSE_NAME\s*=\s*\{[^}]*"en-US"\s*:\s*"([^"]+)"/);
  return {
    id:    idMatch?.[1] ?? null,
    title: nameMatch?.[1] ?? null,
  };
}

async function extractTincan(zip) {
  const file = zip.file('tincan.xml');
  if (!file) return {};
  const raw = await file.async('string');
  const m = raw.match(/id="([^"]+)"/);
  return { activityId: m?.[1] ?? null };
}

function extractCourseMeta(courseData, tcConfig, tincan) {
  const course = courseData.course;
  return {
    // Prefer course JSON fields; fall back to tc-config
    id:          tcConfig.id ?? course.id ?? null,
    title:       course.title ?? tcConfig.title ?? null,
    description: course.description ?? null,
    activityId:  tincan.activityId ?? null,
  };
}

/** Safe string coercion — some fields that appear to be strings are occasionally objects or null */
export function toStr(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  return String(val);
}

/** Treat empty alt variants as missing */
export function isEmptyAlt(val) {
  return !val || val === '""';
}
