/**
 * Colour maths for WCAG contrast (SC 1.4.3, 1.4.11). Pure functions on hex
 * strings: no DOM, no rendering.
 *
 * Contrast ratio = (L1 + 0.05) / (L2 + 0.05), where L is relative luminance
 * as defined in WCAG 2.1. Ratios are compared unrounded; WCAG does not round
 * up, so 4.499 fails 4.5. Display values are truncated, never rounded up,
 * so a failing ratio can never be displayed as passing.
 */

/** "#rgb" or "#rrggbb" (case-insensitive) to { r, g, b } in 0-255, else null. */
export function parseHex(input) {
  if (typeof input !== 'string') return null;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

export function toHex({ r, g, b }) {
  const part = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function relativeLuminance({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two hex colours, or null if either is not a valid hex colour. */
export function contrastRatio(a, b) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Truncate (never round up) to two decimals, e.g. 4.4999 -> "4.49". */
export function formatRatio(ratio) {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

/**
 * The lightest darkening of a colour (same hue and saturation) that reaches
 * `min` contrast against white. Returns a hex string, the original colour if
 * it already passes, or null for an invalid colour.
 */
export function nearestCompliantOnWhite(hex, min = 4.5) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  if (contrastRatio(hex, '#ffffff') >= min) return toHex(rgb);

  const hsl = rgbToHsl(rgb);
  let lo = 0; // always compliant
  let hi = hsl.l; // known non-compliant
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(toHex(hslToRgb({ ...hsl, l: mid })), '#ffffff') >= min) lo = mid;
    else hi = mid;
  }
  // Rounding to 8-bit channels can nudge the result just under the threshold; step down until it passes.
  let candidate = lo;
  while (candidate > 0 && contrastRatio(toHex(hslToRgb({ ...hsl, l: candidate })), '#ffffff') < min) candidate -= 0.002;
  return toHex(hslToRgb({ ...hsl, l: Math.max(0, candidate) }));
}
