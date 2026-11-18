/**
 * Tests for the v1 report skeleton: walker, finding shape, check runner,
 * inventory, reminders, report assembly and HTML rendering.
 *
 * Fixtures are hand-built (no third-party course content).
 */

import {
  blockIdentity,
  matchesIdentity,
  walkLessons,
  walkBlocks,
  walkItems,
  walkStrings,
  describeLocation,
  courseLocation,
} from '../src/report/walk.js';
import { createFinding, sortFindings, SEVERITIES } from '../src/report/finding.js';
import { runChecks, summarizeUninspected, validateCheck } from '../src/report/run-checks.js';
import { buildInventory } from '../src/report/inventory.js';
import { scanFacts, buildReminders } from '../src/report/reminders.js';
import { isStale, limitationsSection } from '../src/report/limitations.js';
import { buildReport } from '../src/report/report.js';
import { renderReport } from '../src/report/render-report.js';
import { buildCensus } from '../src/census.js';

// ─── fixture ─────────────────────────────────────────────────────────────────

function course() {
  return {
    course: {
      title: 'Fixture Course',
      lessons: [
        { id: 'sec1', title: 'Part One', type: 'section' },
        {
          id: 'les1',
          title: 'Intro',
          type: 'blocks',
          items: [
            { id: 'b0', family: 'text', type: 'text', variant: 'heading', items: [{ id: 'i0', heading: '<p>Hello</p>' }] },
            {
              id: 'b1',
              family: 'interactive',
              type: 'interactive',
              variant: 'accordion',
              items: [
                { id: 'i1', title: 'Panel', media: { image: { key: 'a.png', alt: 'x' } }, items: [{ id: 'i1a', paragraph: '<p style="color: #f00">red</p>' }] },
                { id: 'i2', title: 'Panel 2' },
              ],
            },
            {
              id: 'b2',
              family: 'multimedia',
              type: 'multimedia',
              variant: 'attachment',
              items: [{ id: 'i3', media: { attachment: { key: 'Transcript.docx', mimeType: 'application/msword' } } }],
            },
            {
              id: 'b3',
              family: 'multimedia',
              type: 'multimedia',
              variant: 'embed',
              items: [{ id: 'i4', media: { embed: { src: '//x', provider: 'Vimeo' } } }],
            },
            { id: 'b4', family: '360', type: 'interactive', variant: 'storyline', items: [] },
            { id: 'b5', family: 'multimedia', type: 'multimedia', variant: 'video', items: [{ id: 'i5', media: { video: { key: 'v.mp4', captions: [] } } }] },
          ],
        },
        { id: 'quiz1', title: 'Quiz', type: 'quiz', items: [{ id: 'q1', type: 'MULTIPLE_CHOICE', title: 'Q?', answers: [] }] },
      ],
    },
  };
}

const check = (overrides = {}) => ({
  id: 'demo',
  title: 'Demo check',
  sc: ['1.1.1'],
  inspects: ['text/*'],
  run: () => [],
  ...overrides,
});

// ─── walker ──────────────────────────────────────────────────────────────────

describe('identity helpers', () => {
  test('blockIdentity joins family/type/variant and marks missing parts with ?', () => {
    expect(blockIdentity({ family: 'text', type: 'text', variant: 'paragraph' })).toBe('text/text/paragraph');
    expect(blockIdentity({ type: 'MULTIPLE_CHOICE' })).toBe('?/MULTIPLE_CHOICE/?');
    expect(blockIdentity(undefined)).toBe('?/?/?');
  });

  test.each([
    ['*', 'text/text/heading', true],
    ['text/*', 'text/text/heading', true],
    ['text/*', 'list/list/bulleted', false],
    ['text/text/heading', 'text/text/heading', true],
    ['text/text/heading', 'text/text/heading paragraph', false],
    ['*/text/heading', 'text/text/heading', true],
    ['text/text/*', 'text/text/heading', true],
  ])('matchesIdentity(%s, %s) is %s', (pattern, identity, expected) => {
    expect(matchesIdentity(pattern, identity)).toBe(expected);
  });
});

