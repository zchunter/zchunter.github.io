# SmartAudit v1 - Scope Contract

Fixed scope for SmartAudit as an accessibility portfolio piece, written 2026-11-11, revised 2026-11-17. The point of this document is the finish line, not the feature list. The tool already drifted once (schema inspector to content viewer to audit logic, then paused in late October). Everything below is chosen so that "done" is a date, not a judgment call.

Target standard: WCAG 2.1 Level AA, because that is what the DOJ ADA Title II rule makes enforceable for state and local government entities, public universities and community colleges included. Section 508 and EU EN 301 549 reuse WCAG, so one mapping covers them. Compliance dates reportedly moved in 2026; verify before the write-up states any (see `ACCESSIBILITY-SOURCES.md`).

## Changes from the 2026-11-11 draft

Evidence behind each change is in `SCOPE-V1-EVIDENCE.md`, `WCAG-COVERAGE.md` and `ACCESSIBILITY-SOURCES.md`.

- The v1 cut line is now every Level A/AA criterion that can be checked cheaply from data the parser already reads (tier A in `WCAG-COVERAGE.md`). That adds page titles, multiple ways, and a standing audio-description note, and keeps the original five families.
- Theme contrast is narrowed. The export holds one theme colour, not colour pairs.
- Heading checks use the verified block-to-level mapping. The open h1-versus-h2 question is closed.
- Heading checks that are best practice rather than WCAG failures are REVIEW and labelled as such: skipped level (no failure defined) and empty heading (the W3C 2.4.6 page does not address it; axe classes it as best practice).
- Bare URL as link text is REVIEW, not FAIL: the W3C 2.4.4 page does not define it as a failure and allows purpose to come from context. Empty link text stays FAIL (axe `link-name` is Level A for 2.4.4 and 4.1.2).
- Alt text FAIL applies only to slots where real exports prove an alt field exists. Other image slots are REVIEW or NOT CHECKED (see family 1). (Superseded 2026-11-19: see the next-but-one bullet; family 1 now has no FAIL.)
- Audio transcript is REVIEW until an export shows what Rise stores. WCAG requires only that an alternative exists, not a particular field.
- The report has four sections, split by who controls the issue, instead of one list of findings.
- v1 includes a small dated list of Rise's own documented accessibility limitations, with a required way to keep it current.
- Missing alt text is REVIEW everywhere, never FAIL (changed 2026-11-19). Rendering a real export showed Rise publishes an image with no alt field as `alt=""`, which assistive technology treats as decorative. That is a defect only if the image is informative, which is human judgment. Image findings also name the file, and the live page can preview it from the ZIP.
- The tool's own interface must meet the criteria it audits (added 2026-11-18). The original page failed its own checks: low-contrast text and a file loader that keyboard users could not operate.

## What this is

A browser-based triage tool. Given an Articulate Rise export, it reports which content blocks are likely to fail WCAG 2.1 AA and where they are, so a human knows which courses to open first.

It is NOT a conformance checker and the report must never claim conformance. Automated testing catches a minority of real accessibility defects, and any compliance professional reading the portfolio knows that. The honest framing is also the stronger one: this tool tells you where to look, and a human decides.

The client-side architecture is a feature, not an implementation detail. Course exports can contain student work, unreleased content and licensed media. A tool that requires uploading them to a third party is one a compliance office cannot approve. "Nothing leaves your machine" belongs in the first paragraph of the portfolio write-up.

## The report: four sections

Every WCAG 2.1 A/AA criterion is accounted for in exactly one default section, so the report can say what it checked, what it reminds you about, what Rise controls, and what does not apply.

1. **Findings** - issues the author can fix. FAIL and REVIEW results from the checks below.
2. **Keep in mind** - things the author controls but a tool cannot check. Short manual-review reminders, shown only when the course contains the relevant content (for example, "11 embedded videos: verify caption accuracy and audio description").
3. **Rise-documented limitations** - gaps Articulate itself documents, which the author cannot fix, shown when the course uses the affected block, theme or setting. Worded as "documented by Articulate as of <date>", never as the author's failure and never as SmartAudit's own claim.
4. **Not applicable and not checked** - criteria that do not apply to exported content, plus real content the tool saw but did not examine: attachments, external embeds, Storyline blocks, and any block identity no check understands, each with a count.

