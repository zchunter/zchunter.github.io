/**
 * Renders a report (from buildReport) as an HTML string.
 *
 * Course content is untrusted input, so every dynamic value goes through
 * esc(). The markup is built to meet the criteria the tool audits: real
 * headings and landmarks, tables with captions and header cells, severity
 * shown as text rather than colour alone, and scrollable regions that are
 * keyboard-focusable. Styling lives with the page that hosts the report.
 */

import { esc } from '../html.js';
import { describeLocation } from './walk.js';

const slug = (severity) => severity.toLowerCase().replace(/\s+/g, '');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const scText = (list) => (list.length ? list.join(', ') : '—');

function formatMeasured(measured) {
  if (measured === null || measured === undefined) return '';
  if (typeof measured === 'string') return measured;
  if (typeof measured === 'object' && 'value' in measured) {
    return measured.required !== undefined ? `${measured.value} (required: ${measured.required})` : String(measured.value);
  }
  return JSON.stringify(measured);
}

function table({ id, caption, headers, rows }) {
  const head = headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const body = rows.map((cells) => `<tr>${cells.join('')}</tr>`).join('');
  return (
    `<div class="table-scroll" role="region" aria-labelledby="${id}" tabindex="0">` +
    `<table><caption id="${id}">${esc(caption)}</caption>` +
    `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
  );
}

const cell = (html) => `<td>${html}</td>`;
const textCell = (text) => cell(esc(text));

/**
 * The "Where" cell. Image findings also name the file, and, when the host page
 * can show the image (resolveImage returns a ZIP path), offer a preview button.
 * The host page wires the button up; this module only emits it.
 */
function whereCell(f, resolveImage) {
  let html = esc(describeLocation(f.location));
  if (f.image) {
    html += `<br><span class="muted">Image file: <code>${esc(f.image.name)}</code></span>`;
    const path = resolveImage ? resolveImage(f.image) : null;
    if (path) {
      const alt = f.image.alt === null ? '' : f.image.alt;
      html +=
        `<br><button type="button" class="view-image" data-asset="${esc(path)}" data-name="${esc(f.image.name)}"` +
        ` data-alt="${esc(alt)}" data-has-alt="${f.image.alt === null ? 'no' : 'yes'}">` +
        `View image<span class="visually-hidden"> ${esc(f.image.name)}</span></button>`;
    }
  }
  return cell(html);
}

// ─── Section 1 ───────────────────────────────────────────────────────────────

function renderFindings(report, resolveImage) {
  const { findings, meta } = report;
  const ran = meta.checks.length
    ? `<p class="muted">Checks that ran: ${meta.checks.map((c) => esc(c.title)).join('; ')}.</p>`
    : '<p class="muted">No checks are enabled in this build.</p>';

  const body = findings.length
    ? table({
        id: 'cap-findings',
        caption: 'Findings, most severe first',
        headers: ['Severity', 'WCAG', 'Where', 'What we found', 'What to do'],
        rows: findings.map((f) => {
          const measured = formatMeasured(f.measured);
          return [
            cell(`<span class="badge badge-${slug(f.severity)}">${esc(f.severity)}</span>`),
            textCell(f.basis === 'best-practice' ? `${scText(f.sc)} (best practice)` : scText(f.sc)),
            whereCell(f, resolveImage),
            textCell(measured ? `${f.message} (${measured})` : f.message),
            textCell(f.remediation ?? '—'),
          ];
        }),
      })
    : meta.checks.length
      ? '<p>The checks that ran produced no findings. That does not mean the course meets WCAG; read the other sections.</p>'
      : '';

  return (
    `<section id="sec-findings" aria-labelledby="h-findings">` +
    `<h3 id="h-findings">1. Findings you can fix</h3>` +
    `<p>FAIL means the export makes the problem certain. REVIEW means something was detected but a person has to decide.</p>` +
    ran +
    body +
    `</section>`
  );
}

// ─── Section 2 ───────────────────────────────────────────────────────────────

function renderKeepInMind(report) {
  const items = report.keepInMind
    .map(
      (r) =>
        `<li><strong>${esc(r.title)}</strong> <span class="muted">(WCAG ${esc(scText(r.sc))})</span><br>${esc(r.text)}</li>`,
    )
    .join('');
  return (
    `<section id="sec-keep" aria-labelledby="h-keep">` +
    `<h3 id="h-keep">2. Keep in mind</h3>` +
    `<p>Things you control that a tool cannot check. Shown only where the course has the relevant content.</p>` +
    `<ul class="plain-list">${items}</ul></section>`
  );
}

// ─── Section 3 ───────────────────────────────────────────────────────────────

function renderLimitations(report) {
  const l = report.limitations;
  let body;
  if (!l.available) {
    body = '<p>The list of Rise-documented limitations is not included in this build.</p>';
  } else {
    const linkable = typeof l.sourceUrl === 'string' && /^https?:\/\//i.test(l.sourceUrl);
    const source = linkable ? ` Source: <a href="${esc(l.sourceUrl)}">${esc(l.sourceUrl)}</a>.` : '';
    const stale = l.stale
      ? `<p class="warning" role="note"><strong>This list may be out of date.</strong> It was last compared with Articulate’s page more than ${esc(l.staleAfterDays)} days ago, or has no valid date. Check the source before relying on it.</p>`
      : '';
    const row = (e) =>
      `<li><strong>${esc(e.title)}</strong> <span class="muted">(WCAG ${esc(scText(e.sc ?? []))}${e.level ? `, Level ${esc(e.level)}` : ''}; status per Articulate: ${esc(e.status ?? 'unknown')})</span>` +
      `<br>${esc(e.summary)}` +
      (e.because ? `<br><span class="muted">Why it is listed: ${esc(e.because)}.</span>` : '') +
      (e.workaround ? `<br>Workaround documented by Articulate: ${esc(e.workaround)}` : '') +
      `</li>`;
    const entries = l.entries.length
      ? `<ul class="plain-list">${l.entries.map(row).join('')}</ul>`
      : '<p>No documented limitation was matched to this course’s content.</p>';
    const standing = l.standing?.length
      ? `<h4 id="h-limits-standing">Documented gaps that apply to any Rise course</h4><ul class="plain-list">${l.standing.map(row).join('')}</ul>`
      : '';
    const c = l.counts;
    const rest = c
      ? `<p>${esc(c.listed)} gaps are on the list. ${esc(c.notPresent)} concern content this course does not appear to use. ${esc(c.notDetectable)} concern blocks or settings that this tool cannot yet detect from an export, so it cannot say whether they apply; see the source for the full list.</p>`
      : '';
    const dates =
      `Articulate’s page was last updated ${esc(l.asOf ?? 'on an unknown date')}` +
      (l.checkedOn ? `; this list was last compared with it on ${esc(l.checkedOn)}` : '') +
      '.';
    body = `<p>Documented by Articulate as of ${esc(l.asOf ?? 'an unknown date')}.${source} ${dates} These are gaps in Rise itself, not mistakes by the author, and not independently verified by this tool.</p>${stale}${entries}${standing}${rest}`;
  }
  return (
    `<section id="sec-limits" aria-labelledby="h-limits">` +
    `<h3 id="h-limits">3. Rise-documented limitations</h3>` +
    `<p>Accessibility gaps that Rise’s publisher documents and an author cannot fix.</p>` +
    body +
    `</section>`
  );
}

// ─── Section 4 ───────────────────────────────────────────────────────────────

function renderNotChecked(report) {
  const { items, inventory, uninspected, scope } = report.notChecked;
  const parts = [];

  parts.push('<h4>Checked but could not be evaluated</h4>');
  parts.push(
    items.length
      ? table({
          id: 'cap-unevaluated',
          caption: 'Items a check could not evaluate',
          headers: ['WCAG', 'Where', 'Why'],
          rows: items.map((i) => [textCell(scText(i.sc)), textCell(describeLocation(i.location)), textCell(i.message)]),
        })
      : '<p>None.</p>',
  );

  parts.push('<h4>Content found but not examined</h4>');
  const found = [];
  if (inventory.attachments.length) {
    const files = inventory.attachments
      .map((a) => `<li>${esc(a.filename ?? 'unnamed file')}${a.extension ? ` <span class="muted">(.${esc(a.extension)})</span>` : ''}</li>`)
      .join('');
    found.push(`<li>${esc(plural(inventory.attachments.length, 'attached document'))}:<ul>${files}</ul></li>`);
  }
  if (inventory.embeds.length) {
    const providers = {};
    for (const e of inventory.embeds) providers[e.provider ?? 'unknown provider'] = (providers[e.provider ?? 'unknown provider'] ?? 0) + 1;
    const list = Object.entries(providers).map(([p, n]) => `${esc(p)} × ${n}`).join(', ');
    found.push(`<li>${esc(plural(inventory.embeds.length, 'external embed'))} (${list}). Their content is not in the export.</li>`);
  }
  if (inventory.storyline.length) {
    found.push(`<li>${esc(plural(inventory.storyline.length, 'embedded Storyline block'))}.</li>`);
  }
  parts.push(found.length ? `<ul class="plain-list">${found.join('')}</ul>` : '<p>None.</p>');

  parts.push('<h4>Block types no check read</h4>');
  parts.push(
    uninspected.length
      ? table({
          id: 'cap-uninspected',
          caption: 'Block types that no enabled check examined',
          headers: ['Block type', 'Count'],
          rows: uninspected.map((u) => [cell(`<code>${esc(u.identity)}</code>`), textCell(String(u.count))]),
        })
      : '<p>Every block in this course was read by at least one check.</p>',
  );

  parts.push('<h4>Outside the scope of this tool</h4>');
  parts.push(
    `<ul class="plain-list">${scope
      .map((s) => `<li><strong>${esc(s.title)}</strong>${s.sc.length ? ` <span class="muted">(WCAG ${esc(scText(s.sc))})</span>` : ''}<br>${esc(s.reason)}</li>`)
      .join('')}</ul>`,
  );

  return (
    `<section id="sec-notchecked" aria-labelledby="h-notchecked">` +
    `<h3 id="h-notchecked">4. Not applicable and not checked</h3>` +
    `<p>A report that hides what it cannot test is worse than one that names its blind spots.</p>` +
    parts.join('') +
    `</section>`
  );
}

// ─── Appendix: all images ────────────────────────────────────────────────────

// Only local object URLs and embedded image data are ever used as thumbnails,
// so a bad value can never point the page at the network. SVG is allowed as
// embedded data because an SVG shown through <img> runs no scripts and loads
// no external resources; some SVGs cannot be rasterised (they taint a canvas).
const SAFE_THUMB = /^(blob:|data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[a-z0-9+/=]+$)/i;

const RESULT_LABEL = { REVIEW: 'REVIEW', 'NO PROBLEM DETECTED': 'No problem detected', 'NOT CHECKED': 'Not checked' };
const RESULT_BADGE = { REVIEW: 'review', 'NO PROBLEM DETECTED': 'ok', 'NOT CHECKED': 'notchecked' };

function altCell(row) {
  if (row.altState === 'absent') return cell('<em>None</em>');
  if (row.altState === 'empty') return cell('<em>Empty</em> <span class="muted">(marks the image as decorative)</span>');
  return textCell(row.image?.alt ?? '');
}

function renderImages(report, resolveImage, thumbnailFor) {
  const rows = report.images ?? [];
  const counts = { REVIEW: 0, 'NO PROBLEM DETECTED': 0, 'NOT CHECKED': 0 };
  for (const r of rows) counts[r.result] += 1;

  const imageCell = (row) => {
    const ref = row.image;
    if (!ref) return textCell('—');
    const thumb = thumbnailFor ? thumbnailFor(ref) : null;
    const img =
      typeof thumb === 'string' && SAFE_THUMB.test(thumb)
        ? `<img class="thumb" src="${esc(thumb)}" alt="Thumbnail of ${esc(ref.name)}"><br>`
        : thumbnailFor
          ? '<span class="muted">No thumbnail: the file is not inside the export, or could not be drawn.</span><br>'
          : '';
    const path = resolveImage ? resolveImage(ref) : null;
    const button = path
      ? `<br><button type="button" class="view-image" data-asset="${esc(path)}" data-name="${esc(ref.name)}" data-alt="${esc(ref.alt ?? '')}" data-has-alt="${ref.alt === null ? 'no' : 'yes'}">View image<span class="visually-hidden"> ${esc(ref.name)}</span></button>`
      : '';
    return cell(`${img}<code>${esc(ref.name)}</code>${button}`);
  };

  const body = rows.length
    ? `<p>${esc(plural(rows.length, 'image'))}: ${counts.REVIEW} REVIEW, ${counts['NO PROBLEM DETECTED']} with no problem detected, ${counts['NOT CHECKED']} not checked.</p>` +
      table({
        id: 'cap-images',
        caption: 'Every image, in course order, with its stored alt text',
        headers: ['Image', 'Where', 'Alt text in the export', 'Result'],
        rows: rows.map((r) => [
          imageCell(r),
          textCell(describeLocation(r.location)),
          altCell(r),
          cell(`<span class="badge badge-${RESULT_BADGE[r.result]}">${esc(RESULT_LABEL[r.result])}</span><br>${esc(r.note)}`),
        ]),
      })
    : '<p>The course has no images.</p>';

  return (
    `<section id="sec-images" aria-labelledby="h-images">` +
    `<h3 id="h-images">Appendix: all images</h3>` +
    `<p>Every image the tool found, with the alt text stored in the export, so a person can check that each description is accurate. No tool can judge that. “No problem detected” means only that alt text is present and does not look like a placeholder or file name.</p>` +
    body +
    `</section>`
  );
}

// ─── Whole report ────────────────────────────────────────────────────────────

/**
 * @param {object} report from buildReport
 * @param {{ resolveImage?: (ref: object) => string|null, thumbnailFor?: (ref: object) => string|null }} [options]
 *   resolveImage: given an image reference, the ZIP path of the file, or null.
 *     Supplied by the live page only; it turns on the "View image" buttons.
 *   thumbnailFor: given an image reference, a blob: URL (live page) or an
 *     embedded data:image URL (saved export), or null. Anything else is ignored.
 */
export function renderReport(report, { resolveImage = null, thumbnailFor = null } = {}) {
  const { meta, summary } = report;
  const source = meta.extraction
    ? `Read from <code>${esc(meta.extraction.path)}</code> (${esc(meta.extraction.strategy)}). `
    : '';

  return (
    `<section class="report" aria-labelledby="report-title">` +
    `<h2 id="report-title" tabindex="-1">Report${meta.title ? ` for “${esc(meta.title)}”` : ''}</h2>` +
    `<p class="notice"><strong>This is a triage report, not a conformance assessment.</strong> It points to where a person should look first. A course with no findings is not thereby accessible.</p>` +
    `<p class="muted">${source}${esc(plural(meta.lessonCount, 'outline item'))} and ${esc(plural(meta.blockCount, 'block'))}. Generated ${esc(meta.generatedAt.slice(0, 10))}.</p>` +
    `<ul class="summary" aria-label="Summary of results">` +
    `<li><strong>${summary.fail}</strong> FAIL</li><li><strong>${summary.review}</strong> REVIEW</li><li><strong>${summary.notChecked}</strong> not evaluated</li></ul>` +
    `<nav aria-label="Report sections"><ul class="plain-list inline-list">` +
    `<li><a href="#sec-findings">Findings</a></li><li><a href="#sec-keep">Keep in mind</a></li>` +
    `<li><a href="#sec-limits">Rise limitations</a></li><li><a href="#sec-notchecked">Not checked</a></li>` +
    `<li><a href="#sec-images">All images</a></li></ul></nav>` +
    renderFindings(report, resolveImage) +
    renderKeepInMind(report) +
    renderLimitations(report) +
    renderNotChecked(report) +
    renderImages(report, resolveImage, thumbnailFor) +
    `</section>`
  );
}
