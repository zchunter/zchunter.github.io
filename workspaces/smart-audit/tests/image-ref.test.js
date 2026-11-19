/**
 * Tests for image references and preview rendering. Record shapes copy what
 * a real export showed (2026-11-19); names are made up.
 */

import { imageRef, resolveImage } from '../src/report/image-ref.js';
import { buildReport } from '../src/report/report.js';
import { renderReport } from '../src/report/render-report.js';
import { exportReportHtml } from '../src/report/export-html.js';
import { createFinding } from '../src/report/finding.js';

const zipOf = (...paths) => (p) => paths.includes(p);

describe('imageRef', () => {
  test('uploaded image: name from originalUrl, crushedKey tried first', () => {
    const ref = imageRef({ key: 'rise/courses/abc/q1w2-Icon%252B-%252BSecurity.png', crushedKey: 'Icon_-_Security.png', originalUrl: 'Icon+-+Security.png', useCrushedKey: true });
    expect(ref.name).toBe('Icon+-+Security.png');
    expect(ref.alt).toBeNull();
    expect(ref.candidates[0]).toBe('assets/Icon_-_Security.png');
    expect(resolveImage(ref, zipOf('assets/Icon_-_Security.png'))).toBe('assets/Icon_-_Security.png');
  });

  test('percent-encoded crushedKey resolves to the decoded file name', () => {
    const ref = imageRef({ key: 'k', crushedKey: 'image%20%2820%29.png', originalUrl: 'image (20).png' });
    expect(resolveImage(ref, zipOf('assets/image (20).png'))).toBe('assets/image (20).png');
  });

  test('block default: src with a folder', () => {
    const ref = imageRef({ key: 'assets/rise/assets/block-defaults/mountains.jpg', src: 'gt-3TF/mountains.jpg', originalUrl: 'mountains.jpg' });
    expect(resolveImage(ref, zipOf('assets/gt-3TF/mountains.jpg'))).toBe('assets/gt-3TF/mountains.jpg');
  });

  test('remote URLs are never candidates', () => {
    const ref = imageRef({ key: 'rise/assets/block-defaults/paraglide.jpg', src: 'https://cdn.example/paraglide.jpg', originalUrl: 'paraglide.jpg' });
    expect(ref.candidates.some((c) => /:\/\//.test(c))).toBe(false);
  });

  test('stored alt is passed through, including empty', () => {
    expect(imageRef({ key: 'a.png', alt: 'A chart' }).alt).toBe('A chart');
    expect(imageRef({ key: 'a.png', alt: '' }).alt).toBe('');
  });

  test('no file in the ZIP resolves to null; a missing record is null', () => {
    expect(resolveImage(imageRef({ key: 'a.png' }), zipOf())).toBeNull();
    expect(imageRef(null)).toBeNull();
    expect(resolveImage(null, zipOf('x'))).toBeNull();
  });

  test('a malformed decode sequence does not throw', () => {
    expect(() => imageRef({ key: 'bad%E0%A4%A.png' })).not.toThrow();
  });
});

describe('finding.image', () => {
  const base = { checkId: 'x', sc: '1.1.1', severity: 'REVIEW', location: { scope: 'course' }, message: 'm', remediation: 'r' };
  test('defaults to null and rejects a malformed value', () => {
    expect(createFinding(base).image).toBeNull();
    expect(() => createFinding({ ...base, image: { name: 1 } })).toThrow(/image reference/);
  });
});

describe('rendering image findings', () => {
  const data = {
    course: {
      title: 'C',
      lessons: [
        {
          id: 'l',
          title: 'Lesson',
          type: 'blocks',
          items: [
            { id: 'b', family: 'image', type: 'image', variant: 'hero', items: [{ id: 'i', media: { image: { key: 'k', crushedKey: 'Chart.png', originalUrl: 'Chart "Q1" <b>.png' } } }] },
          ],
        },
      ],
    },
  };
  const report = buildReport(data, { now: new Date('2026-11-19T00:00:00Z') });
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

  test('names the file without a resolver, and offers no button', () => {
    const doc = parse(renderReport(report));
    expect(doc.querySelector('#sec-findings code').textContent).toBe('Chart "Q1" <b>.png');
    expect(doc.querySelectorAll('.view-image')).toHaveLength(0);
  });

  test('offers a labelled button when the file is in the ZIP, with escaped data', () => {
    const doc = parse(renderReport(report, { resolveImage: (ref) => resolveImage(ref, zipOf('assets/Chart.png')) }));
    const btn = doc.querySelector('button.view-image');
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.dataset.asset).toBe('assets/Chart.png');
    expect(btn.dataset.name).toBe('Chart "Q1" <b>.png');
    expect(btn.dataset.hasAlt).toBe('no');
    expect(btn.textContent).toBe('View image Chart "Q1" <b>.png');
    expect(doc.querySelectorAll('b')).toHaveLength(0);
  });

  test('no button when the file is not in the ZIP', () => {
    const doc = parse(renderReport(report, { resolveImage: (ref) => resolveImage(ref, zipOf()) }));
    expect(doc.querySelectorAll('.view-image')).toHaveLength(0);
  });

  test('the saved HTML export names the file but has no View buttons', () => {
    const doc = parse(exportReportHtml(report));
    expect(doc.querySelector('#sec-findings code').textContent).toBe('Chart "Q1" <b>.png');
    expect(doc.querySelectorAll('button')).toHaveLength(0);
  });
});

// ─── appendix: all images ────────────────────────────────────────────────────

describe('All images appendix', () => {
  const img = (extra = {}) => ({ key: 'k', ...extra });
  const blk = (variant, items, extra = {}) => ({ id: variant, family: 'image', type: 'image', variant, items, ...extra });
  const data = {
    course: {
      title: 'C',
      coverImage: { media: { image: img({ crushedKey: 'cover.png', originalUrl: 'cover.png', alt: 'Course banner' }) } },
      lessons: [
        {
          id: 'l',
          title: 'Lesson',
          type: 'blocks',
          items: [
            blk('hero', [{ media: { image: img({ crushedKey: 'good.png', originalUrl: 'good.png', alt: 'A heron in water' }) } }]),
            blk('hero', [{ media: { image: img({ crushedKey: 'none.png', originalUrl: 'none.png' }) } }]),
            blk('hero', [{ media: { image: img({ crushedKey: 'empty.png', originalUrl: 'empty.png', alt: '' }) } }]),
            blk('hero', [{ media: { image: img({ crushedKey: 'bad.png', originalUrl: 'bad.png', alt: 'IMG_1234.png' }) } }], { background: { media: { image: img({ originalUrl: 'bg.jpg' }) } } }),
          ],
        },
      ],
    },
  };
  const report = buildReport(data, { now: new Date('2026-11-19T00:00:00Z') });
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

  test('lists every image in course order, including ones with no finding', () => {
    // Course images first, then blocks in order; a block's own images before its items'.
    expect(report.images.map((r) => [r.image.name, r.result])).toEqual([
      ['cover.png', 'NO PROBLEM DETECTED'],
      ['good.png', 'NO PROBLEM DETECTED'],
      ['none.png', 'REVIEW'],
      ['empty.png', 'REVIEW'],
      ['bg.jpg', 'NOT CHECKED'],
      ['bad.png', 'REVIEW'],
    ]);
  });

  test('agrees with the findings: every REVIEW row has a matching finding', () => {
    const reviewRows = report.images.filter((r) => r.result === 'REVIEW').length;
    const imageFindings = report.findings.filter((f) => f.checkId === 'image-alt').length;
    expect(reviewRows).toBe(imageFindings);
  });

  test('renders stored alt text, None and Empty, and a summary line', () => {
    const doc = parse(renderReport(report));
    const sec = doc.getElementById('sec-images');
    expect(sec.querySelector('h3').textContent).toBe('Appendix: all images');
    expect(sec.textContent).toContain('6 images: 3 REVIEW, 2 with no problem detected, 1 not checked.');
    const altCells = [...sec.querySelectorAll('tbody tr')].map((tr) => tr.children[2].textContent);
    expect(altCells).toEqual(expect.arrayContaining(['A heron in water', 'None', 'Empty (marks the image as decorative)', 'IMG_1234.png']));
    expect(doc.querySelector('nav a[href="#sec-images"]')).not.toBeNull();
  });

  test('never says "pass"; the no-problem note asks for an accuracy check', () => {
    const html = renderReport(report);
    expect(html).not.toMatch(/\bpass(ed)?\b/i);
    expect(html).toContain('Check that it is accurate.');
  });

  test('thumbnails: only blob: or raster data: URLs are used', () => {
    const cases = [
      ['blob:http://localhost/abc', 1],
      ['data:image/png;base64,iVBORw0KGgo=', 1],
      ['data:image/svg+xml;base64,PHN2Zz4=', 1], // safe in <img>: no scripts, no fetches
      ['data:text/html;base64,PGI+', 0],
      ['https://example.org/x.png', 0],
      ['javascript:alert(1)', 0],
      ['data:image/png;base64,AAAA" onerror="x', 0],
    ];
    for (const [url, n] of cases) {
      const doc = parse(renderReport(report, { thumbnailFor: () => url }));
      expect(doc.querySelectorAll('#sec-images img.thumb').length).toBe(n * report.images.length);
    }
  });

  test('a missing thumbnail is explained, not left blank', () => {
    const doc = parse(renderReport(report, { thumbnailFor: () => null }));
    expect(doc.getElementById('sec-images').textContent).toContain('No thumbnail: the file is not inside the export');
    // Without thumbnails at all (no thumbnailFor), no such note.
    expect(parse(renderReport(report)).getElementById('sec-images').textContent).not.toContain('No thumbnail');
  });

  test('the saved export embeds data: thumbnails and its CSP allows only those', () => {
    const doc = parse(exportReportHtml(report, { thumbnailFor: () => 'data:image/webp;base64,UklGRg==' }));
    const imgs = [...doc.querySelectorAll('img')];
    expect(imgs.length).toBe(report.images.length);
    expect(imgs.every((i) => i.getAttribute('src').startsWith('data:image/'))).toBe(true);
    expect(imgs.every((i) => /^Thumbnail of /.test(i.getAttribute('alt')))).toBe(true);
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toMatch(/img-src data:;/);
    expect(csp).toContain("default-src 'none'");
  });

  test('the saved export ignores blob: thumbnails, which would not survive saving', () => {
    const doc = parse(exportReportHtml(report, { thumbnailFor: () => 'blob:http://localhost/abc' }));
    expect(doc.querySelectorAll('img')).toHaveLength(0);
  });
});
