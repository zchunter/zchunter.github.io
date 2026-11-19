/**
 * Tests for the rich-text checks: links, headings, media, titles and
 * navigation, plus the rich-text helpers they share.
 *
 * Fixtures are hand-built. Under Jest (jsdom) DOMParser is available, as in a
 * browser.
 */

import { htmlToText, linksIn, headingsIn, ownStrings, accessibleLinkName, parseHtml } from '../src/report/rich-text.js';
import { linkPurpose, normalizeLinkName, isBareUrl, isGenericName } from '../src/report/checks/link-purpose.js';
import { headingStructure } from '../src/report/checks/heading-structure.js';
import { mediaAlternatives } from '../src/report/checks/media-alternatives.js';
import { titlesNavigation } from '../src/report/checks/titles-navigation.js';
import { runChecks } from '../src/report/run-checks.js';
import { buildReport } from '../src/report/report.js';
import { renderReport } from '../src/report/render-report.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const block = (identity, items = [], props = {}) => {
  const [family, type, variant] = identity.split('/');
  return { id: `b-${identity}`, family, type, variant, items, ...props };
};
const lesson = (title, items = [], type = 'blocks') => ({ id: `l-${title}`, title, type, items });
const courseOf = (lessons, courseProps = {}) => ({ course: { title: 'T', lessons, ...courseProps } });
const run = (data, check) => runChecks(data, [check]);
const sev = (results, s) => results.filter((r) => r.severity === s);
const para = (html) => block('text/text/paragraph', [{ id: 'i', paragraph: html }]);
const heading = (html) => block('text/text/heading', [{ id: 'h', heading: html }]);
const subheading = (html) => block('text/text/subheading', [{ id: 's', heading: html }]);

// ─── rich-text helpers ───────────────────────────────────────────────────────

describe('rich-text helpers', () => {
  test('htmlToText strips tags, decodes entities and collapses whitespace', () => {
    expect(htmlToText('<p>Fish &amp; <strong>chips</strong>&nbsp;now</p>\n<p> ok </p>')).toBe('Fish & chips now ok');
    expect(htmlToText(null)).toBe('');
    expect(htmlToText(undefined)).toBe('');
    expect(htmlToText('')).toBe('');
  });

  test('linksIn returns href and accessible name, ignoring anchors without href', () => {
    const links = linksIn('<p><a href=" https://a.example ">Read the guide</a> <a name="x">skip</a></p>');
    expect(links).toEqual([{ href: 'https://a.example', name: 'Read the guide' }]);
  });

  test('accessible name: aria-label wins, image alt counts, title is the last resort', () => {
    const name = (html) => accessibleLinkName(parseHtml(html).querySelector('a'));
    expect(name('<a href="/x" aria-label="Open the map">here</a>')).toBe('Open the map');
    expect(name('<a href="/x"><img src="a.png" alt="Company logo"></a>')).toBe('Company logo');
    expect(name('<a href="/x"><img src="a.png"></a>')).toBe('');
    expect(name('<a href="/x" title="Fallback name"></a>')).toBe('Fallback name');
    expect(name('<a href="/x">  </a>')).toBe('');
    expect(name('<a href="/x"><span aria-hidden="true">icon</span> Save</a>')).toBe('Save');
  });

  test('linksIn is cheap for strings that cannot contain links', () => {
    expect(linksIn('plain text')).toEqual([]);
    expect(linksIn(42)).toEqual([]);
  });

  test('headingsIn finds literal h1-h6 in order', () => {
    expect(headingsIn('<h2>One</h2><p>x</p><h4> Two </h4>')).toEqual([
      { level: 2, text: 'One' },
      { level: 4, text: 'Two' },
    ]);
    expect(headingsIn('<p>none</p>')).toEqual([]);
  });

  test('ownStrings walks arrays and objects but not .items', () => {
    const found = [...ownStrings({ a: 'x', answers: [{ title: 'y' }], items: [{ paragraph: 'child' }] })];
    expect(found).toEqual([{ value: 'x', path: 'a' }, { value: 'y', path: 'answers[0].title' }]);
  });
});

// ─── link purpose ────────────────────────────────────────────────────────────