**Appendix: all images** (added 2026-11-19) - every image, with its stored alt text, location, thumbnail and what the alt-text check concluded ("REVIEW", "No problem detected", "Not checked"). It is a listing for a person's accuracy check, not a new check, and never says "pass". The saved HTML export embeds small thumbnails as data inside the file, so it still loads nothing.

## The check families in v1

Each check must be unambiguously decidable from the parsed export. Each finding carries: success criterion, block location, severity, measured value where applicable, and a one-line remediation note.

### 1. Image alternative text - SC 1.1.1 (Level A)

Alt text locations are mapped across the nesting paths in the parsed schema, and each slot is classified by what real exports show:

- **Confirmed alt slots** (an alt value has been seen populated or explicitly empty): text-and-image and hero image blocks, the labeled graphic base image, process step images, accordion panel images.
- **Unconfirmed slots** (only absent alt seen, so the export cannot prove Rise offers a field): other image blocks, galleries, tab images, any slot not yet seen. A missing alt is REVIEW here, never FAIL.
- **Known Rise limitation:** Text on Image blocks, where Articulate documents that alt text is not output. REVIEW, and the finding says so.
- **No alt field in the data model:** flashcard faces, block and item backgrounds, quote avatars, scenario backgrounds, unused editor slots. NOT CHECKED, grouped per lesson, with the reason.

- REVIEW: image in a confirmed alt slot with no alt property at all. (Was FAIL until 2026-11-19. Rise renders it as `alt=""`, so it is announced as decorative; see `SCOPE-V1-EVIDENCE.md`.) If a future export shows Rise rendering a missing alt as a file name or with no alt attribute, that case can return to FAIL.
- REVIEW: no alt property in an unconfirmed slot or a Text on Image block
- REVIEW: empty alt string. An empty alt is correct for a decorative image, so this can never be an automatic fail. The report asks whether the image is decorative.
- REVIEW: alt text that equals or contains the source filename (IMG_4521, Screenshot 2026-03-11, .jpg/.png/.gif anywhere in the string)
- REVIEW: alt text matching a placeholder list - image, picture, photo, graphic, logo, icon, untitled, alt text
- REVIEW: alt text longer than 150 characters, which usually means the content belongs in a caption or long description
- REVIEW: scenario slide or response with no alt text (the export cannot show whether that slide displays a character image)
- Course cover and logo images follow the same text rules; a missing alt there is REVIEW, because the export cannot show whether the image is decorative
- Every image finding names the uploaded file, so the author can find it in Rise. The live page offers a "View image" preview drawn from the loaded ZIP; the saved HTML export names the file only, because it loads nothing

Deliberately out of scope: whether good alt text is actually good. Presence and plausibility only. Alt quality is not mechanically decidable and claiming to judge it would undermine the tool's credibility.

Still unverified: how Rise stores a deliberately decorative image. The corpus shows absent alt, `""` and a literal pair of quote characters, all treated as "no alt text" or "empty" as described above. The confirmed-slot list grows as more real exports are seen.

### 2. Heading structure - SC 1.3.1 (Level A), SC 2.4.6 (Level AA)

The outline is computed from the verified block-to-level mapping: the lesson title is h1, `heading` and `heading paragraph` blocks are h2, `subheading` and `subheading paragraph` blocks are h3, plus any literal h1-h6 tags in rich text. Blocks whose heading level has not been verified (accordion, tab and process titles, impact, quote, labeled graphic) are left out of the outline and named in section 4.

- REVIEW: empty heading element. Labelled best practice: the W3C 2.4.6 page does not address empty headings, and axe classes the rule as best practice, not a WCAG failure.
- REVIEW: skipped heading level (for example a subheading before any heading in its lesson, h1 to h3). Labelled best practice; W3C guidance advises avoiding it but defines no failure.
- REVIEW: lesson with no heading-level block
- REVIEW: heading under 4 characters, which usually means a heading style was used for visual emphasis rather than structure (the W3C failure F43 covers heading markup used only for appearance)

Known Rise limitation, reported in section 3: Rise cannot assign an h1 when the lesson header is disabled, so a missing h1 may not be the author's doing.

