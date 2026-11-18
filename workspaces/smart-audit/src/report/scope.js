/**
 * What the v1 tool deliberately does not check, with the reason. Shown in
 * every report (docs/SCOPE-V1.md: "The out-of-v1 list appears in every report
 * so a reader knows what the tool did not look at"). Keep in step with the
 * contract's "Explicitly out of v1" section.
 */
export const NOT_CHECKED_SCOPE = Object.freeze([
  {
    id: 'rendered-behaviour',
    title: 'Keyboard operation, focus order, focus visibility, ARIA name/role/value, reflow, text spacing',
    sc: ['2.1.1', '2.4.3', '2.4.7', '4.1.2', '1.4.10', '1.4.12'],
    reason: 'These need the running course and interaction testing. Rise generates this behaviour and markup, so a content author cannot change it.',
  },
  {
    id: 'inline-colours',
    title: 'Text and background colours set inside rich text',
    sc: ['1.4.3', '1.4.1'],
    reason: 'Needs rendered markup and the colours the player applies behind the text. Only the theme accent colour is checked in v1.',
  },
  {
    id: 'alt-quality',
    title: 'Whether alt text, captions and headings are good',
    sc: ['1.1.1', '1.2.2', '2.4.6'],
    reason: 'Presence and plausibility are checked. Whether the wording is accurate and useful is human judgment.',
  },
  {
    id: 'reading-order',
    title: 'Reading order and meaningful sequence',
    sc: ['1.3.2'],
    reason: 'Human judgment.',
  },
  {
    id: 'attachments',
    title: 'Attached PDF and Office documents',
    sc: ['1.1.1', '1.3.1'],
    reason: 'A separate file format with its own requirements. Counted in this report, not opened.',
  },
  {
    id: 'storyline',
    title: 'Embedded Storyline content',
    sc: [],
    reason: 'A different format entirely. Counted in this report, not examined.',
  },
  {
    id: 'embedded-media',
    title: 'Content inside external embeds (video, web pages, widgets)',
    sc: ['1.2.2', '2.1.1'],
    reason: 'The export holds only a link to the embedded content, so captions and behaviour cannot be known.',
  },
  {
    id: 'other-locales',
    title: 'Multi-language courses',
    sc: ['3.1.1', '3.1.2'],
    reason: 'Only the default-language course data is read.',
  },
  {
    id: 'wcag-22',
    title: 'Criteria new in WCAG 2.2',
    sc: [],
    reason: 'The target standard is WCAG 2.1 AA. The A and AA additions in 2.2 concern runtime behaviour and form entry, which the player owns.',
  },
]);