describe('link name classification', () => {
  test.each(['http://x.org', 'https://x.org/a/b', 'HTTPS://X.ORG', 'www.example.com', 'see example.com://thing'])('%s is a bare URL', (n) => expect(isBareUrl(n)).toBe(true));
  test.each(['The enrolment guide', 'Visit example.com', 'wwwhat'])('%s is not a bare URL', (n) => expect(isBareUrl(n)).toBe(false));

  test.each(['click here', 'Click Here', 'here', 'HERE.', 'Read more »', 'learn more', 'More', 'this link', 'Link', 'this page', 'Download', 'See more...', '  here  '])('%p is generic', (n) => expect(isGenericName(n)).toBe(true));
  test.each(['Read the enrolment guide', 'Download the 2026 report', 'more information about fees', 'Click here to enrol'])('%p is not generic', (n) => expect(isGenericName(n)).toBe(false));

  test('normalizeLinkName lowercases, trims edge punctuation and collapses space', () => {
    expect(normalizeLinkName('  Read   More → ')).toBe('read more');
  });
});

describe('link-purpose check', () => {
  const inLesson = (...blocks) => courseOf([lesson('L', blocks)]);

  test('a link with no text is a FAIL against 2.4.4 and 4.1.2, with a precise location and its destination', () => {
    const data = inLesson(block('text/text/paragraph', [{ id: 'i', paragraph: '<p><a href="https://a.example/page"></a></p>' }]));
    const [f] = run(data, linkPurpose);
    expect(f).toMatchObject({ severity: 'FAIL', sc: ['2.4.4', '4.1.2'], basis: 'wcag' });
    expect(f.location.itemPath).toBe('items[0].paragraph');
    expect(f.message).toContain('https://a.example/page');
    expect(f.remediation).toBeTruthy();
  });

  test('an image-only link is fine with alt text and a FAIL without', () => {
    const ok = inLesson(para('<a href="/x"><img src="a" alt="Annual report"></a>'));
    const bad = inLesson(para('<a href="/x"><img src="a"></a>'));
    expect(run(ok, linkPurpose)).toEqual([]);
    expect(sev(run(bad, linkPurpose), 'FAIL')).toHaveLength(1);
  });

  test('an aria-label gives a link its name', () => {
    expect(run(inLesson(para('<a href="/x" aria-label="Open the map"></a>')), linkPurpose)).toEqual([]);
  });

  test('a bare URL as link text is REVIEW, never FAIL', () => {
    const r = run(inLesson(para('<a href="https://x.org/a">https://x.org/a</a>')), linkPurpose);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severity: 'REVIEW', sc: ['2.4.4'] });
    expect(r[0].message).toMatch(/web address/);
  });

  test('generic link text is REVIEW and mentions context', () => {
    const r = run(inLesson(para('<a href="/x">Click here</a> and <a href="/y">read more »</a>')), linkPurpose);
    expect(r).toHaveLength(2);
    expect(r.every((f) => f.severity === 'REVIEW')).toBe(true);
    expect(r[0].message).toMatch(/surrounding sentence/);
  });

  test('descriptive links produce nothing', () => {
    expect(run(inLesson(para('<a href="/x">Read the enrolment guide</a>')), linkPurpose)).toEqual([]);
  });

  test('buttons: label is the name, destination is the target', () => {
    const data = inLesson(
      block('buttons/interactive/button', [
        { id: 'a', label: 'Go to the course', destination: 'https://x.org/c' },
        { id: 'b', label: '', destination: 'https://x.org/d' },
        { id: 'c', label: 'Click here', destination: 'https://x.org/e' },
        { id: 'd', label: 'Orphan label with no destination' },
      ]),
    );
    const r = run(data, linkPurpose);
    expect(r.map((f) => [f.severity, f.location.itemPath])).toEqual([
      ['FAIL', 'items[1].label'],
      ['REVIEW', 'items[2].label'],
    ]);
  });

  test('the same link text pointing to different places in one lesson is one REVIEW', () => {
    const data = inLesson(para('<a href="/a">Form</a>'), para('<a href="/b">Form</a>'), para('<a href="/b">form</a>'));
    const r = run(data, linkPurpose);
    expect(r).toHaveLength(1);
    expect(r[0].message).toMatch(/"Form" is used for 2 different destinations/);
  });

  test('the same text and destination, or the same text in different lessons, is fine', () => {
    expect(run(courseOf([lesson('A', [para('<a href="/a">The guide</a>'), para('<a href="/a">The guide</a>')])]), linkPurpose)).toEqual([]);
    expect(run(courseOf([lesson('A', [para('<a href="/a">The guide</a>')]), lesson('B', [para('<a href="/b">The guide</a>')])]), linkPurpose)).toEqual([]);
  });

  test('links in the course description are checked at course scope', () => {
    const data = courseOf([], { description: '<p>See <a href="https://x.org">https://x.org</a></p>' });
    const [f] = run(data, linkPurpose);
    expect(f.location).toMatchObject({ scope: 'course' });
  });

  test('links in nested items and in answers are found with their paths', () => {
    const data = inLesson(block('interactive/interactive/accordion', [{ id: 'p', items: [{ id: 'q', description: '<a href="/x">here</a>' }] }]), block('knowledgeCheck/knowledgeCheck/multiple choice', [{ id: 'k', answers: [{ title: '<a href="/y">click here</a>' }] }]));
    expect(run(data, linkPurpose).map((f) => f.location.itemPath)).toEqual(['items[0].items[0].description', 'items[0].answers[0].title']);
  });

  test('claims every block, because it scans every string in every block', () => {
    expect(linkPurpose.inspects).toEqual(['*']);
  });

  test('a malformed course never throws', () => {
    expect(run({}, linkPurpose)).toEqual([]);
    expect(run({ course: { lessons: [{ items: [null, { items: [null] }] }] } }, linkPurpose)).toEqual([]);
  });

  test('without an HTML parser the check fails loudly as NOT CHECKED, never silently passes', () => {
    const saved = global.DOMParser;
    global.DOMParser = undefined;
    try {
      const r = run(inLesson(para('<a href="/x"></a>')), linkPurpose);
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({ severity: 'NOT CHECKED' });
      expect(r[0].message).toMatch(/could not complete/);
    } finally {
      global.DOMParser = saved;
    }
  });
});

