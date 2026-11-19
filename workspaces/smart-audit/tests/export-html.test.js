/**
 * Tests for the standalone HTML export (definition of done item 4).
 *
 * Fixtures are hand-built (no third-party course content).
 */

import { buildReport } from '../src/report/report.js';
import { renderReport } from '../src/report/render-report.js';
import { exportReportHtml, reportFileName } from '../src/report/export-html.js';
import { RISE_LIMITATIONS } from '../src/report/limitations-data.js';

const now = new Date('2026-11-19T12:34:56Z');

function course(title = 'Fixture Course') {
  return {
    course: {
      title,
      lessons: [
        {
          id: 'les1',
          title: 'Intro',
          type: 'blocks',
          items: [
            { id: 'b0', family: 'text', type: 'text', variant: 'heading', items: [{ id: 'i0', heading: '<p>Hello</p>' }] },
            { id: 'b1', family: 'text', type: 'text', variant: 'paragraph', items: [{ id: 'i1', paragraph: '<p><a href="https://example.org/a"> </a></p>' }] },
            { id: 'b2', family: 'image', type: 'image', variant: 'hero', items: [{ id: 'i2', media: { image: { key: 'hero.png' } } }] },
          ],
        },
      ],
    },
  };
}

const build = (data = course()) =>
  buildReport(data, { registry: RISE_LIMITATIONS, now, extraction: { strategy: 'locale-jsonp', path: 'lib/locales/und.js' } });

const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

describe('exportReportHtml', () => {
  const report = build();
  const html = exportReportHtml(report, { sourceFileName: 'my-course.zip' });
  const doc = parse(html);

  test('is a complete document with a language and a title', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.title).toBe('SmartAudit triage report — Fixture Course');
    expect(doc.querySelector('meta[charset]')).not.toBeNull();
  });

  test('contains exactly the on-screen report markup', () => {
    expect(html).toContain(renderReport(report));
  });

  test('has one h1 and a heading outline that does not skip levels', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    const levels = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  });

  test('has a main landmark', () => {
    expect(doc.querySelectorAll('main')).toHaveLength(1);
  });

  test('contains all four sections and the triage notice', () => {
    for (const id of ['sec-findings', 'sec-keep', 'sec-limits', 'sec-notchecked']) {
      expect(doc.getElementById(id)).not.toBeNull();
    }
    expect(doc.body.textContent).toContain('This is a triage report, not a conformance assessment.');
  });

  test('carries the findings the report found', () => {
    expect(report.summary.fail).toBeGreaterThan(0);
    const badges = [...doc.querySelectorAll('#sec-findings .badge')].map((b) => b.textContent);
    expect(badges.filter((b) => b === 'FAIL')).toHaveLength(report.summary.fail);
    expect(badges.filter((b) => b === 'REVIEW')).toHaveLength(report.summary.review);
  });

  test('records when it was generated and from which file', () => {
    expect(doc.querySelector('header').textContent).toContain('2026-11-19T12:34:56.000Z');
    expect(doc.querySelector('header code').textContent).toBe('my-course.zip');
  });

  test('omits the file name when none is given', () => {
    expect(parse(exportReportHtml(report)).querySelector('header code')).toBeNull();
  });

  test('contains no scripts and no event-handler attributes', () => {
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    for (const el of doc.querySelectorAll('*')) {
      for (const attr of el.attributes) expect(attr.name.startsWith('on')).toBe(false);
    }
  });

  test('loads nothing: no external resources, and a CSP that blocks fetches', () => {
    expect(doc.querySelectorAll('[src], link, iframe, object, embed, img, base')).toHaveLength(0);
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toMatch(/script-src/);
  });

  test('styles are inline', () => {
    expect(doc.querySelectorAll('style')).toHaveLength(1);
    expect(doc.querySelector('style').textContent).toContain('@media print');
  });

  test('escapes hostile course and file names', () => {
    const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
    const out = exportReportHtml(build(course(evil)), { sourceFileName: evil });
    const d = parse(out);
    expect(d.querySelectorAll('script, img')).toHaveLength(0);
    expect(d.title).toBe(`SmartAudit triage report — ${evil}`);
    expect(d.querySelector('header code').textContent).toBe(evil);
  });

  test('works for a course with no title', () => {
    const data = course();
    delete data.course.title;
    expect(parse(exportReportHtml(build(data))).title).toBe('SmartAudit triage report');
  });
});

describe('reportFileName', () => {
  const name = (title) => {
    const data = course(title);
    if (title === undefined) delete data.course.title;
    return reportFileName(build(data));
  };

  test('uses the course title and the generation date', () => {
    expect(name('Fixture Course')).toBe('smartaudit-report-fixture-course-2026-11-19.html');
  });

  test('drops accents and characters unsafe in file names', () => {
    expect(name('Café: Safety / Ops <v2>?')).toBe('smartaudit-report-cafe-safety-ops-v2-2026-11-19.html');
    expect(name('../../etc/passwd')).toBe('smartaudit-report-etc-passwd-2026-11-19.html');
  });

  test('falls back when the title is missing or has no usable characters', () => {
    expect(name(undefined)).toBe('smartaudit-report-2026-11-19.html');
    expect(name('日本語')).toBe('smartaudit-report-2026-11-19.html');
  });

  test('caps long titles without a trailing hyphen', () => {
    const n = name(`${'a'.repeat(59)} b c`);
    expect(n).toBe(`smartaudit-report-${'a'.repeat(59)}-2026-11-19.html`);
  });
});
