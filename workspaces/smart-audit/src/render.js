/**
 * Renders the dump model + issue list into the HTML string shown by index.html.
 * Relocated verbatim from the index.html inline script. Browser-facing (the
 * expand/lightbox handlers touch the DOM); no check logic lives here.
 */

import { toStr } from './extract.js';
import { esc, stripHtml } from './html.js';
import { buildUnknownsReport } from './dump.js';

export function renderOutput(dump, issues) {
  const unknownsReport = buildUnknownsReport(dump);
  const hasUnknowns = unknownsReport.unknownBlocks.length > 0
    || unknownsReport.unknownBlockFields.length > 0
    || unknownsReport.unknownFields.length > 0;
  return renderSummary(dump, issues)
    + renderIssues(issues)
    + renderLessons(dump)
    + (hasUnknowns ? renderUnknownsReport(unknownsReport) : '')
    + renderRaw(dump);
}

function renderSummary(dump, issues) {
  const errors   = issues.filter(i => i.level === 'error').length;
  const warns    = issues.filter(i => i.level === 'warn').length;
  const unknowns = issues.filter(i => i.level === 'unknown').length;

  return `
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="stat"><div class="stat-label">Title</div><div class="stat-value" style="font-size:0.85rem">${esc(dump.meta.title ?? 'Unknown')}</div></div>
      <div class="stat"><div class="stat-label">Lessons</div><div class="stat-value">${dump.summary.lessonCount}</div></div>
      <div class="stat"><div class="stat-label">Errors</div><div class="stat-value ${errors > 0 ? 'warn' : 'ok'}">${errors}</div></div>
      <div class="stat"><div class="stat-label">Warnings</div><div class="stat-value ${warns > 0 ? 'warn' : 'ok'}">${warns}</div></div>
      <div class="stat"><div class="stat-label">Unknown</div><div class="stat-value ${unknowns > 0 ? 'warn' : 'ok'}">${unknowns}</div></div>
    </div>`;
}

function renderIssues(issues) {
  if (!issues.length) return `<h2>Issues</h2><div class="issues-list"><p class="no-issues">No issues found</p></div>`;
  const rows = issues.map(i => `
    <div class="issue-item">
      <span class="badge badge-${i.level}">${i.level}</span>
      <span>${esc(i.message)}<br><span class="issue-path">${esc(i.path)}</span></span>
    </div>`).join('');
  return `<h2>Issues</h2><div class="issues-list">${rows}</div>`;
}

function renderLessons(dump) {
  const html = dump.lessons.map(lesson => {
    // Sections are Rise dividers — they contain no blocks by design
    if (lesson.type === 'section') {
      return `<div style="padding:0.4rem 0.75rem;margin-bottom:0.35rem;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#64748b;font-size:0.8rem">
        <span style="color:#94a3b8;font-weight:600">${esc(lesson.title ?? '(untitled section)')}</span>
        <span style="margin-left:0.5rem">[section]</span>
      </div>`;
    }

    const blocks = (lesson.blocks ?? []).map(block => {
      const unknownFlag = block.unknown
        ? ` <span style="color:#a5b4fc;font-size:0.7rem">[UNKNOWN BLOCK TYPE]</span>` : '';
      const bg = block.backgroundImage
        ? `<div class="field"><span class="field-name">bg-image:</span> ${renderAlt(block.backgroundImage)}</div>`
        : '';
      const unknownBlockFieldsHtml = (block.unknownBlockFields ?? []).map(uf =>
        `<div class="field" style="color:#a5b4fc"><span class="field-name">[unknown block field]</span> "${esc(uf.key)}" <span style="color:#475569">(${esc(uf.valueType)})</span></div>`
      ).join('');
      const items = (block.items ?? []).map(item => renderItem(item)).join('');
      return `<div class="block" ${block.unknown ? 'style="border-color:#4338ca"' : ''}>
        <div class="block-identity">${esc(block.identity)}${unknownFlag}</div>
        ${bg}${unknownBlockFieldsHtml}${items}
      </div>`;
    }).join('');

    return `<details>
      <summary>
        <span>${esc(lesson.title ?? '(no title)')} <span class="summary-meta">[${esc(lesson.type)}]</span></span>
        <span class="summary-arrow">›</span>
      </summary>
      <div class="detail-body"><div class="block-list">${blocks || '<span class="muted">(no blocks)</span>'}</div></div>
    </details>`;
  }).join('');

  return `<h2 style="margin-top:1.5rem">Lessons</h2>${html}`;
}