// ─── heading structure ───────────────────────────────────────────────────────

describe('heading-structure check', () => {
  const one = (...blocks) => courseOf([lesson('Lesson one', blocks)]);

  test('a well-formed outline (h1, h2, h3, h2) produces nothing', () => {
    expect(run(one(heading('<p>Intro</p>'), subheading('<p>Detail</p>'), heading('<p>Next</p>')), headingStructure)).toEqual([]);
  });

  test('heading and subheading paragraph variants map to h2 and h3', () => {
    const data = one(block('text/text/heading paragraph', [{ heading: '<p>Intro</p>', paragraph: '<p>x</p>' }]), block('text/text/subheading paragraph', [{ heading: '<p>Part</p>', paragraph: '<p>y</p>' }]));
    expect(run(data, headingStructure)).toEqual([]);
  });

  test('a subheading before any heading skips from h1 to h3: REVIEW, best practice, never FAIL', () => {
    const [f] = run(one(subheading('<p>Detail</p>')), headingStructure);
    expect(f).toMatchObject({ severity: 'REVIEW', basis: 'best-practice' });
    expect(f.message).toMatch(/level 3 heading follows a level 1 heading with no level 2/);
    expect(f.message).toMatch(/lesson title is level 1/);
    expect(f.location.itemPath).toBe('items[0].heading');
  });

  test('going back up the outline is not a skip', () => {
    expect(run(one(heading('<p>Alpha part</p>'), subheading('<p>Sub topic</p>'), heading('<p>Beta part</p>'), subheading('<p>Sub topic two</p>')), headingStructure)).toEqual([]);
  });

  test('a literal <h4> typed into a paragraph after an h2 is a skip, located by path', () => {
    const [f] = run(one(heading('<p>Intro</p>'), para('<h4>Odd heading</h4><p>text</p>')), headingStructure);
    expect(f.message).toMatch(/level 4 heading follows a level 2/);
    expect(f.location.itemPath).toBe('items[0].paragraph');
  });

  test('an empty heading is REVIEW, best practice, never FAIL', () => {
    const r = run(one(heading('<p>&nbsp;</p>')), headingStructure);
    const empty = r.find((f) => /empty/.test(f.message));
    expect(empty).toMatchObject({ severity: 'REVIEW', basis: 'best-practice', sc: ['1.3.1', '2.4.6'] });
    expect(sev(r, 'FAIL')).toHaveLength(0);
  });

  test('a heading under 4 characters is a (WCAG) REVIEW; 4 characters is fine', () => {
    const short = run(one(heading('<p>Q1</p>')), headingStructure);
    expect(short).toHaveLength(1);
    expect(short[0]).toMatchObject({ severity: 'REVIEW', basis: 'wcag' });
    expect(run(one(heading('<p>Q1 ok</p>')), headingStructure)).toEqual([]);
    expect(run(one(heading('<p>FAQs</p>')), headingStructure)).toEqual([]);
  });

  test('HTML entities in heading text are decoded before measuring', () => {
    expect(run(one(heading('<p>A&amp;B&nbsp;C</p>')), headingStructure)).toEqual([]);
  });

  test('a lesson with content but no heading blocks is REVIEW at lesson scope', () => {
    const r = run(one(para('<p>Just text</p>')), headingStructure);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severity: 'REVIEW', basis: 'best-practice', location: { scope: 'lesson' } });
  });

  test('a lesson of only spacing blocks is not flagged', () => {
    expect(run(one(block('continue/divider/continue')), headingStructure)).toEqual([]);
  });

  test('sections and quiz lessons are skipped', () => {
    const data = courseOf([lesson('Part', [], 'section'), lesson('Quiz', [{ id: 'q', type: 'MULTIPLE_CHOICE', title: 'Q?' }], 'quiz')]);
    expect(run(data, headingStructure)).toEqual([]);
  });

  test('blocks whose heading levels are unverified are named once, at course scope', () => {
    const data = courseOf([lesson('A', [heading('<p>Intro</p>'), block('interactive/interactive/accordion', [{ title: 'Panel' }]), block('quote/quote/c', [{ paragraph: 'x' }])]), lesson('B', [heading('<p>More</p>'), block('impact/text/note', [{ paragraph: 'y' }])])]);
    const nc = sev(run(data, headingStructure), 'NOT CHECKED');
    expect(nc).toHaveLength(1);
    expect(nc[0].location).toMatchObject({ scope: 'course' });
    expect(nc[0].message).toMatch(/^3 blocks/);
  });

  test('outline is computed per lesson, so one lesson cannot affect another', () => {
    const data = courseOf([lesson('A', [heading('<p>Intro</p>')]), lesson('B', [subheading('<p>Detail</p>')])]);
    const r = run(data, headingStructure);
    expect(r).toHaveLength(1);
    expect(r[0].location.lessonIndex).toBe(1);
  });

  test('a malformed course never throws', () => {
    expect(run({}, headingStructure)).toEqual([]);
    expect(run(courseOf([null, lesson('x', [null, { items: 'nope' }])]), headingStructure)).toBeDefined();
  });
});

