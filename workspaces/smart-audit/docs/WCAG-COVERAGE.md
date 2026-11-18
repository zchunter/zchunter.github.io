# WCAG 2.1 A/AA — What SmartAudit Can Review, by Effort

Draft 2026-11-17. A working sort of all 50 Level A and AA success criteria in WCAG 2.1 (30 at A, 20 at AA), the standard `SCOPE-V1.md` targets. It is meant to replace picking checks one by one: decide a cut line from the tiers instead.

This is an analysis document, not a scope change. `SCOPE-V1.md` remains the contract until Zach adopts a cut line from this table.

## How to read it

**Tier** = effort for SmartAudit to review the criterion from a Rise export:

| Tier | Meaning |
|---|---|
| **A** | Decidable from data we already parse. String or structure tests, no new dependency. Hours each. |
| **B** | Needs one new capability: an HTML parser for rich text, a small curated word list, a language-detection library, or a verification experiment we have no fixture for. Days each. |
| **C** | Needs heavy tooling or a second architecture: OCR, or colour analysis against rendered backgrounds. Weeks, and past v1. |
| **D** | Not reviewable from the export. Rise's player generates the markup and behaviour, it is runtime behaviour, or it needs human judgment. Reported as NOT CHECKED with the reason. |
| **N/A** | Does not apply to exported, non-live content. |

**Owner** = who can actually fix a failure: **Author** (content author), **Player** (Rise generates it; the author cannot change it), or **Mixed**.

**Evidence.** Entries marked *observed* come from real data or from Griffith's published course rendered in a browser. Player-owned entries are otherwise assumed from how Rise works and are **not independently verified**.

## Summary

| Tier | Count | Share |
|---|---|---|
| A (cheap) | 11 | 22% |
| B (moderate) | 5 | 10% |
| C (heavy) | 1 | 2% |
| D (not reviewable) | 29 | 58% |
| N/A | 4 | 8% |

The tiers support the contract's own claim: static analysis of an export reaches a minority of WCAG, and most of the rest is the player's responsibility, which a content author cannot fix.

## 1. Perceivable

| SC | Name | Lvl | Owner | Tier | What SmartAudit could do, or why not |
|---|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | Author | **A** | Alt presence and plausibility (in contract). Only slots that have an alt field in Rise's model. |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | Author | **B** | An alternative may be adjacent text, a link, or an attachment, none of which is linked in the data. REVIEW only. No audio fixture exists. Optional "possible transcript" name heuristic. |
| 1.2.2 | Captions (Prerecorded) | A | Author | **A** | Self-hosted video: caption track present or absent (`media.video.captions[]`). Embeds: REVIEW, not knowable. Open captions and silent video are exceptions the export cannot show. |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | Author | **A** | Standing REVIEW on every video and embed: "not verifiable from the export". No data. |
| 1.2.4 | Captions (Live) | AA | — | N/A | No live media in an export. |
| 1.2.5 | Audio Description (Prerecorded) | AA | Author | **A** | Same standing REVIEW as 1.2.3. |
| 1.3.1 | Info and Relationships | A | Mixed | **A** | Heading outline from the verified block-to-level mapping (in contract). Extension at tier B: tables without `<th>`, fake lists. Player generates the rest of the structure. |
| 1.3.2 | Meaningful Sequence | A | Mixed | D | Human judgment. Possible tier-B REVIEW heuristic: labeled-graphic stored sequence versus x/y position, after the one-time DOM-order check in `PHASE-1-SPEC.md` §20. |
| 1.3.3 | Sensory Characteristics | A | Author | **B** | Phrase heuristic over text ("the green button", "on the right"). REVIEW only; needs a curated list and will have false positives. |
| 1.3.4 | Orientation | AA | Player | D | Player layout. |
| 1.3.5 | Identify Input Purpose | AA | Player | N/A | Rise content has no author-configurable personal-data fields. |
| 1.4.1 | Use of Color | A | Author | D | Whether colour is the *only* cue is judgment. Inline colour inventory is possible (see 1.4.3). |
| 1.4.2 | Audio Control | A | Mixed | D | No autoplay field in the video media data (*observed*). Player-owned. |
| 1.4.3 | Contrast (Minimum) | AA | Mixed | **A** | Theme accent colour against white and black, REVIEW only (*decided*). Inline author colours (195–249 declarations per course, *observed*) are tier C, v1.1: background colours are player defaults, not in the export. |
| 1.4.4 | Resize Text | AA | Player | D | Runtime. |
| 1.4.5 | Images of Text | AA | Author | **C** | Needs OCR (e.g. tesseract.js) or a human. Filename heuristics are unreliable. |
| 1.4.10 | Reflow | AA | Player | D | Runtime. |
| 1.4.11 | Non-text Contrast | AA | Mixed | **A** | Accent colour only, as REVIEW. Icons, graphics and UI components are not in the export. |
| 1.4.12 | Text Spacing | AA | Player | D | Runtime. |
| 1.4.13 | Content on Hover or Focus | AA | Player | D | Runtime. |

## 2. Operable