describe('course walker', () => {
  test('walkLessons yields every lesson, including sections and quizzes', () => {
    const lessons = [...walkLessons(course())];
    expect(lessons.map((l) => l.lesson.type)).toEqual(['section', 'blocks', 'quiz']);
    expect(lessons[1].location).toMatchObject({ scope: 'lesson', lessonIndex: 1, lessonId: 'les1', lessonTitle: 'Intro' });
  });

  test('walkBlocks skips section dividers (no items) and includes quiz questions', () => {
    const blocks = [...walkBlocks(course())];
    expect(blocks).toHaveLength(7); // 6 blocks + 1 quiz question
    expect(blocks[0].identity).toBe('text/text/heading');
    expect(blocks[6].identity).toBe('?/MULTIPLE_CHOICE/?');
    expect(blocks[1].location).toMatchObject({ scope: 'block', lessonIndex: 1, blockIndex: 1, blockId: 'b1' });
  });

  test('walkItems yields nested items depth-first with paths', () => {
    const accordion = [...walkBlocks(course())][1];
    const items = [...walkItems(accordion)];
    expect(items.map((i) => i.itemPath)).toEqual(['items[0]', 'items[0].items[0]', 'items[1]']);
    expect(items[1].depth).toBe(2);
    expect(items[1].location).toMatchObject({ scope: 'item', itemPath: 'items[0].items[0]', blockIndex: 1 });
  });

  test('walkers tolerate missing or malformed data without throwing', () => {
    expect([...walkBlocks({})]).toEqual([]);
    expect([...walkBlocks({ course: { lessons: [null, { items: 'nope' }] } })]).toEqual([]);
    expect([...walkItems({ block: { items: [null, 5] }, location: {} })]).toHaveLength(2);
  });

  test('walkStrings finds every string with its path', () => {
    const found = [...walkStrings({ a: ['x', { b: 'y' }], c: 3 })];
    expect(found).toEqual([
      { value: 'x', path: 'a[0]' },
      { value: 'y', path: 'a[1].b' },
    ]);
  });

  test('describeLocation puts titles first and uses 1-based positions', () => {
    const accordion = [...walkBlocks(course())][1];
    const item = [...walkItems(accordion)][1];
    expect(describeLocation(item.location)).toBe('“Intro” (outline item 2) › block 2 (interactive/interactive/accordion) › items[0].items[0]');
    expect(describeLocation(courseLocation())).toBe('Whole course');
  });
});

// ─── finding ─────────────────────────────────────────────────────────────────

describe('createFinding', () => {
  const base = { checkId: 'c', sc: ['1.1.1'], severity: 'FAIL', location: courseLocation(), message: 'm', remediation: 'fix it' };

  test('builds a frozen finding', () => {
    const f = createFinding({ ...base, measured: { value: 3.1, required: 4.5 } });
    expect(f).toMatchObject({ checkId: 'c', sc: ['1.1.1'], severity: 'FAIL', remediation: 'fix it' });
    expect(Object.isFrozen(f)).toBe(true);
  });

  test('accepts a single success criterion string', () => {
    expect(createFinding({ ...base, sc: '2.4.4' }).sc).toEqual(['2.4.4']);
  });

  test('NOT CHECKED needs no remediation', () => {
    const f = createFinding({ ...base, severity: 'NOT CHECKED', remediation: undefined });
    expect(f.remediation).toBeNull();
  });

  test.each([
    ['missing check id', { checkId: '' }],
    ['unknown severity', { severity: 'WARN' }],
    ['no success criterion', { sc: [] }],
    ['malformed success criterion', { sc: ['WCAG 1.1.1'] }],
    ['empty message', { message: '  ' }],
    ['FAIL without remediation', { remediation: '' }],
    ['REVIEW without remediation', { severity: 'REVIEW', remediation: null }],
    ['missing location', { location: undefined }],
  ])('rejects %s', (_label, patch) => {
    expect(() => createFinding({ ...base, ...patch })).toThrow(TypeError);
  });

  test('exposes the three severities', () => {
    expect(SEVERITIES).toEqual(['FAIL', 'REVIEW', 'NOT CHECKED']);
  });

  test('sortFindings orders by severity, then course position', () => {
    const mk = (severity, lessonIndex, blockIndex) =>
      createFinding({ ...base, severity, remediation: 'x', location: { scope: 'block', lessonIndex, blockIndex } });
    const sorted = sortFindings([mk('REVIEW', 0, 0), mk('FAIL', 2, 1), mk('FAIL', 1, 5), mk('NOT CHECKED', 0, 0)]);
    expect(sorted.map((f) => [f.severity, f.location.lessonIndex])).toEqual([
      ['FAIL', 1],
      ['FAIL', 2],
      ['REVIEW', 0],
      ['NOT CHECKED', 0],
    ]);
  });
});