// ─── media alternatives ──────────────────────────────────────────────────────

describe('media-alternatives check', () => {
  const video = (media) => block('multimedia/multimedia/video', [{ id: 'v', media: { video: media } }]);
  const embed = (e) => block('multimedia/multimedia/embed', [{ id: 'e', media: { embed: e } }]);
  const inLesson = (...blocks) => courseOf([lesson('L', blocks)]);

  test.each([[undefined], [[]], [null]])('a self-hosted video with captions=%p is a FAIL stating its limits', (captions) => {
    const r = run(inLesson(video({ key: 'a.mp4', captions })), mediaAlternatives);
    const f = sev(r, 'FAIL');
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ sc: ['1.2.2'], basis: 'wcag' });
    expect(f[0].location.itemPath).toBe('items[0].media.video');
    expect(f[0].message).toMatch(/burned into the picture/);
  });

  test('a video with captions is not a FAIL', () => {
    const r = run(inLesson(video({ key: 'a.mp4', captions: [{ code: 'en', key: 'a.vtt' }] })), mediaAlternatives);
    expect(sev(r, 'FAIL')).toHaveLength(0);
  });

  test('an embedded video is REVIEW and names the provider', () => {
    const r = run(inLesson(embed({ embedType: 'video', provider: 'Vimeo' })), mediaAlternatives);
    const f = r.find((x) => x.sc[0] === '1.2.2');
    expect(f).toMatchObject({ severity: 'REVIEW' });
    expect(f.message).toMatch(/Vimeo video is hosted on another site/);
    expect(sev(r, 'FAIL')).toHaveLength(0);
  });

  test('embeds that are not video (web pages, widgets) are left to the inventory', () => {
    expect(run(inLesson(embed({ embedType: 'iframe' }), embed({ embedType: 'link', provider: 'Wiley' })), mediaAlternatives)).toEqual([]);
  });

  test('audio description is one standing REVIEW per lesson, counting every video and video embed', () => {
    const data = courseOf([
      lesson('A', [video({ key: 'a', captions: [{}] }), video({ key: 'b', captions: [{}] }), embed({ embedType: 'video' })]),
      lesson('B', [video({ key: 'c', captions: [{}] })]),
      lesson('C', [block('text/text/paragraph', [{ paragraph: 'x' }])]),
    ]);
    const ad = run(data, mediaAlternatives).filter((f) => f.sc.includes('1.2.3'));
    expect(ad.map((f) => [f.location.lessonIndex, f.message.split(' ').slice(0, 2).join(' ')])).toEqual([[0, '3 videos'], [1, '1 video']]);
    expect(ad[0].sc).toEqual(['1.2.3', '1.2.5']);
    expect(ad[0].location.scope).toBe('lesson');
  });

  test('audio blocks are not guessed at; they surface as blocks no check read', () => {
    const data = inLesson(block('multimedia/multimedia/audio', [{ id: 'a', media: { audio: { key: 'a.mp3' } } }]));
    expect(run(data, mediaAlternatives)).toEqual([]);
    const report = buildReport(data, { checks: [mediaAlternatives] });
    expect(report.notChecked.uninspected.map((u) => u.identity)).toContain('multimedia/multimedia/audio');
  });

  test('a video block with an empty media slot is ignored', () => {
    expect(run(inLesson(block('multimedia/multimedia/video', [{ id: 'v', media: {} }, { id: 'w' }])), mediaAlternatives)).toEqual([]);
  });
});

