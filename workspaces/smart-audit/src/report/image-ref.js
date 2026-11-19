/**
 * Identifies the image a finding is about, so a reviewer can find it in Rise
 * and, on the live page, see it.
 *
 * Pure: works on the image record and a list of ZIP paths. It never builds a
 * URL to a remote copy; a preview comes from the ZIP or not at all, because
 * the tool must not fetch anything (docs/SCOPE-V1.md).
 *
 * Observed in a real export (2026-11-19): uploaded images sit at
 * assets/<crushedKey>; Rise's block defaults sit at assets/<src>, where src
 * may include a folder ("gt-3TF/mountains.jpg"); crushedKey may be
 * percent-encoded ("image%20%2820%29.png" for "assets/image (20).png").
 */

const REMOTE = /^[a-z][a-z0-9+.-]*:\/\//i;

function decode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const basename = (s) => s.split(/[?#]/)[0].split('/').pop();

/**
 * @param {object} record an image record such as block.media.image
 * @returns {{ name: string, alt: string|null, candidates: string[] } | null}
 *   name        what the author uploaded, for finding the image in Rise
 *   alt         the stored alt text, or null when the field is absent
 *   candidates  ZIP paths that may hold the file, most likely first
 */
export function imageRef(record) {
  if (!record || typeof record !== 'object') return null;
  const fields = ['crushedKey', 'src', 'key', 'originalUrl']
    .map((f) => record[f])
    .filter((v) => typeof v === 'string' && v.trim() && !REMOTE.test(v));
  if (!fields.length && typeof record.originalUrl !== 'string') return null;

  const candidates = [];
  const add = (p) => {
    if (p && !candidates.includes(p)) candidates.push(p);
  };
  for (const v of fields) {
    for (const form of [v, decode(v)]) {
      add(form.startsWith('assets/') ? form : `assets/${form}`);
      add(`assets/${basename(form)}`);
    }
  }

  const nameSource = [record.originalUrl, record.crushedKey, record.src, record.key].find(
    (v) => typeof v === 'string' && v.trim(),
  );
  const name = decode(basename(nameSource ?? '')) || 'unnamed image';
  const alt = typeof record.alt === 'string' ? record.alt : null;

  return { name, alt, candidates };
}

/**
 * The first candidate path that exists in the ZIP, or null.
 * @param {{ candidates: string[] } | null} ref
 * @param {(path: string) => boolean} exists
 */
export function resolveImage(ref, exists) {
  if (!ref) return null;
  return ref.candidates.find((p) => exists(p)) ?? null;
}