### 3. Link purpose - SC 2.4.4 (Level A)

Covers button labels and destinations and links inside rich text (which needs an HTML parser, not a regex).

- FAIL: link with empty or whitespace-only text
- REVIEW: link text that is a bare URL (starts http, www, or contains :// ). SC 2.4.4 does not define this as a failure and allows purpose to come from context.
- REVIEW: link text matching the non-descriptive list - click here, here, read more, learn more, more, this link, link, this page, download, see more. SC 2.4.4 allows purpose to come from surrounding context, which is why this is REVIEW.
- REVIEW: identical link text pointing to two or more different destinations within the same lesson

### 4. Media captions and transcripts - SC 1.2.1, SC 1.2.2, SC 1.2.3, SC 1.2.5

- FAIL: self-hosted video block with no captions track referenced. The finding states the limits: not a failure if the video has no audio or has open (burned-in) captions, which the export cannot show.
- Audio blocks are not detected yet. No export examined contains one, so the block's identity and fields are unverified and are never guessed. An audio block therefore appears in the report's list of block types no check read. Once a real export shows what Rise stores, add: REVIEW when audio is present (WCAG requires only that a text alternative exists, in any form and place), and FAIL for an empty transcript only if the export shows Rise stores a transcript field.
- REVIEW: externally embedded media (YouTube, Vimeo, Wistia and similar). Caption presence is not knowable from the export, and the report must say exactly that rather than guess.
- REVIEW, standing: every video and embed carries "audio description not verifiable from the export" (SC 1.2.3 Level A, SC 1.2.5 Level AA).

That is worth building deliberately. A tool that reports "unverifiable from the export" where it cannot know is more trustworthy than one that quietly passes or quietly fails those blocks, and it is the kind of distinction a compliance reviewer will notice.

### 5. Theme colour contrast - SC 1.4.3 (Level AA), SC 1.4.11 (Level AA)

The export's theme holds one colour, the accent colour. It holds no text and background pairs; the player chooses foreground colours itself.

- REVIEW: the accent colour's contrast ratio against white and against black. Report the measured ratio and suggest the nearest compliant value.
- The finding states the limit: where the accent is actually used (text, button fill, header) is player behaviour and not in the export, so this cannot be FAIL.

One bad theme colour affects every course built on that theme, so a single finding can be institution-wide.

### 6. Page titles and navigation - SC 2.4.2 (Level A), SC 2.4.5 (Level AA)

- REVIEW: empty lesson title, or the same lesson title used more than once in a course. The player builds each page title from the lesson and course titles, so these are the author's part.
- REVIEW: navigation and search both disabled, leaving only linear Continue buttons (SC 2.4.5 asks for more than one way to find pages).

## Explicitly out of v1

This section exists to be enforced. Anything here is a "no" until v1 has shipped, regardless of how small it looks mid-build.

- Author-overridden inline colours. Checking contrast on colours set inside rich-text blocks needs rendered markup and an engine like axe-core running against a live DOM. That is a second architecture inside the same tool and it is the single largest scope risk in the project. Theme contrast only in v1. This cut is what makes the finish line real.
- Running the exported Rise player to read its rendered DOM. Same second architecture.
- Keyboard operability (2.1.1), focus order (2.4.3), focus visible (2.4.7). These need interaction testing, not static analysis.
- ARIA name, role and value (4.1.2). Rise generates its own markup, so a content author cannot act on these findings. The tool is for people who can only change content.
- Reading order and meaningful sequence (1.3.2). Human judgment.
- Caption accuracy, alt text quality, plain-language or reading-level scoring.
- Tier B and C work from `WCAG-COVERAGE.md`: rich-text table headers, fake-list detection, sensory-characteristics phrase matching, language detection, images of text (OCR), animated image inventory.
- WCAG 2.2-only criteria. Not what Title II enforces; all six at A/AA are player behaviour.
- Attached PDFs and Office documents. Different formats, genuinely separate problem, and the obvious v2. Counted in section 4, not examined.
- Embedded Storyline blocks. Different format entirely. Counted in section 4.
- Locales other than the undefined-locale file. Multi-language courses are out.
- Remediating anything. The tool reports. It does not fix, rewrite or re-export. Hard line.
- Automated monitoring built into the shipped tool. The tool never fetches anything from the network; see the maintenance rule below.

## Severity model

Three result states, and the three-state model is itself part of what the portfolio demonstrates:

- FAIL - mechanically certain, and a defined WCAG failure. Never used where the export lacks the information to be certain, or where WCAG itself defines no failure.
- REVIEW - detected, but correctness depends on human judgment or on information the export does not contain.
- NOT CHECKED - named explicitly in the report, with the reason. The out-of-v1 list above appears in every report so a reader knows what the tool did not look at.

Each finding also carries a basis: a WCAG success criterion, or best practice where W3C guidance advises something but defines no failure. Best-practice findings are labelled as such in the report.

A report that silently omits what it cannot test is worse than one that names its own blind spots.

## Rise-documented limitations list

A small, hand-written list kept as data, drawn from Articulate's Accessibility Maturity Plan. The seed and the trigger analysis are in `ACCESSIBILITY-SOURCES.md` section 3.

- Entries triggered in v1 are those whose trigger is already observed in real exports: video without audio description, images without alt, Scenario, Search, disabled navigation, Process, tables in rich text, Labeled Graphic markers, plus a short "applies to every Rise course" note for standing gaps.
- Entries whose block identity or field has not been observed in any export stay in the data but are dormant until observed. Identities are never guessed.
- Every entry carries: id, trigger, success criterion and level, summary in our own words, workaround, status, source URL, and the source's "as of" date.

**Maintenance rule.** This list is only trustworthy while it is current, and Articulate changes its page without notice. So:

1. Every report prints the list's "as of" date and source link.
2. The tool shows a visible staleness warning when the list is older than 90 days, computed from the local clock, so a stale list is never presented silently as current.
3. A maintainer script, run by hand, fetches the source page, compares it to the stored snapshot, and prints which gaps were added, removed or changed. It lives outside the shipped tool, because a tool that fetches from the network breaks the "nothing leaves your machine" promise.
4. A recurring reminder to run that script exists (monthly). How it is delivered is chosen when v1 is built.

## Definition of done

v1 ships when all of the following are true. No additional checks before shipping.

1. A Rise export can be dropped in and parsed entirely client-side, with no upload and no server.
2. All six check families run and produce findings with success criterion, block location, severity, measured value where applicable, and a remediation note.
3. The report has the four sections above, including a "not checked" section that names real content the tool saw but did not examine.
4. The report exports to something a compliance office could file - HTML or CSV is fine, nothing fancy.
5. One worked example report exists, run against a real course Zach built himself, published alongside the tool. (Open: no Rise access currently; see `SCOPE-V1-EVIDENCE.md`. Not yet decided whether a permitted third-party export may substitute.)
6. The limitations list is dated and sourced, the staleness warning works, and the maintainer script and recurring reminder exist (maintenance rule above).
7. The portfolio write-up leads with the client-side privacy argument and states plainly that the tool is triage, not certification.
8. The tool's own interface meets the WCAG criteria it audits, checked with an automated scan and a keyboard-only pass. An accessibility tool that fails its own audit undermines the whole piece.

When those eight are true, stop building and publish. v1.1 can have inline-colour contrast.

## Effort note

The parser and census already exist and the alt-text nesting paths are already mapped, which is most of the hard part. Families 1, 2, 4 and 6 are string and structure inspection against data already being parsed. Family 3 needs an HTML parser for rich-text links. Family 5 is one colour ratio. The limitations list is hand-written data keyed to the census. None of v1 requires a rendering engine, which is why the inline-colour cut matters so much: it removes the only part of the original idea that needed a second architecture.

## What the portfolio piece actually proves

Worth keeping in view while building, because it should shape the write-up more than the feature list does:

- WCAG knowledge, specific enough to map findings to numbered success criteria
- Working code, not a described intention
- Rise internals understood from the inside, including the base64-in-JSONP content discovery, which is non-obvious reverse engineering
- Judgment about the limits of automated testing, which is the thing that separates someone who has done accessibility work from someone who has read about it
- Separating what an author controls from what the authoring tool controls, and naming both honestly
- An answer to the problem these employers actually have, which is scale and an approaching compliance deadline, not any single inaccessible course
