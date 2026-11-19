/**
 * @jest-environment jsdom
 */
import { RISE_LIMITATIONS } from '../src/report/limitations-data.js';
import { limitationsSection, matchTrigger, isStale } from '../src/report/limitations.js';
import { buildReport } from '../src/report/report.js';
import { renderReport } from '../src/report/render-report.js';
import { parseGaps, parsePageDate, toSnapshot, diffGaps, compareWithRegistry, fingerprint } from '../tooling/limitations-source.js';

const now = new Date('2026-11-19T12:00:00Z');

const block = (family, type, variant, extra = {}) => ({ family, type, variant, ...extra });
const course = (items = [], extra = {}) => ({ course: { title: 'T', lessons: [{ id: 'l1', title: 'L', type: 'blocks', items }], ...extra } });
const section = (items, extra) => {
  const courseData = course(items, extra);
  const report = buildReport(courseData, { checks: [], registry: RISE_LIMITATIONS, now });
  return report.limitations;
};
const ids = (s) => s.entries.map((e) => e.gap);

describe('the limitations data file', () => {
  const { entries } = RISE_LIMITATIONS;

  test('lists the 22 gaps in page order with unique ids', () => {
    expect(entries).toHaveLength(22);
    expect(entries.map((e) => e.gap)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
    expect(new Set(entries.map((e) => e.id)).size).toBe(22);
  });

  test('every entry carries what the contract requires', () => {
    for (const e of entries) {
      expect(e).toEqual(expect.objectContaining({ id: expect.any(String), title: expect.any(String), summary: expect.any(String), status: expect.any(String) }));
      expect(e.sc.length).toBeGreaterThan(0);
      expect(['A', 'AA', 'AAA']).toContain(e.level);
      expect(['standing', 'identity', 'setting', 'content', 'dormant']).toContain(e.trigger.kind);
      if (e.trigger.kind === 'dormant') expect(e.trigger.reason).toMatch(/\w/);
    }
    expect(RISE_LIMITATIONS.sourceUrl).toMatch(/^https:\/\//);
    expect(Date.parse(RISE_LIMITATIONS.asOf)).not.toBeNaN();
    expect(Date.parse(RISE_LIMITATIONS.checkedOn)).not.toBeNaN();
  });

  test('never guesses a block identity for something not yet seen in an export', () => {
    const detectable = entries.filter((e) => e.trigger.kind === 'identity');
    for (const e of detectable) for (const p of e.trigger.patterns) expect(p).toMatch(/^interactive-fullscreen\/interactive\/(scenario|process|labeledgraphic)$/);
    expect(entries.filter((e) => e.trigger.kind === 'dormant').map((e) => e.gap)).toEqual([5, 6, 7, 8, 10, 12, 15, 17, 19]);
  });
});

describe('which entries apply to a course', () => {
  test('a course with none of the affected content lists only standing gaps', () => {
    const s = section([block('text', 'text', 'paragraph', { paragraph: '<p>Hello</p>' })]);
    expect(s.entries).toEqual([]);
    expect(s.standing.map((e) => e.gap)).toEqual([2, 4, 16, 21]);
    expect(s.counts).toEqual({ listed: 22, matched: 0, standing: 4, notPresent: 9, notDetectable: 9 });
  });

  test('Scenario, Process and Labeled Graphic blocks match their gaps, with a reason', () => {
    const s = section([
      block('interactive-fullscreen', 'interactive', 'scenario', { items: [] }),
      block('interactive-fullscreen', 'interactive', 'process', { items: [] }),
      block('interactive-fullscreen', 'interactive', 'labeledgraphic', { items: [] }),
    ]);
    expect(ids(s)).toEqual([9, 14, 18, 22]);
    expect(s.entries.every((e) => /in this course/.test(e.because))).toBe(true);
  });

  test('a video block matches the audio description gap', () => {
    expect(ids(section([block('multimedia', 'multimedia', 'video', { items: [] })]))).toEqual([1]);
  });

  test('a table in rich text matches the table gap', () => {
    const s = section([block('text', 'text', 'paragraph', { paragraph: '<table><tr><td>x</td></tr></table>' })]);
    expect(ids(s)).toEqual([20]);
    expect(s.entries[0].because).toMatch(/1 rich-text field/);
  });

  test('search on and navigation off match their settings', () => {
    expect(ids(section([], { allowSearch: true }))).toEqual([11]);
    expect(ids(section([], { theme: { navigation: false } }))).toEqual([13]);
    expect(ids(section([], { allowSearch: false, theme: { navigation: true } }))).toEqual([]);
  });

  test('a missing alt FAIL matches the image gap; a REVIEW alone does not', () => {
    const base = { courseData: course(), blocks: [] };
    const trigger = RISE_LIMITATIONS.entries[2].trigger;
    expect(matchTrigger(trigger, { ...base, findings: [{ checkId: 'image-alt', severity: 'FAIL' }] })).toMatch(/1 image/);
    expect(matchTrigger(trigger, { ...base, findings: [{ checkId: 'image-alt', severity: 'REVIEW' }] })).toBeNull();
  });

  test('gaps that cannot be detected are counted, never reported as absent', () => {
    const s = section([]);
    expect(s.counts.notDetectable).toBe(9);
    expect(s.entries.map((e) => e.gap)).not.toContain(7);
  });
});

describe('dates and staleness', () => {
  test('staleness runs from the day the list was last compared, not the page date', () => {
    const old = { ...RISE_LIMITATIONS, asOf: '2026-09-24', checkedOn: '2026-05-01' };
    expect(limitationsSection(old, now).stale).toBe(true);
    expect(limitationsSection(RISE_LIMITATIONS, now).stale).toBe(false);
    expect(limitationsSection({ ...RISE_LIMITATIONS, checkedOn: undefined, asOf: '2026-09-24' }, now).stale).toBe(false);
  });

  test('the list goes stale 90 days after it was checked', () => {
    expect(isStale('2026-11-19', new Date('2027-02-17T00:00:00Z'))).toBe(false); // exactly 90 days
    expect(isStale('2026-11-19', new Date('2027-02-17T12:00:00Z'))).toBe(true);
  });
});

describe('rendering', () => {
  const render = (courseData, registry = RISE_LIMITATIONS) => renderReport(buildReport(courseData, { checks: [], registry, now }));

  test('prints both dates, the source link and the plain-language framing', () => {
    const html = render(course([block('interactive-fullscreen', 'interactive', 'scenario', { items: [] })]));
    expect(html).toContain('Documented by Articulate as of 2026-09-24');
    expect(html).toContain('last compared with it on 2026-11-19');
    expect(html).toContain('href="https://www.articulate.com/about/accessibility/rise-360-accessibility-maturity-plan/"');
    expect(html).toContain('not mistakes by the author');
    expect(html).toContain('Scenario does not fit small screens');
    expect(html).toContain('Why it is listed: 1 matching block in this course');
  });

  test('shows the standing gaps under their own heading and says how many cannot be detected', () => {
    const html = render(course());
    expect(html).toContain('Documented gaps that apply to any Rise course');
    expect(html).toContain('Language of a passage cannot be set');
    expect(html).toMatch(/9 concern blocks or settings that this tool cannot yet detect/);
  });

  test('shows the staleness warning only when stale', () => {
    expect(render(course())).not.toContain('may be out of date');
    expect(render(course(), { ...RISE_LIMITATIONS, checkedOn: '2026-01-01' })).toContain('may be out of date');
  });

  test('escapes registry text', () => {
    const hostile = { ...RISE_LIMITATIONS, entries: [{ ...RISE_LIMITATIONS.entries[0], title: '<img src=x onerror=alert(1)>', trigger: { kind: 'standing' } }] };
    expect(render(course(), hostile)).not.toContain('<img src=x');
  });

  test('still says the list is absent when no registry is supplied', () => {
    expect(render(course(), null)).toContain('not included in this build');
  });
});

// ─── maintainer helpers ──────────────────────────────────────────────────────

const row = (description, criterion, status, workaround) =>
  `<div class="wp-block-columns is-tablerow">` +
  `<div class="wp-block-column"><p>${description}</p><ul><li>${criterion}</li></ul></div>` +
  `<div class="wp-block-column"><p>${status}</p></div>` +
  `<div class="wp-block-column"><p>${workaround}</p></div>` +
  `<div class="wp-block-column"><p>Fix it.</p></div></div>`;

const page = (rows, date = 'September 24, 2026') =>
  new DOMParser().parseFromString(
    `<body><p>Last updated: ${date}</p><h2>Identified Accessibility Gaps</h2>${rows.join('')}<h2>Resolved</h2>` +
      row('Something already fixed.', '1.4.3 Contrast (Level AA)', 'Released', 'None available') +
      `</body>`,
    'text/html',
  );

const A = ['Videos lack audio description.', '1.2.3 Audio Description (Level A)', 'Planned', 'Use another tool.'];
const B = ['Tables cannot be captioned.', '1.3.1 Info and Relationships (Level A)', 'Planned', 'None available'];

describe('maintainer helpers: reading the page', () => {
  test('reads the date and the gap rows, ignoring the Resolved section', () => {
    const doc = page([row(...A), row(...B)]);
    expect(parsePageDate(doc)).toBe('2026-09-24');
    const gaps = parseGaps(doc);
    expect(gaps.map((g) => [g.sc, g.level, g.status, g.hasWorkaround])).toEqual([
      [['1.2.3'], 'A', 'Planned', true],
      [['1.3.1'], 'A', 'Planned', false],
    ]);
  });

  test('a redesigned page yields nothing rather than a false all-clear', () => {
    const doc = new DOMParser().parseFromString('<body><h2>Identified Accessibility Gaps</h2><table><tr><td>x</td></tr></table></body>', 'text/html');
    expect(parseGaps(doc)).toEqual([]);
    expect(parsePageDate(doc)).toBeNull();
  });

  test('the snapshot holds fingerprints, not the vendor text', () => {
    const snap = toSnapshot(parseGaps(page([row(...A)])), '2026-09-24', '2026-11-19');
    expect(JSON.stringify(snap)).not.toContain('audio description');
    expect(snap.gaps[0].fingerprint).toBe(fingerprint(A[0]));
  });
});

describe('maintainer helpers: noticing changes', () => {
  const snapshot = toSnapshot(parseGaps(page([row(...A), row(...B)])), '2026-09-24', '2026-11-19');

  test('no change reports nothing', () => {
    const d = diffGaps(snapshot, parseGaps(page([row(...A), row(...B)])), '2026-09-24');
    expect(d).toMatchObject({ added: [], removed: [], changed: [], dateChanged: false });
  });

  test('reports an added gap, a removed gap and a changed status', () => {
    const C = ['Search loses focus.', '2.4.3 Focus Order (Level A)', 'Planned', 'None available'];
    const live = parseGaps(page([row(A[0], A[1], 'In progress', A[3]), row(...C)], 'October 30, 2026'));
    const d = diffGaps(snapshot, live, '2026-10-30');
    expect(d.dateChanged).toBe(true);
    expect(d.added.map((g) => g.sc)).toEqual([['2.4.3']]);
    expect(d.removed.map((g) => g.sc)).toEqual([['1.3.1']]);
    expect(d.changed[0].what).toEqual(['status Planned -> In progress']);
  });

  test('pairs a reworded gap by its criterion', () => {
    const live = parseGaps(page([row(...A), row('Tables have no captions at all.', B[1], 'Planned', 'None available')]));
    expect(diffGaps(snapshot, live, '2026-09-24').pairs).toHaveLength(1);
  });

  test('notices when the data file drifts from the page', () => {
    const gaps = parseGaps(page([row(...A), row(...B)]));
    const registry = { entries: [{ sc: ['1.2.3'], level: 'A', status: 'Planned', workaround: 'x' }, { sc: ['1.3.1'], level: 'A', status: 'Fixed', workaround: null }] };
    expect(compareWithRegistry(registry, gaps)).toEqual(['gap 2: registry says "Fixed", page says "Planned"']);
    expect(compareWithRegistry({ entries: [registry.entries[0]] }, gaps)[0]).toMatch(/1 entries but the page lists 2/);
  });
});