// ─── runner ──────────────────────────────────────────────────────────────────

describe('runChecks', () => {
  test('fills in check id and default success criteria', () => {
    const c = check({
      run: ({ blocks }) => [{ severity: 'REVIEW', location: blocks[0].location, message: 'found', remediation: 'look' }],
    });
    const [f] = runChecks(course(), [c]);
    expect(f).toMatchObject({ checkId: 'demo', sc: ['1.1.1'], severity: 'REVIEW' });
  });

  test('lets a result override the success criteria', () => {
    const c = check({ run: () => [{ severity: 'NOT CHECKED', sc: ['4.1.2'], location: courseLocation(), message: 'm' }] });
    expect(runChecks(course(), [c])[0].sc).toEqual(['4.1.2']);
  });

  test('a throwing check never crashes the report and never passes silently', () => {
    const c = check({ run: () => { throw new Error('boom'); } });
    const results = runChecks(course(), [c]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ severity: 'NOT CHECKED', checkId: 'demo' });
    expect(results[0].message).toContain('boom');
  });

  test('a check emitting a malformed finding is replaced by one NOT CHECKED entry, dropping partial results', () => {
    const c = check({
      run: ({ blocks }) => [
        { severity: 'REVIEW', location: blocks[0].location, message: 'ok', remediation: 'r' },
        { severity: 'BOGUS', location: blocks[0].location, message: 'bad' },
      ],
    });
    const results = runChecks(course(), [c]);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('NOT CHECKED');
  });

  test('a malformed check definition throws', () => {
    expect(() => validateCheck({ id: 'x' })).toThrow(/Invalid check "x"/);
    expect(() => runChecks(course(), [{ id: 'x' }])).toThrow(TypeError);
  });
});

describe('summarizeUninspected', () => {
  const blocks = [...walkBlocks(course())];

  test('with no checks, every block type is reported as unexamined', () => {
    const u = summarizeUninspected(blocks, []);
    expect(u.reduce((n, x) => n + x.count, 0)).toBe(blocks.length);
  });

  test('blocks matched by any check pattern are not reported', () => {
    const u = summarizeUninspected(blocks, [check({ inspects: ['text/*', 'multimedia/*'] })]);
    expect(u.map((x) => x.identity)).not.toContain('text/text/heading');
    expect(u.map((x) => x.identity)).not.toContain('multimedia/multimedia/video');
    expect(u.map((x) => x.identity)).toContain('interactive/interactive/accordion');
  });

  test('a wildcard check covers everything', () => {
    expect(summarizeUninspected(blocks, [check({ inspects: ['*'] })])).toEqual([]);
  });

  test('sorts by count then name', () => {
    const many = [
      ...[...walkBlocks({ course: { lessons: [{ items: [{ family: 'a', type: 'a', variant: 'z' }, { family: 'a', type: 'a', variant: 'z' }, { family: 'a', type: 'a', variant: 'b' }] }] } })],
    ];
    expect(summarizeUninspected(many, []).map((x) => [x.identity, x.count])).toEqual([
      ['a/a/z', 2],
      ['a/a/b', 1],
    ]);
  });
});

// ─── inventory, reminders, limitations ───────────────────────────────────────

describe('buildInventory', () => {
  const inv = buildInventory([...walkBlocks(course())]);

  test('lists attachments with file name and extension', () => {
    expect(inv.attachments).toHaveLength(1);
    expect(inv.attachments[0]).toMatchObject({ filename: 'Transcript.docx', extension: 'docx' });
  });

  test('lists external embeds with provider', () => {
    expect(inv.embeds).toEqual([expect.objectContaining({ provider: 'Vimeo' })]);
  });

  test('lists Storyline blocks', () => {
    expect(inv.storyline).toHaveLength(1);
  });

  test('is empty for a course with none of these', () => {
    expect(buildInventory([])).toEqual({ attachments: [], embeds: [], storyline: [] });
  });
});

