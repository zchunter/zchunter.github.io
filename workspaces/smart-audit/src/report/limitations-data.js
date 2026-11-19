/**
 * The Rise-documented limitations list (docs/SCOPE-V1.md, "Rise-documented
 * limitations list").
 *
 * Source: Articulate's "Rise 360 Accessibility Maturity Plan". Summaries are
 * written in our own words; the gap numbers are the page's own order and are
 * kept so a maintainer can compare entry by entry. Everything here is
 * "documented by Articulate as of <date>", never SmartAudit's finding and
 * never independently verified.
 *
 * MAINTENANCE: update this file by running `npm run smart-audit:limitations`
 * (tooling/check-limitations.mjs), reading its diff against the live page, and
 * then editing `asOf` (the date printed on Articulate's page) and `checkedOn`
 * (the day a person last compared the two). The report warns when `checkedOn`
 * is older than 90 days.
 *
 * Triggers say when an entry applies to a given course:
 *   standing  every Rise course; shown in a short note, not as a match
 *   identity  the course contains a block matching one of `patterns`
 *   setting   a course setting at `path` equals `equals`
 *   content   a named test in limitations.js passes
 *   dormant   the affected block or setting has not been seen in any export we
 *             have, so we cannot detect it. Identities are never guessed.
 */

export const RISE_LIMITATIONS = Object.freeze({
  sourceTitle: 'Rise 360 Accessibility Maturity Plan',
  sourceUrl: 'https://www.articulate.com/about/accessibility/rise-360-accessibility-maturity-plan/',
  asOf: '2026-09-24',
  checkedOn: '2026-11-19',
  entries: [
    { gap: 1, title: 'No audio description for video', sc: ['1.2.3'], level: 'A', trigger: { kind: 'content', test: 'video' },
      summary: 'Authors cannot add an audio description track to a Rise video block.',
      workaround: 'Produce the described version in another tool and import it.' },
    { gap: 2, title: 'PDF export is not tagged', sc: ['1.3.1'], level: 'A', trigger: { kind: 'standing' },
      summary: 'If you export the course as a PDF, the PDF lacks the structure tags assistive technology needs.',
      workaround: 'Repair the exported PDF in Adobe Acrobat.' },
    { gap: 3, title: 'Images without alt text on zoom', sc: ['1.1.1'], level: 'A', trigger: { kind: 'content', test: 'missing-alt' },
      summary: 'When an image has no alt text and zoom is on, a screen reader may announce a file name or generic label.',
      workaround: 'Turn zoom off for decorative images.' },
    { gap: 4, title: 'Menu comes after the lesson in tab order', sc: ['2.4.3'], level: 'A', trigger: { kind: 'standing' },
      summary: 'Keyboard users tab through the whole lesson before they reach the navigation menu.',
      workaround: 'Use Shift+Tab to reach the menu.' },
    { gap: 5, title: 'No H1 when the lesson header is off', sc: ['1.3.1'], level: 'A', trigger: { kind: 'dormant', reason: 'The export field for a disabled lesson header is not yet verified.' },
      summary: 'Authors cannot assign a level-1 heading when the lesson header is disabled.',
      workaround: null },
    { gap: 6, title: 'Guestbook required fields not marked', sc: ['3.3.2'], level: 'A', trigger: { kind: 'dormant', reason: 'No export examined contains a Guestbook block.' },
      summary: 'Required Guestbook fields are not marked as required before the form is submitted.',
      workaround: null },
    { gap: 7, title: 'Audio transcript panel out of order', sc: ['1.3.1'], level: 'A', trigger: { kind: 'dormant', reason: 'No export examined contains an audio block.' },
      summary: 'The transcript panel sits outside its audio block in focus and reading order.',
      workaround: null },
    { gap: 8, title: 'Responsive audio panel adds a tab stop', sc: ['1.3.1'], level: 'A', trigger: { kind: 'dormant', reason: 'No export examined contains an audio block.' },
      summary: 'In the responsive audio layout the panel header is a focusable button, adding a tab stop and confusing announcements.',
      workaround: null },
    { gap: 9, title: 'Scenario does not fit small screens', sc: ['1.4.10'], level: 'AA', trigger: { kind: 'identity', patterns: ['interactive-fullscreen/interactive/scenario'] },
      summary: 'On mobile, Scenario choices and speech bubbles can be cut off or hard to read.',
      workaround: null },
    { gap: 10, title: 'Microlearning restart button has no name', sc: ['4.1.2'], level: 'A', trigger: { kind: 'dormant', reason: 'The export field for Microlearning continuous navigation is not yet verified.' },
      summary: 'In courses with continuous navigation, the restart button has no accessible name.',
      workaround: 'Use stepped navigation.' },
    { gap: 11, title: 'Search closes to the top of the page', sc: ['2.4.3'], level: 'A', trigger: { kind: 'setting', path: 'allowSearch', equals: true },
      summary: 'With Windows Narrator, closing the search panel moves focus to the top of the page instead of back to the search button.',
      workaround: null },
    { gap: 12, title: 'Inactive Horizon overlay is exposed', sc: ['4.1.2'], level: 'A', trigger: { kind: 'dormant', reason: 'The theme id for Horizon has not been seen in an export.' },
      summary: 'The overlay modal in the Horizon theme can be detected by screen readers even when it is inactive.',
      workaround: 'Use stepped navigation.' },
    { gap: 13, title: 'Navigation landmark stays exposed when navigation is off', sc: ['4.1.2'], level: 'A', trigger: { kind: 'setting', path: 'theme.navigation', equals: false },
      summary: 'When navigation is disabled, the navigation landmark is still exposed to screen readers.',
      workaround: null },
    { gap: 14, title: 'Process block controls lack a focus indicator', sc: ['2.4.7'], level: 'AA', trigger: { kind: 'identity', patterns: ['interactive-fullscreen/interactive/process'] },
      summary: 'Process block controls show no visible focus indicator during keyboard navigation.',
      workaround: null },
    { gap: 15, title: 'Custom layout can trap focus on iOS', sc: ['2.4.3'], level: 'A', trigger: { kind: 'dormant', reason: 'No export examined contains a custom layout block.' },
      summary: 'With iOS VoiceOver, focus can get trapped or jump to the bottom of the page while a custom layout block loads.',
      workaround: null },
    { gap: 16, title: 'Animations ignore reduced-motion settings', sc: ['2.3.3'], level: 'AAA', trigger: { kind: 'standing' },
      summary: 'Rise interactions do not respect the operating system reduced-motion setting. This is a Level AAA criterion, beyond the AA target of this tool.',
      workaround: null },
    { gap: 17, title: 'Horizon overlay navigation focus order', sc: ['2.4.3'], level: 'A', trigger: { kind: 'dormant', reason: 'The theme id for Horizon has not been seen in an export.' },
      summary: 'Focus order in the Horizon theme’s overlay navigation is not logical.',
      workaround: 'Use a different theme.' },
    { gap: 18, title: 'Scenario options may be skipped or misordered', sc: ['2.4.3'], level: 'A', trigger: { kind: 'identity', patterns: ['interactive-fullscreen/interactive/scenario'] },
      summary: 'With Windows Narrator, a focus timing issue can make Scenario options be skipped or read out of order.',
      workaround: null },
    { gap: 19, title: 'Narrator loses focus on custom blocks', sc: ['2.4.3'], level: 'A', trigger: { kind: 'dormant', reason: 'No export examined contains a custom block.' },
      summary: 'Windows Narrator can lose focus on a custom block that is not yet visible on screen.',
      workaround: null },
    { gap: 20, title: 'Tables cannot be captioned', sc: ['1.3.1'], level: 'A', trigger: { kind: 'content', test: 'table' },
      summary: 'A table cannot be given a programmatic caption, so table navigation gives a screen reader user little context.',
      workaround: null },
    { gap: 21, title: 'Language of a passage cannot be set', sc: ['3.1.2'], level: 'AA', trigger: { kind: 'standing' },
      summary: 'Authors cannot mark the language of an individual passage or text block, so foreign-language text is read with the course language.',
      workaround: null },
    { gap: 22, title: 'Labeled graphic markers pulse and cannot be stopped', sc: ['2.2.2'], level: 'A', trigger: { kind: 'identity', patterns: ['interactive-fullscreen/interactive/labeledgraphic'] },
      summary: 'The pulsing animation on Labeled Graphic markers cannot be turned off.',
      workaround: null },
  ].map((e) => ({ id: `rise-gap-${String(e.gap).padStart(2, '0')}`, status: 'Planned', ...e })),
});
