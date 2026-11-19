/**
 * Exports a report (from buildReport) as one standalone HTML file that a
 * compliance office can file (docs/SCOPE-V1.md, definition of done item 4).
 *
 * The file is meant to be kept and opened later, offline, by someone who never
 * ran the tool, so it:
 *   - wraps the same markup renderReport() produces, so the export and the
 *     on-screen report cannot drift apart;
 *   - inlines its styles and contains no scripts;
 *   - carries a Content-Security-Policy that blocks every network fetch, so
 *     opening it loads nothing from anywhere (links still work when clicked);
 *   - repeats the triage-not-conformance notice and the generation time.
 *
 * Pure: returns strings. Triggering the download is the host page's job.
 */

import { esc } from '../html.js';
import { renderReport } from './render-report.js';

// Same colour pairs as index.html, which were checked: text >= 4.5:1,
// UI components >= 3:1. Keep the two in step if either changes.
const EXPORT_CSS = `
:root {
  --text: #1f2328; --muted: #4b5563; --bg: #ffffff; --panel: #eef1f4;
  --border: #6b7280; --accent: #0b5cad;
  --fail-bg: #fde7e7; --fail-fg: #8b1a1a;
  --review-bg: #fff1cc; --review-fg: #5c4000;
  --nc-bg: #e5e7eb; --nc-fg: #374151;
}
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.55; color: var(--text); background: var(--bg); }
main { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
a { color: var(--accent); }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
h2 { font-size: 1.4rem; margin: 2rem 0 0.5rem; }
h3 { font-size: 1.2rem; margin: 2rem 0 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border); }
h4 { font-size: 1.05rem; margin: 1.25rem 0 0.4rem; }
#report-title:focus { outline: none; }
.muted { color: var(--muted); }
.notice { margin: 1rem 0; padding: 0.75rem 1rem; background: var(--panel); border-left: 0.35rem solid var(--accent); }
.warning { margin: 0.75rem 0; padding: 0.75rem 1rem; color: var(--review-fg); background: var(--review-bg); border: 2px solid var(--review-fg); border-radius: 0.25rem; }
.summary, .plain-list { list-style: none; margin: 0.75rem 0; padding: 0; }
.summary { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.summary li { padding: 0.5rem 1rem; background: var(--panel); border: 1px solid var(--border); border-radius: 0.25rem; }
.summary strong { font-size: 1.25rem; }
.plain-list li { margin: 0 0 0.9rem; }
.plain-list ul { margin: 0.25rem 0 0; padding-left: 1.25rem; list-style: disc; }
.inline-list { display: flex; flex-wrap: wrap; gap: 0.25rem 1.5rem; }
.inline-list li { margin: 0; }
.badge { display: inline-block; padding: 0.1rem 0.5rem; font-size: 0.85rem; font-weight: 700; white-space: nowrap; border: 1px solid currentColor; border-radius: 0.25rem; }
.badge-fail { color: var(--fail-fg); background: var(--fail-bg); }
.badge-review { color: var(--review-fg); background: var(--review-bg); }
.badge-notchecked { color: var(--nc-fg); background: var(--nc-bg); }
.table-scroll { overflow-x: auto; margin: 0.75rem 0; border: 1px solid var(--border); }
table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
caption { text-align: left; font-weight: 600; padding: 0.5rem 0.75rem; }
th, td { text-align: left; vertical-align: top; padding: 0.5rem 0.75rem; border-top: 1px solid var(--border); }
thead th { background: var(--panel); }
code { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; overflow-wrap: anywhere; }
@media print {
  main { max-width: none; padding: 0; }
  .table-scroll { overflow: visible; border: none; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  h3 { break-after: avoid; }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.85em; }
}
`;

// Blocks every fetch (scripts, styles, images, fonts, frames, connections);
// only the inline <style> is allowed. Navigating via a link is unaffected.
const CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

/**
 * @param {object} report from buildReport
 * @param {{ sourceFileName?: string }} [options] name of the ZIP the report was made from
 * @returns {string} a complete HTML document
 */
export function exportReportHtml(report, { sourceFileName } = {}) {
  const { meta } = report;
  const title = `SmartAudit triage report${meta.title ? ` — ${meta.title}` : ''}`;
  const fromFile = sourceFileName ? ` from <code>${esc(sourceFileName)}</code>` : '';

  return (
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">\n` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="generator" content="SmartAudit v1">\n' +
    `<title>${esc(title)}</title>\n` +
    `<style>${EXPORT_CSS}</style>\n` +
    '</head>\n<body>\n<main>\n' +
    '<header>\n' +
    '<h1>SmartAudit triage report</h1>\n' +
    `<p class="muted">Generated ${esc(meta.generatedAt)}${fromFile}. ` +
    'The course was read in the browser of the person who ran the tool; it was not uploaded anywhere. ' +
    'This file is a saved copy of the report and does not update.</p>\n' +
    '</header>\n' +
    renderReport(report) +
    '\n</main>\n</body>\n</html>\n'
  );
}

/**
 * A safe, readable file name: smartaudit-report-<course>-<YYYY-MM-DD>.html.
 * Characters that are unsafe in file names on any common OS are dropped.
 */
export function reportFileName(report) {
  const date = report.meta.generatedAt.slice(0, 10);
  const slug = (report.meta.title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return `smartaudit-report-${slug ? `${slug}-` : ''}${date}.html`;
}