describe('reminders', () => {
  const blocks = [...walkBlocks(course())];
  const inv = buildInventory(blocks);

  test('scanFacts counts what the reminders depend on', () => {
    expect(scanFacts(course(), blocks, inv)).toEqual({
      images: 1,
      videos: 1,
      embeds: 1,
      attachments: 1,
      inlineColours: 1,
      interactiveBlocks: 1,
    });
  });

  test('content-specific reminders appear only when the content is present', () => {
    const ids = buildReminders(scanFacts(course(), blocks, inv)).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['alt-quality', 'media-alternatives', 'inline-colour', 'interactive-blocks', 'attached-documents']));

    const bare = { course: { lessons: [{ items: [{ family: 'text', type: 'text', variant: 'paragraph', items: [{ paragraph: 'x' }] }] }] } };
    const bareBlocks = [...walkBlocks(bare)];
    const bareIds = buildReminders(scanFacts(bare, bareBlocks, buildInventory(bareBlocks))).map((r) => r.id);
    expect(bareIds).toEqual(['sensory-language', 'human-read-through']);
  });

  test('reminder text reports real counts', () => {
    const r = buildReminders(scanFacts(course(), blocks, inv)).find((x) => x.id === 'media-alternatives');
    expect(r.text).toContain('1 video');
    expect(r.text).toContain('1 external embed');
  });
});

describe('limitations', () => {
  const now = new Date('2026-11-18T00:00:00Z');

  test.each([
    ['2026-11-01', false],
    ['2026-08-20', false], // 90 days or fewer
    ['2026-08-01', true],
    ['not a date', true],
    [undefined, true],
  ])('isStale(%s) is %s', (asOf, expected) => {
    expect(isStale(asOf, now)).toBe(expected);
  });

  test('without a registry the section says it is absent', () => {
    expect(limitationsSection(null, now)).toEqual({ available: false });
  });

  test('with a registry it carries the date, source and staleness', () => {
    expect(limitationsSection({ asOf: '2026-01-01', sourceUrl: 'https://example.org' }, now)).toMatchObject({
      available: true,
      asOf: '2026-01-01',
      stale: true,
      staleAfterDays: 90,
    });
  });
});

// ─── report assembly ─────────────────────────────────────────────────────────

describe('buildReport', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const finder = check({
    inspects: ['text/*'],
    run: ({ blocks }) => [
      { severity: 'REVIEW', location: blocks[2].location, message: 'second', remediation: 'r' },
      { severity: 'FAIL', location: blocks[0].location, message: 'first', remediation: 'r' },
    ],
  });
  const report = buildReport(course(), { checks: [finder], now, extraction: { strategy: 'locale-jsonp', path: 'locales/und.js' } });

  test('has the four sections and metadata', () => {
    expect(report).toEqual(
      expect.objectContaining({
        meta: expect.any(Object),
        summary: expect.any(Object),
        findings: expect.any(Array),
        keepInMind: expect.any(Array),
        limitations: expect.any(Object),
        notChecked: expect.any(Object),
      }),
    );
    expect(report.meta).toMatchObject({ title: 'Fixture Course', lessonCount: 3, blockCount: 7, generatedAt: '2026-11-18T12:00:00.000Z' });
  });

  test('findings are sorted most severe first and counted', () => {
    expect(report.findings.map((f) => f.message)).toEqual(['first', 'second']);
    expect(report.summary).toEqual({ fail: 1, review: 1, notChecked: 0 });
  });

  test('NOT CHECKED results go to section 4, not section 1', () => {
    const crashing = check({ run: () => { throw new Error('x'); } });
    const r = buildReport(course(), { checks: [crashing], now });
    expect(r.findings).toEqual([]);
    expect(r.notChecked.items).toHaveLength(1);
    expect(r.summary.notChecked).toBe(1);
  });

  test('section 4 names real content and block types no check read', () => {
    expect(report.notChecked.inventory.attachments).toHaveLength(1);
    expect(report.notChecked.uninspected.map((u) => u.identity)).toContain('interactive/interactive/accordion');
    expect(report.notChecked.uninspected.map((u) => u.identity)).not.toContain('text/text/heading');
    expect(report.notChecked.scope.length).toBeGreaterThan(5);
  });

  test('with no checks enabled the report still builds and reports every block as unexamined', () => {
    const r = buildReport(course(), { checks: [], now });
    expect(r.findings).toEqual([]);
    expect(r.notChecked.uninspected.reduce((n, u) => n + u.count, 0)).toBe(7);
  });

  test('is deterministic for a fixed clock', () => {
    expect(JSON.stringify(buildReport(course(), { checks: [finder], now }))).toBe(JSON.stringify(buildReport(course(), { checks: [finder], now })));
  });

  test('agrees with the census on block and lesson counts', () => {
    const census = buildCensus(course());
    expect(report.meta.blockCount).toBe(census.blocks);
    expect(report.meta.lessonCount).toBe(census.lessons);
  });

  test('a course with no lessons yields an empty but valid report', () => {
    const r = buildReport({ course: { lessons: [] } }, { checks: [], now });
    expect(r.meta).toMatchObject({ lessonCount: 0, blockCount: 0 });
  });
});

