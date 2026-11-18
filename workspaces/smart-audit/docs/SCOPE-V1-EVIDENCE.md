# SCOPE-V1 — Pre-Build Evidence

Checked 2026-11-17 against the parsed data of three real exports: the two local samples (`big-course` and `course.zip`, both gitignored third-party-derived material) and the public `GriffithUniLibrary/publishing-maze` runtime-data export (fetched for inspection only, not committed).

`SCOPE-V1.md` is the contract and is unchanged. This file records what the real data says about whether each check family is decidable *from the export*, because the contract's own rule is "each check must be unambiguously decidable from the parsed export."

Items marked **DECISION** change the contract if adopted. They are proposals, not applied.

## Family 1 — Image alt text (SC 1.1.1): decidable, with exclusions

Alt state across image records in the corpus: absent, `""`, `'""'` (a literal pair of quote characters), and non-empty all occur.

Genuine "no alt property" cases exist in ordinary alt-bearing slots, even in a polished published course: `image/image/hero`, `image/image/text aside`, and labeled-graphic base images (Griffith: 3, big-course: 6). So FAIL is a real, useful finding.

The FAIL rule must be restricted to alt-bearing locations. These also show "absent" but cannot be FAIL:

- flashcard front/back images (no alt field in the data model; already in CLAUDE.md)
- `quote/quote/*` background images (7 in Griffith; decorative backgrounds)
- scenario backgrounds and character poses, and `accordion … media.tmp.image`

Treat those as REVIEW/NOT CHECKED with the reason, not as FAIL.

**Unverified:** what Rise writes when an author *deliberately* marks an image decorative or blanks the alt field. The corpus shows both `""` and `'""'`, so the absent-vs-empty split the contract relies on needs one controlled export: one image with alt left untouched, one blanked, one toggled decorative (if Rise offers that). About ten minutes in Rise, and it settles FAIL vs REVIEW for the whole family.

## Family 2 — Heading structure (SC 1.3.1 / 2.4.6): partly decidable

Heading levels are not in the data. Heading blocks store their text as `<p><strong>…</strong></p>`, and the level comes from the block variant (`heading`, `subheading`, plus the `… paragraph` variants), which the player turns into markup. Across every rich-text string in all three exports there are only 3 literal `<h1>`–`<h6>` tags: 2 in subheading blocks (the same two in both local samples, which share a course) and 1 inside a button-stack description in Griffith.

Consequences:

- **Decidable from the export:** empty heading, heading under 4 characters, lesson with no heading-variant block.
- **Skipped level: decidable once the block-to-level mapping is known.** The level is not stored, but it is a fixed function of the block variant, so the outline can be computed statically from the data.
- **The contract's open h1-vs-h2 question is answered (2026-11-17).** Rendered from Griffith's publicly hosted export (GitHub Pages) and matched block-by-block against its decoded data, across three lessons: the **lesson title renders as `<h1>`; `text/text/heading` and `text/text/heading paragraph` render as `<h2>`; `text/text/subheading` and `text/text/subheading paragraph` render as `<h3>`.** Block headings start at h2, not h1.
- **Mapping not yet verified:** other blocks also emit headings (the same lesson showed extra `<h2>`s, apparently from accordion/tab/process item titles), and `impact/text/*`, `quote/*` and labeled-graphic text are unchecked. The mapping was read from one export's player version; confirm it on a second export before relying on it for FAIL.

**Proposed (pending Zach):** compute the outline from the mapping above (title h1, heading h2, subheading h3, plus literal `<h*>` tags in rich text) and FAIL on a skip, e.g. a `subheading` that appears before any `heading` in its lesson (h1 → h3). Blocks whose heading level is unverified are excluded from the outline and named in NOT CHECKED. Running the exported player to read its DOM is not needed; it is the "second architecture" the contract defers to v1.1.

## Family 3 — Link purpose (SC 2.4.4): decidable

96 `<a>` links in Griffith's rich text and 32 in the other course, with extractable link text and href. Buttons carry `title` and `destination`. The current dump captures only `href` from rich text, so link *text* extraction is new work (needs an HTML parser, not a regex).

## Family 4 — Media (SC 1.2.1 / 1.2.2): video and embed decidable, audio not yet

