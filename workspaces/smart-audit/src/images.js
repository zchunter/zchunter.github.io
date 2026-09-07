/**
 * Browser-only image resolution for SmartAudit.
 *
 * Rise stores uploaded images in the ZIP under `assets/<hash>.<ext>`. This module
 * turns those ZIP entries into object URLs and stitches them onto the dump model
 * produced by src/dump.js, so the renderer can show thumbnails without the dump
 * itself needing any knowledge of blobs or the DOM.
 *
 * Not imported by Jest tests — depends on `Blob` / `URL.createObjectURL`.
 */

// crushedKey/key filename (bare + full path + encoded form) → object URL
export const imageMap = new Map();

let _blobUrls = [];

/** Release object URLs from a previous course before loading the next one. */
export function revokeBlobUrls() {
  _blobUrls.forEach((u) => URL.revokeObjectURL(u));
  _blobUrls = [];
  imageMap.clear();
}

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|svg|webp)$/i;

// JSZip hands back `application/octet-stream` by default. Browsers sniff PNG/JPEG
// from the binary header, but SVG needs an explicit type or it renders broken.
const MIME_BY_EXT = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  svg:  'image/svg+xml',
  webp: 'image/webp',
};

/**
 * Populate `imageMap` from a loaded JSZip instance.
 * @param {import('jszip')} zip
 */
export async function buildImageMap(zip) {
  revokeBlobUrls();

  const imageFiles = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.startsWith('assets/') && IMAGE_EXTS.test(f.name),
  );

  await Promise.all(imageFiles.map(async (f) => {
    const ext      = f.name.split('.').pop().toLowerCase();
    const mimeType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    const ab       = await f.async('arraybuffer');
    const blob     = new Blob([ab], { type: mimeType });
    const url      = URL.createObjectURL(blob);
    _blobUrls.push(url);

    // Index by every form the dump might ask for: bare name (as stored in the
    // ZIP), full path, and the percent-encoded name (Rise's crushedKey is
    // sometimes encoded — "SSML%20Play%20Prompt.jpg" — while the file has spaces).
    const filename = f.name.split('/').pop();
    imageMap.set(filename, url);
    imageMap.set(f.name, url);
    try { imageMap.set(encodeURIComponent(filename), url); } catch { /* leave it */ }
  }));

  return imageMap;
}

/** Resolve one dump image node to a displayable URL: local blob first, remote last. */
function resolveDisplayUrl(node) {
  const local =
    (node.localFilename && imageMap.get(node.localFilename)) ||
    (node.rawFilename   && imageMap.get(node.rawFilename)) ||
    (node.localFilename && imageMap.get(`assets/${node.localFilename}`)) ||
    (node.rawFilename   && imageMap.get(`assets/${node.rawFilename}`)) ||
    null;

  return local ?? node.thumbnailUrl ?? node.remoteSrc ?? null;
}

/**
 * Walk a completed dump and set `displayUrl` on every image node
 * (identified by the `rawFilename` key that src/dump.js's dumpImage emits).
 * Mutates and returns the dump.
 */
export function attachDisplayUrls(dump) {
  const seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (Object.prototype.hasOwnProperty.call(node, 'rawFilename')) {
      node.displayUrl = resolveDisplayUrl(node);
    }
    Object.values(node).forEach(walk);
  };
  walk(dump);
  return dump;
}