// ─── rendering ───────────────────────────────────────────────────────────────

describe('renderReport', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const finder = check({
    run: ({ blocks }) => [
      { severity: 'FAIL', location: blocks[0].location, message: 'Missing thing', remediation: 'Add the thing', measured: { value: 3.1, required: 4.5 } },
    ],
  });
  const html = renderReport(buildReport(course(), { checks: [finder], now, extraction: { strategy: 'locale-jsonp', path: 'locales/und.js' } }));

  test('states that it is triage, not conformance', () => {
    expect(html).toContain('not a conformance assessment');
  });

  test('has all four sections as headings, in order', () => {
    const order = ['1. Findings you can fix', '2. Keep in mind', '3. Rise-documented limitations', '4. Not applicable and not checked'].map((h) => html.indexOf(`>${h}</h3>`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('findings table has a caption, header cells with scope, and severity as text', () => {
    expect(html).toContain('<caption id="cap-findings">');
    expect(html).toContain('<th scope="col">Severity</th>');
    expect(html).toContain('>FAIL</span>');
    expect(html).toContain('Missing thing (3.1 (required: 4.5))');
  });

  test('scrollable table regions are named and keyboard focusable', () => {
    expect(html).toMatch(/class="table-scroll" role="region" aria-labelledby="cap-findings" tabindex="0"/);
  });

  test('every table has exactly one caption', () => {
    const tables = (html.match(/<table/g) ?? []).length;
    const captions = (html.match(/<caption/g) ?? []).length;
    expect(tables).toBeGreaterThan(0);
    expect(captions).toBe(tables);
  });

  test('includes the extraction source and the not-in-this-build notice for limitations', () => {
    expect(html).toContain('locales/und.js');
    expect(html).toContain('not included in this build');
  });

  test('escapes untrusted course content everywhere it is printed', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const hostile = {
      course: {
        title: evil,
        lessons: [
          {
            id: 'l',
            title: evil,
            type: 'blocks',
            items: [
              { id: 'b', family: evil, type: 't', variant: 'v', items: [{ media: { attachment: { key: `${evil}.docx` } } }, { media: { embed: { provider: evil } } }] },
            ],
          },
        ],
      },
    };
    const inject = check({ run: ({ blocks }) => [{ severity: 'FAIL', location: blocks[0].location, message: evil, remediation: evil }] });
    const out = renderReport(buildReport(hostile, { checks: [inject], now, extraction: { strategy: evil, path: evil } }));
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('shows the staleness warning for an old limitations list, and only then', () => {
    const fresh = renderReport(buildReport(course(), { checks: [], now, registry: { asOf: '2026-11-01', sourceUrl: 'https://example.org/plan' } }));
    const old = renderReport(buildReport(course(), { checks: [], now, registry: { asOf: '2026-01-01', sourceUrl: 'https://example.org/plan' } }));
    expect(fresh).not.toContain('may be out of date');
    expect(old).toContain('may be out of date');
    expect(fresh).toContain('href="https://example.org/plan"');
  });

  test('does not link a non-http source URL', () => {
    const out = renderReport(buildReport(course(), { checks: [], now, registry: { asOf: '2026-11-01', sourceUrl: 'javascript:alert(1)' } }));
    expect(out).not.toContain('href="javascript');
  });
});