- Self-hosted video: `multimedia/multimedia/video` exists in `course.zip` with `media.video.captions[]` (a list of VTT tracks). Empty or missing list is a clean FAIL.
- External embeds: `multimedia/multimedia/embed` with `media.embed.src` (Griffith's are Vimeo via an embed proxy URL). Clean REVIEW, with the "caption presence not knowable" wording the contract asks for.
- **Audio: no audio block exists in any corpus export.** The identity is unknown and so is what a "transcript reference" looks like in the data. Griffith supplies video transcripts as separate `multimedia/multimedia/attachment` (.docx) blocks, with nothing in the data linking an attachment to a media block. Attachments are out of v1, so a transcript delivered that way is invisible to the tool.

**DECISION:** keep the audio FAIL out of v1 until one export containing an audio block is available, or demote it to REVIEW ("audio present; transcript not verifiable from the export"). Do not guess the identity.

## Family 5 — Theme contrast (SC 1.4.3 / 1.4.11): not decidable as written

This is the largest finding. The export's `course.theme` holds exactly **one** colour, `colorAccent`, which equals `course.color`. Everything else in the theme is an enum or flag (`themeId: classic`, `buttonScheme: LIGHT`, `navigationStyle`, `lessonHeaderStyle`, …). There are no text/background pairs anywhere outside the lessons, in any of the three exports. All three use the `classic` theme.

The contract's "theme-level colour pairs read from the export's theme configuration" therefore does not exist as data. The player also appears to choose foreground colours at runtime (its bundle computes a contrasting colour from a background), so the pairs are not stored anywhere in the export.

What *is* computable: the accent colour against white and against near-black, with the ratio reported. Whether the accent is actually used as text on white, as a button fill with white text, or as something else is player behaviour, not export data.

**DECISION (pick one):**

1. **Narrow family 5:** report the accent colour's ratio against white and black as REVIEW only, with the limitation stated in the finding. Honest and cheap, but weaker than the contract describes.
2. **Defer family 5 to v1.1** and ship four families. This changes Definition of Done item 2.
3. **Derive usage from the player CSS inside the ZIP.** This is reverse-engineering a second system and sits close to the "second architecture" the contract rules out.

**Decided 2026-11-17 (Zach): option 1.** Report the accent colour's ratio against white and black as REVIEW only, with the limitation stated in the finding. The Rise-specific question of where the accent is actually used (text, button fill, header) is not answerable from the export and belongs to v1.1 with inline-colour contrast.

## Definition of done, item 5

The worked example must come from a course Zach built himself. `big-course` is a course in progress that includes part of another course and is not publishable; the Griffith export belongs to a third party. A suitable course needs to exist before item 5 can be met, and it needs to include at least one image, heading, link and video, ideally with deliberate defects.

## Parser state

Payload discovery (locale-JSONP and runtime-data-JSONP) and UTF-8-correct decoding are built and tested. Block identities seen in the corpus but not in the old seed list: `multimedia/multimedia/{attachment,embed,video}`, `quote/quote/c`, `impact/text/{b,c,note}`, `list/list/{numbered,checkboxes}`, and `360/interactive/storyline` (Storyline is out of v1). Any block whose identity a v1 check does not understand belongs in the report's NOT CHECKED section, which is what the contract's severity model already requires.

## Status of DECISION items (2026-11-17)

Reflected in the revised `SCOPE-V1.md`:

- **Family 5 (contrast):** decided. Accent colour only, REVIEW.
- **Family 2 (headings):** outline computed from the verified mapping is adopted. Skipped level is set to **REVIEW** (best practice, not a WCAG failure). This severity was chosen on Zach's behalf while rewriting the contract and is open to reversal.
- **Family 4 (audio):** REVIEW for now, with an upgrade path to FAIL if a real export shows Rise stores a transcript field. A standing audio-description REVIEW was added for video and embeds.
- **Cut line:** all tier-A criteria from `WCAG-COVERAGE.md`, which adds page titles (2.4.2) and multiple ways (2.4.5) as a sixth family.

Still open:

- **Family 1:** the blank-versus-decorative alt experiment. FAIL and REVIEW split stays provisional.
- **Family 3:** bare URL as link text stays FAIL in the contract but is unverified against SC 2.4.4.
- **Definition of done, item 5:** the worked example source. No Rise access; a permitted third-party export is not yet approved as a substitute.
- **Limitations list fields:** whether the export records "lesson header disabled", the Horizon theme id, and Microlearning navigation.