// ─── titles and navigation ───────────────────────────────────────────────────

describe('titles-navigation check', () => {
  test('an empty lesson title is REVIEW', () => {
    const r = run(courseOf([lesson('  ', [])]), titlesNavigation);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severity: 'REVIEW', sc: ['2.4.2'], basis: 'wcag' });
  });

  test('duplicate lesson titles are one best-practice REVIEW listing positions, ignoring case and spacing', () => {
    const data = courseOf([lesson('Summary'), lesson('Intro'), lesson('summary'), lesson(' SUMMARY  ')]);
    const r = run(data, titlesNavigation);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ severity: 'REVIEW', basis: 'best-practice', location: { lessonIndex: 0 } });
    expect(r[0].message).toMatch(/used 3 times \(outline items 1, 3, 4\)/);
  });

  test('section dividers sharing a title are not pages and are ignored', () => {
    expect(run(courseOf([lesson('Part', [], 'section'), lesson('Part', [], 'section')]), titlesNavigation)).toEqual([]);
  });

  test('menu and search both off is a REVIEW for 2.4.5', () => {
    const data = courseOf([lesson('A')], { theme: { navigation: false }, allowSearch: false });
    const [f] = run(data, titlesNavigation);
    expect(f).toMatchObject({ severity: 'REVIEW', sc: ['2.4.5'], location: { scope: 'course' } });
  });

  test('search switched off in the theme counts too', () => {
    expect(run(courseOf([lesson('A')], { theme: { navigation: false, allowSearch: false } }), titlesNavigation)).toHaveLength(1);
  });

  test('only one way switched off, or both on, or settings absent, is fine', () => {
    expect(run(courseOf([lesson('A')], { theme: { navigation: false }, allowSearch: true }), titlesNavigation)).toEqual([]);
    expect(run(courseOf([lesson('A')], { theme: { navigation: true }, allowSearch: false }), titlesNavigation)).toEqual([]);
    expect(run(courseOf([lesson('A')], { theme: { navigation: true }, allowSearch: true }), titlesNavigation)).toEqual([]);
    expect(run(courseOf([lesson('A')]), titlesNavigation)).toEqual([]);
  });
});

// ─── all checks together ─────────────────────────────────────────────────────

describe('full report with every v1 check', () => {
  const data = courseOf(
    [
      lesson('Summary', [subheading('<p>Detail</p>'), para('<p>See <a href="https://x.org">https://x.org</a> or <a href="/y"></a></p>'), block('multimedia/multimedia/video', [{ media: { video: { key: 'a.mp4' } } }])]),
      lesson('Summary', [para('<p>No headings here</p>')]),
    ],
    { theme: { colorAccent: '#999999' } },
  );
  const report = buildReport(data, { now: new Date('2026-11-19T00:00:00Z') });

  test('findings from several checks are sorted FAIL first, then in course order', () => {
    const order = report.findings.map((f) => `${f.severity}:${f.checkId}`);
    expect(order[0].startsWith('FAIL')).toBe(true);
    const firstReview = order.findIndex((o) => o.startsWith('REVIEW'));
    expect(order.slice(0, firstReview).every((o) => o.startsWith('FAIL'))).toBe(true);
    expect(new Set(report.findings.map((f) => f.checkId))).toEqual(new Set(['heading-structure', 'link-purpose', 'media-alternatives', 'theme-contrast', 'titles-navigation']));
  });

  test('FAILs are exactly the certain ones: an empty link and an uncaptioned video', () => {
    expect(report.findings.filter((f) => f.severity === 'FAIL').map((f) => f.checkId).sort()).toEqual(['link-purpose', 'media-alternatives']);
  });

  test('best-practice findings are labelled in the rendered report', () => {
    expect(renderReport(report)).toContain('(best practice)');
  });

  test('every check is listed as having run', () => {
    expect(report.meta.checks.map((c) => c.id)).toHaveLength(6);
  });
});
