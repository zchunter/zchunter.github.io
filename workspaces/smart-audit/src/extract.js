/**
 * Extracts full course data from an Articulate Rise xAPI export ZIP.
 * Requires JSZip to be available in scope.
 *
 * See docs/rise-extraction.md for full structure reference.
 */

/**
 * @param {File} file - The uploaded .zip file
 * @returns {Promise<{ courseData: object, meta: object }>}
 */
export async function extractCourse(file) {
  const zip = await JSZip.loadAsync(file);
  const courseData = await extractCourseData(zip);
  const meta = extractCourseMeta(courseData, await extractTcConfig(zip), await extractTincan(zip));
  // `zip` is returned so the browser layer can build its image blob map from the
  // same archive instead of loading the ZIP a second time (courses run to tens of MB).
  return { courseData, meta, zip };
}

async function extractCourseData(zip) {
  // Rise exports the course data at locales/und.js (newer) or lib/locales/und.js (older).
  // Fall back to searching for any file ending in /und.js for forward compatibility.
  const undFile =
    zip.file('locales/und.js') ??
    zip.file('lib/locales/und.js') ??
    Object.values(zip.files).find(f => f.name.endsWith('/und.js'));

  if (!undFile) throw new Error('und.js not found in ZIP — is this a Rise xAPI export?');

  const raw = await undFile.async('string');

  // JSONP key varies — match any string in the first position
  const match = raw.match(/^__resolveJsonp\("[^"]+","([\s\S]+)"\)\s*;?\s*$/);
  if (!match) throw new Error('Unexpected und.js format — JSONP wrapper not found');

  return JSON.parse(atob(match[1]));
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