function renderItem(item) {
  if (item.blockType === 'flashcard')      return renderFlashcard(item);
  if (item.blockType === 'knowledgeCheck') return renderKC(item);
  if (item.blockType === 'scenario')       return renderScenario(item);
  if (item.blockType === 'labeledgraphic') return renderLabeledGraphicMarker(item);
  return renderGenericItem(item);
}

const TEXT_FIELDS_RENDER = ['heading', 'paragraph', 'description', 'title', 'label', 'caption', 'completeHint', 'date'];

function renderGenericItem(item, indent) {
  let html = '';
  const wrap = indent ? 'nested' : '';

  for (const field of TEXT_FIELDS_RENDER) {
    if (!item[field]) continue;
    const full    = stripHtml(toStr(item[field]));
    const preview = full.slice(0, 160);
    const content = full.length > 160
      ? `<span class="text-expand-preview">${esc(preview)}… <button class="expand-btn" onclick="toggleExpand(this)">[expand]</button></span><span class="text-expand-full">${esc(full)}</span>`
      : `<span class="field-value">${esc(full)}</span>`;
    html += `<div class="field ${wrap}"><span class="field-name">${field}:</span> ${content}</div>`;
  }

  if (item.image) {
    html += `<div class="field ${wrap}"><span class="field-name">image:</span> ${renderAlt(item.image)}</div>`;
  } else if (item.imageSlotEmpty) {
    // Media container was present in Rise data but no image was placed — show explicitly
    // so a QA reviewer can confirm the absence was intentional vs overlooked
    html += `<div class="field ${wrap}"><span class="field-name">image:</span> <span class="muted">(no image)</span></div>`;
  } else if (!html && !indent) {
    // Block has no text content and no image — make it visible rather than showing nothing
    html += `<div class="field"><span class="muted">(no text content)</span></div>`;
  }

  for (const link of item.links ?? []) {
    const cls = link.empty || link.missingProtocol ? 'missing' : 'present';
    html += `<div class="field ${wrap}"><span class="field-name">link:</span> <span class="${cls}">${esc(link.href || '(empty)')}</span></div>`;
  }

  if (item.destination) {
    const d = item.destination;
    const cls = d.empty || d.missingProtocol ? 'missing' : 'present';
    html += `<div class="field ${wrap}"><span class="field-name">destination:</span> <span class="${cls}">${esc(d.value ?? '(empty)')}</span></div>`;
  }

  for (const child of item.items ?? []) {
    html += renderGenericItem(child, true);
  }

  for (const uf of item.unknownFields ?? []) {
    html += `<div class="field ${wrap}" style="color:#a5b4fc"><span class="field-name">[unknown field]</span> "${esc(uf.key)}" <span style="color:#475569">(${esc(uf.valueType)})</span></div>`;
  }

  return html;
}

