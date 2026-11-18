/**
 * Rise payload discovery and decoding.
 *
 * A Rise export ZIP stores the authored course JSON somewhere inside itself,
 * wrapped in one of a small number of JSONP-like formats. Which file and
 * which wrapper is used varies by export packaging/vintage — this module
 * tries each known strategy against the ZIP and returns the first one that
 * both matches a known wrapper AND decodes into something that structurally
 * looks like a Rise course. It never guesses a file location from the LMS
 * export standard, a filename convention, or a previously observed sample.
 *
 * See docs/PHASE-1-SPEC.md §5.2, §7, §24 for the architecture this implements.
 *
 * Only two strategies are implemented here:
 *   - locale-jsonp       the original, verified extraction path
 *   - runtime-data-jsonp added in a later slice; wrapper form verified
 *                         against a real public Rise export
 *                         (GriffithUniLibrary/publishing-maze, root-level
 *                         runtime-data.js: `__jsonp("runtime-data.js","<b64>")`
 *                         — exact match to wrapperPattern below). That real
 *                         file is NOT committed here — see
 *                         tests/rise-payload.test.js for why and what's used
 *                         instead. Automated/committed tests use a synthetic
 *                         fixture built to the same documented shape.
 *
 * A third strategy described in the spec, "embedded index" (course data
 * inlined in index.html), is deliberately NOT implemented: no verified
 * fixture for it exists anywhere in this repository, and the spec itself
 * says its wrapper "may vary" — inventing one now would be guessing a schema,
 * which PHASE-1-SPEC.md explicitly rules out.
 */

export class UnsupportedRisePackageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedRisePackageError';
  }
}

export class RisePayloadDecodeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RisePayloadDecodeError';
  }
}

// ─── Strategies ──────────────────────────────────────────────────────────────
// Each strategy locates candidate file paths in the ZIP by name, and knows how
// to pull the base64 payload out of that file's JSONP-style wrapper. The
// wrapper's first argument (the JSONP "key") is never assumed to be a fixed
// value for either strategy — only the wrapper function name and the overall
// two-string-argument shape are strategy-specific.

const STRATEGIES = [
  {
    name: 'locale-jsonp',
    wrapper: '__resolveJsonp',
    // Verified: locales/und.js (current exports), lib/locales/und.js (older
    // exports). Falls back to any path ending in und.js for forward
    // compatibility with export layouts not yet seen.
    findCandidatePaths(zip) {
      const known = ['locales/und.js', 'lib/locales/und.js'].filter((p) => zip.file(p));
      const fallback = Object.keys(zip.files).filter(
        (name) => /(^|\/)und\.js$/.test(name) && !known.includes(name),
      );
      return [...known, ...fallback];
    },
    // Preserved verbatim from the original implementation.
    wrapperPattern: /^__resolveJsonp\("[^"]+","([\s\S]+)"\)\s*;?\s*$/,
  },
  {
    name: 'runtime-data-jsonp',
    wrapper: '__jsonp',
    // Observed location per PHASE-1-SPEC.md: runtime-data.js at the package
    // root or nested under a content root (e.g. scormcontent/runtime-data.js).
    // NOT verified against a real fixture in this repo — see module header.
    findCandidatePaths(zip) {
      return Object.keys(zip.files).filter((name) => /(^|\/)runtime-data\.js$/.test(name));
    },
    wrapperPattern: /^__jsonp\("[^"]+",\s*"([\s\S]+)"\)\s*;?\s*$/,
  },
];

function isPlausibleRiseCourse(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    !!value.course &&
    typeof value.course === 'object' &&
    Array.isArray(value.course.lessons)
  );
}

/**
 * Decode a base64 string into UTF-8 text.
 *
 * `atob()` alone is not enough: it turns base64 into a "binary string" where
 * each JS character holds one raw byte (0-255), not a proper UTF-8 decode.
 * Authored course text is not guaranteed to be ASCII-only — accented
 * characters, curly quotes, emoji, etc. all encode as multi-byte UTF-8
 * sequences, which `JSON.parse(atob(...))` alone would mangle.
 *
 * This uses only `atob`, `escape`, and `decodeURIComponent` — all available
 * natively, identically, in both real browsers and this project's Jest/jsdom
 * test environment (verified: jsdom here has no `TextDecoder`/`TextEncoder`,
 * so that would-be-cleaner approach would silently diverge between the two
 * runtimes or require a test-only polyfill). `escape`/`unescape` are
 * deprecated for general use but are exactly the right tool for this
 * byte-string-to-percent-encoding step, and are not being removed from any
 * runtime that matters here.
 */
