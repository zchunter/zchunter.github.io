/**
 * Small HTML string helpers shared by the issue collector and the renderer.
 * Pure functions — no DOM access, safe to run under Jest.
 */

/** Escape a value for safe interpolation into an HTML attribute or text node. */
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip tags and decode the handful of entities Rise emits, then trim. */
export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