function renderLabeledGraphicMarker(item) {
  const pos   = (item.x && item.y) ? ` <span class="muted">(${esc(item.x)}, ${esc(item.y)})</span>` : '';
  const title = item.title ? `<span class="field-value">${esc(item.title)}</span>` : `<span class="muted">(no title)</span>`;

  // Show confirmed icon label when known; flag unrecognised codes as needing investigation
  let iconNote = '';
  if (item.icon != null) {
    iconNote = item.iconLabel != null
      ? ` <span class="muted" style="font-size:0.72rem">icon:${esc(item.iconLabel)}</span>`
      : ` <span class="warn-val" style="font-size:0.72rem" title="Icon code ${esc(item.icon)} — type unrecognised, see TODO in code">icon:${esc(item.icon)} (?)</span>`;
  }

  let html = `<div class="field"><span class="field-name">marker ${esc(String(item.sequence))}:</span> ${title}${pos}${iconNote}</div>`;

  if (item.description) {
    const full    = stripHtml(toStr(item.description));
    const preview = full.slice(0, 160);
    const content = full.length > 160
      ? `<span class="text-expand-preview">${esc(preview)}… <button class="expand-btn" onclick="toggleExpand(this)">[expand]</button></span><span class="text-expand-full">${esc(full)}</span>`
      : `<span class="field-value">${esc(full)}</span>`;
    html += `<div class="field nested"><span class="field-name">description:</span> ${content}</div>`;
  }

  for (const uf of item.unknownFields ?? []) {
    html += `<div class="field nested" style="color:#a5b4fc"><span class="field-name">[unknown field]</span> "${esc(uf.key)}" <span style="color:#475569">(${esc(uf.valueType)})</span></div>`;
  }

  return html;
}

function renderFlashcard(item) {
  let html = '<div class="field"><span class="field-name">flashcard</span></div>';
  const renderSide = (side, label) => {
    let s = '';
    if (side.description) {
      const full    = stripHtml(side.description);
      const preview = full.slice(0, 160);
      const content = full.length > 160
        ? `<span class="text-expand-preview">${esc(preview)}… <button class="expand-btn" onclick="toggleExpand(this)">[expand]</button></span><span class="text-expand-full">${esc(full)}</span>`
        : `<span class="field-value">${esc(full)}</span>`;
      s += `<div class="field nested"><span class="field-name">${label}:</span> ${content}</div>`;
    }
    if (side.image) {
      // Flashcards have no alt field in Rise's data model — render thumbnail so
      // the reviewer can judge alt text need manually
      let thumb = '';
      if (side.image.displayUrl) {
        thumb = `<img class="img-thumb" src="${esc(side.image.displayUrl)}"
          alt=""
          title="Click to expand (no alt field in Rise data)"
          onerror="this.style.display='none';this.nextSibling.style.display='inline'"
          onclick="openLightbox('${esc(side.image.displayUrl)}','')"
        ><span class="warn-val" style="display:none" title="Image loaded but could not render">⚠ render failed</span>`;
      } else if (side.image.filename) {
        thumb = `<span class="missing" style="margin-right:0.25rem" title="File not found in ZIP assets/">⚠ not in ZIP</span>`;
      }
      const name = side.image.filename
        ? `<span class="muted" style="margin-right:0.35rem">${esc(side.image.filename)}</span>`
        : '';
      s += `<div class="field nested"><span class="field-name">${label} image:</span> <span class="img-thumb-wrap">${thumb}${name}<span class="warn-val">[no alt field in Rise data — review manually]</span></span></div>`;
    }
    return s;
  };
  html += renderSide(item.front ?? {}, 'front');
  html += renderSide(item.back  ?? {}, 'back');
  return html;
}

function renderKC(item) {
  const qPreview = stripHtml(toStr(item.questionText)).slice(0, 100);
  let html = `<div class="field"><span class="field-name">knowledge check [${esc(item.feedbackType ?? '?')}]:</span> <span class="field-value text-preview">${esc(qPreview)}</span>`;
  if (!item.hasCorrectAnswer)       html += ' <span class="missing">[NO CORRECT ANSWER]</span>';
  if (item.missingGeneralFeedback)  html += ' <span class="missing">[MISSING FEEDBACK]</span>';
  html += '</div>';

  for (const a of item.answers ?? []) {
    const correct = a.correct ? '✓' : '·';
    const fbCls   = !a.feedback ? 'missing' : 'muted';
    const fbText  = a.feedback ? stripHtml(a.feedback).slice(0, 60) : '(no feedback)';
    html += `<div class="field nested"><span class="field-name">${correct} [${a.index}]</span> ${esc(stripHtml(a.text).slice(0,80))} <span class="${fbCls}"> — ${esc(fbText)}</span></div>`;
  }
  return html;
}