| SC | Name | Lvl | Owner | Tier | What SmartAudit could do, or why not |
|---|---|---|---|---|---|
| 2.1.1 | Keyboard | A | Player | D | Needs interaction testing. Embedded third-party content is unknowable (see inventory below). |
| 2.1.2 | No Keyboard Trap | A | Player | D | Runtime. |
| 2.1.4 | Character Key Shortcuts | A | Player | D | Runtime. |
| 2.2.1 | Timing Adjustable | A | Mixed | D | No timing fields in the data. Embedded content unknowable. |
| 2.2.2 | Pause, Stop, Hide | A | Mixed | **B** | Animated GIF inventory as REVIEW (extension check; none in the corpus). The theme's `animateBlockEntrance` is a brief entrance effect, not a 2.2.2 concern. |
| 2.3.1 | Three Flashes or Below Threshold | A | Author | D | Needs frame analysis of video or GIF. Presence can be listed. |
| 2.4.1 | Bypass Blocks | A | Player | D | Player-owned. Landmarks (`nav`, `main`, `header`) present on Griffith (*observed*); no skip link found by text match. |
| 2.4.2 | Page Titled | A | Mixed | **A** | The player builds the page title as "lesson – course" (*observed*). The author's part: empty or duplicate lesson titles (duplicates found in the big sample: "Summary" ×4). REVIEW. |
| 2.4.3 | Focus Order | A | Player | D | Runtime. Same one-time check as 1.3.2 if ever pursued. |
| 2.4.4 | Link Purpose (In Context) | A | Author | **A** | Buttons: label and destination. Rich-text links need an HTML parser. In contract; see the note that context can satisfy this SC. |
| 2.4.5 | Multiple Ways | AA | Mixed | **A** | The author can disable navigation and search (`theme.navigation`, `allowSearch`, `navigationRestricted`). REVIEW if both are off. All three exports have both on, so there is no failing sample. |
| 2.4.6 | Headings and Labels | AA | Author | **A** | Empty or very short headings. Whether headings *describe* their content is judgment. In contract. |
| 2.4.7 | Focus Visible | AA | Player | D | Runtime. |
| 2.5.1 | Pointer Gestures | A | Player | D | Runtime. |
| 2.5.2 | Pointer Cancellation | A | Player | D | Runtime. |
| 2.5.3 | Label in Name | A | Player | D | Accessible names are generated by the player. |
| 2.5.4 | Motion Actuation | A | Player | N/A | No device-motion input in content. |

## 3. Understandable

| SC | Name | Lvl | Owner | Tier | What SmartAudit could do, or why not |
|---|---|---|---|---|---|
| 3.1.1 | Language of Page | A | Mixed | D | The course `locale` field is null in all three exports, yet the rendered page has `lang="en"` on Griffith (*observed*), apparently from the UI label set. A "locale not set" finding would be noise. Unverified for non-English courses. |
| 3.1.2 | Language of Parts | AA | Author | **B** | Needs language detection (e.g. `franc`) to find foreign-language passages, then check for `lang` attributes (zero in the corpus). REVIEW only; unreliable on short text. |
| 3.2.1 | On Focus | A | Player | D | Runtime. |
| 3.2.2 | On Input | A | Player | D | Runtime. |
| 3.2.3 | Consistent Navigation | AA | Player | D | Player-owned. |
| 3.2.4 | Consistent Identification | AA | Player | D | Judgment across the course. |
| 3.3.1 | Error Identification | A | Player | D | Knowledge-check feedback is assessment, not a WCAG input error. Do not claim this one. |
| 3.3.2 | Labels or Instructions | A | Author | D | No clear mapping from Rise content to this SC. |
| 3.3.3 | Error Suggestion | AA | Player | D | As 3.3.1. |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | Player | N/A | No transactions in Rise content. |

## 4. Robust

| SC | Name | Lvl | Owner | Tier | What SmartAudit could do, or why not |
|---|---|---|---|---|---|
| 4.1.1 | Parsing | A | Mixed | **B** | Malformed author-pasted HTML via an HTML parser. Low value; this SC is obsolete in WCAG 2.2. |
| 4.1.2 | Name, Role, Value | A | Player | D | Needs a rendered DOM and an engine such as axe-core. Out of v1 by contract. |
| 4.1.3 | Status Messages | AA | Player | D | Runtime. |

## Cross-cutting: inventory-driven NOT CHECKED (tier A, not an SC)

The census already counts what is in a course. The report's NOT CHECKED section can name real content it did not examine, instead of a generic list:

- **Attachments** (`multimedia/multimedia/attachment`): count and file types. Griffith has 14 `.docx`. Each is a document with its own accessibility requirement, and attachments are out of v1.
- **External embeds** (`multimedia/multimedia/embed`): count and provider. Griffith has 11 Vimeo embeds. Their captions, keyboard behaviour and markup are unknowable from the export.
- **Storyline blocks** (`360/interactive/storyline`): out of v1 by contract.
- **Unrecognised block identities**: any identity no check understands is named, never silently passed.

## What this suggests for the v1 cut line

**Adopted 2026-11-17.** The revised `SCOPE-V1.md` takes every tier-A criterion as the v1 cut line, with tier B and C deferred.

Tier A holds 11 criteria. The contract already covers 7 of them (1.1.1, 1.2.2, 1.3.1, 1.4.3, 1.4.11, 2.4.4, 2.4.6) plus the 1.2.1 audio REVIEW from tier B. Not yet in the contract and cheap: **2.4.2** (empty or duplicate lesson titles), **2.4.5** (navigation disabled), **1.2.3 / 1.2.5** (a standing audio-description REVIEW on video), and the inventory-driven NOT CHECKED section. Tier B is optional extension work, none of it required to ship.

## Open verification items

- Player behaviour for player-owned criteria is assumed, not tested. Only `lang`, page title, landmarks and heading levels were read from a rendered Rise course, and that was one export's player version.
- No export in hand contains an audio block, a failing navigation setting, or an animated GIF, so those checks would run on hand-built fixtures only.
- Heading levels for blocks other than heading and subheading (accordion, tab and process titles, impact, quote) are unmapped.