function base64ToUtf8(base64) {
  const binaryString = atob(base64); // may throw on non-base64 input — let it
  return decodeURIComponent(escape(binaryString));
}

/**
 * Decode a base64 JSONP payload body into a validated Rise course object.
 * Throws RisePayloadDecodeError on any failure — malformed base64, a byte
 * sequence that isn't valid UTF-8, malformed JSON, or JSON that doesn't
 * structurally resemble a Rise course.
 */
function decodeCandidate(base64) {
  let json;
  try {
    json = JSON.parse(base64ToUtf8(base64));
  } catch (err) {
    throw new RisePayloadDecodeError(`payload did not decode as base64 UTF-8 JSON (${err.message})`);
  }
  if (!isPlausibleRiseCourse(json)) {
    throw new RisePayloadDecodeError(
      'decoded payload does not structurally resemble a Rise course ' +
        '(expected an object with a course.lessons[] array)',
    );
  }
  return json;
}

/**
 * Search the ZIP for a Rise payload using every known packaging strategy, in
 * order (locale-jsonp, then runtime-data-jsonp). Returns the location/wrapper
 * metadata of the first candidate that both matches a known wrapper and
 * decodes into a plausible Rise course.
 *
 * This does NOT return the decoded course itself — call
 * decodeRisePayload(source) for that.
 *
 * REVIEWED (double-decode): locate validates each candidate by fully decoding
 * it, then decodeRisePayload(source) decodes the winning candidate again —
 * the payload is decoded twice per extraction. Measured cost: ~4ms for a
 * representative 450KB course JSON (both real samples in this project are
 * 200-450KB decoded). Considered and rejected: caching the decoded result on
 * the returned `source` (e.g. a hidden field, checked by decodeRisePayload)
 * would remove that ~4ms but couples the two functions to an implicit
 * private protocol beyond the documented `{strategy, path, wrapper, raw}`
 * shape — exactly the kind of coupling this split exists to avoid. Kept as
 * two independently callable functions: it matches the shape
 * PHASE-1-SPEC.md §24 asks for, it's what makes each one separately
 * testable (see tests/rise-payload.test.js), and it lets a caller holding a
 * persisted/reconstructed `source` re-decode without touching the ZIP again.
 * ~4ms is not worth spending that clarity on.
 *
 * Throws UnsupportedRisePackageError — never returns an empty/placeholder
 * course — if no strategy produces a valid candidate.
 *
 * @param {import('jszip')} zip
 * @returns {Promise<{ strategy: string, path: string, wrapper: string, raw: string }>}
 */
export async function locateRisePayload(zip) {
  const attempts = [];

  for (const strategy of STRATEGIES) {
    for (const path of strategy.findCandidatePaths(zip)) {
      const file = zip.file(path);
      if (!file) continue;

      const text = await file.async('string');
      const match = text.match(strategy.wrapperPattern);
      if (!match) {
        attempts.push(`${path} (${strategy.name}): file present but "${strategy.wrapper}(...)" wrapper not matched`);
        continue;
      }

      const raw = match[1];
      try {
        decodeCandidate(raw);
      } catch (err) {
        attempts.push(`${path} (${strategy.name}): ${err.message}`);
        continue;
      }

      return { strategy: strategy.name, path, wrapper: strategy.wrapper, raw };
    }
  }

  const detail = attempts.length
    ? `Attempts:\n  - ${attempts.join('\n  - ')}`
    : 'No candidate payload files were found for any known strategy (locale-jsonp, runtime-data-jsonp).';
  throw new UnsupportedRisePackageError(`Unsupported Rise package layout. ${detail}`);
}

/**
 * Decode a payload source (as returned by locateRisePayload) into the raw
 * parsed Rise course object (courseData). Separate from locateRisePayload so
 * a caller already holding a source descriptor can re-decode without
 * touching the ZIP again.
 *
 * @param {{ raw: string }} source
 * @returns {object} raw parsed Rise course data
 */
export function decodeRisePayload(source) {
  return decodeCandidate(source.raw);
}