function renderScenario(item) {
  let html = `<div class="field"><span class="field-name">scenario:</span> ${esc(item.title ?? '')}`;
  if (item.character) html += ` <span class="muted">[character: ${esc(item.character.name ?? '?')}]</span>`;
  html += '</div>';

  for (const [i, slide] of (item.slides ?? []).entries()) {
    const altCls = slide.altEmpty ? 'missing' : 'present';
    html += `<div class="field nested"><span class="field-name">slide ${i}:</span> ${esc(slide.title ?? slide.type ?? '')} — alt: <span class="${altCls}">${esc(slide.altEmpty ? '(missing)' : slide.alt)}</span></div>`;
    if (slide.description) {
      html += `<div class="field nested" style="margin-left:2rem"><span class="field-name">desc:</span> <span class="field-value text-preview">${esc(stripHtml(slide.description).slice(0,100))}</span></div>`;
    }
    for (const r of slide.responses ?? []) {
      const rCls = r.altEmpty ? 'missing' : 'present';
      html += `<div class="field nested" style="margin-left:2rem"><span class="field-name">response ${r.index} alt:</span> <span class="${rCls}">${esc(r.altEmpty ? '(missing)' : r.alt)}</span></div>`;
    }
  }
  return html;
}

function renderAlt(img) {
  if (!img) return '<span class="missing">(no image)</span>';

  let thumb = '';
  if (img.displayUrl) {
    // onerror: hide the broken img and reveal the sibling warning span.
    // Using an attribute handler keeps this self-contained without needing a global registry.
    thumb = `<img class="img-thumb" src="${esc(img.displayUrl)}"
      alt="${esc(img.alt ?? '')}"
      title="Click to expand"
      onerror="this.style.display='none';this.nextSibling.style.display='inline'"
      onclick="openLightbox('${esc(img.displayUrl)}','${esc(img.alt ?? '')}')"
    ><span class="warn-val" style="display:none" title="Image loaded but could not render">⚠ render failed</span>`;
  } else if (img.filename) {
    // We know the filename but couldn't find it in the ZIP's assets/ — flag it clearly
    // so it doesn't look like "alt text with no image"
    thumb = `<span class="missing" title="File not found in ZIP assets/" style="margin-right:0.25rem">⚠ not in ZIP</span>`;
  }

  const name = img.filename
    ? `<span class="muted" style="margin-right:0.35rem">${esc(img.filename)}</span>`
    : '';

  const altStatus = img.altEmpty
    ? `<span class="missing">(missing alt)</span>`
    : `<span class="present">${esc(img.alt)}</span>`;

  return `<span class="img-thumb-wrap">${thumb}${name}${altStatus}</span>`;
}

function renderUnknownsReport(report) {
  const blockRows = report.unknownBlocks.map(b => `
    <div style="margin-bottom:1rem">
      <div style="color:#a5b4fc;margin-bottom:0.25rem">Block: <strong>${esc(b.identity)}</strong> — Lesson: "${esc(b.lesson)}"</div>
      <pre style="background:#0a0e17;border:1px solid #1e293b;border-radius:4px;padding:0.75rem;overflow:auto;max-height:300px;font-size:0.72rem;color:#64748b;line-height:1.5">${esc(JSON.stringify(b.rawBlock, null, 2))}</pre>
    </div>`).join('');

  const blockFieldRows = report.unknownBlockFields.map(b => `
    <div style="margin-bottom:1rem">
      <div style="color:#a5b4fc;margin-bottom:0.25rem">Block: <strong>${esc(b.identity)}</strong> — Lesson: "${esc(b.lesson)}"</div>
      ${b.fields.map(uf => `
        <div style="margin-bottom:0.5rem">
          <div style="color:#94a3b8;margin-bottom:0.2rem">Field: <strong>"${esc(uf.key)}"</strong> <span style="color:#475569">(${esc(uf.valueType)})</span></div>
          <pre style="background:#0a0e17;border:1px solid #1e293b;border-radius:4px;padding:0.5rem;overflow:auto;max-height:200px;font-size:0.72rem;color:#64748b;line-height:1.5">${esc(typeof uf.value === 'string' ? uf.value : JSON.stringify(uf.value, null, 2))}</pre>
        </div>`).join('')}
    </div>`).join('');

  const fieldRows = report.unknownFields.map(f => `
    <div style="margin-bottom:1rem">
      <div style="color:#a5b4fc;margin-bottom:0.25rem">Block: <strong>${esc(f.blockIdentity)}</strong> — Lesson: "${esc(f.lesson)}"</div>
      ${f.unknownFields.map(uf => `
        <div style="margin-bottom:0.5rem">
          <div style="color:#94a3b8;margin-bottom:0.2rem">Field: <strong>"${esc(uf.key)}"</strong> <span style="color:#475569">(${esc(uf.valueType)})</span></div>
          <pre style="background:#0a0e17;border:1px solid #1e293b;border-radius:4px;padding:0.5rem;overflow:auto;max-height:200px;font-size:0.72rem;color:#64748b;line-height:1.5">${esc(typeof uf.value === 'string' ? uf.value : JSON.stringify(uf.value, null, 2))}</pre>
        </div>`).join('')}
    </div>`).join('');

  const totalUnknowns = report.unknownBlocks.length + report.unknownBlockFields.length + report.unknownFields.length;
  const copyJson = esc(JSON.stringify(report, null, 2));

  return `<div class="raw-section" style="margin-top:1.5rem">
    <details>
      <summary style="border-color:#4338ca">
        <span style="color:#a5b4fc">Unknown Items Report <span style="color:#475569;font-size:0.75rem">(${report.unknownBlocks.length} unknown block type(s), ${report.unknownBlockFields.length} block(s) with unknown fields, ${report.unknownFields.length} item(s) with unknown fields)</span></span>
        <span class="summary-arrow" style="color:#a5b4fc">›</span>
      </summary>
      <div class="detail-body">
        <p style="color:#64748b;margin-bottom:1.5rem;font-size:0.8rem">Paste this report back when updating SmartAudit to add handling for new block types or fields.</p>
        ${report.unknownBlocks.length ? `<h2 style="margin-bottom:0.75rem">Unknown Block Types</h2>${blockRows}` : ''}
        ${report.unknownBlockFields.length ? `<h2 style="margin-bottom:0.75rem;margin-top:1rem">Blocks With Unknown Fields</h2>${blockFieldRows}` : ''}
        ${report.unknownFields.length ? `<h2 style="margin-bottom:0.75rem;margin-top:1rem">Items With Unknown Fields</h2>${fieldRows}` : ''}
        <h2 style="margin-top:1.5rem;margin-bottom:0.5rem">Full Report JSON</h2>
        <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem">
          <button id="copy-unknowns-btn"
            style="background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;font-family:inherit;font-size:0.75rem">
            Copy to clipboard
          </button>
        </div>
        <pre id="unknowns-json" style="background:#0a0e17;border:1px solid #1e293b;border-radius:6px;padding:1rem;overflow:auto;max-height:400px;color:#64748b;font-size:0.72rem;line-height:1.6">${copyJson}</pre>
      </div>
    </details>
  </div>`;
}

function renderRaw(dump) {
  return `<div class="raw-section">
    <details>
      <summary><span>Raw JSON dump</span><span class="summary-arrow">›</span></summary>
      <div class="detail-body" style="padding:0"><pre>${esc(JSON.stringify(dump, null, 2))}</pre></div>
    </details>
  </div>`;
}

// ─── DOM handlers (attached to window by index.html for inline onclick=) ──────

export function toggleExpand(btn) {
  const preview = btn.closest('.text-expand-preview');
  const full    = preview.nextElementSibling; // .text-expand-full
  preview.style.display = 'none';
  full.style.display    = 'inline';
}

export function openLightbox(src, alt) {
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  img.alt = alt;
  lb.classList.add('open');
}
