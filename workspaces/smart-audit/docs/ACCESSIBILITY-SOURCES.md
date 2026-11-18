# Accessibility Sources, Report Structure, and Rise Limitations

Research notes, 2026-11-17. Records which guides SmartAudit should map to, a proposed three-way split of every requirement by who controls it, and a seed list of Rise's own documented accessibility gaps.

This is analysis, not scope. `SCOPE-V1.md` remains the contract. Dates and legal status below came from web searches and page reads on 2026-11-17 and **must be re-checked before anything is published**.

## 1. Which guides to consider

| Guide | Why it matters | How SmartAudit uses it | Confidence |
|---|---|---|---|
| **WCAG 2.1 Level AA** | The standard the ADA Title II rule makes enforceable. | The checked standard. Every finding maps to a numbered success criterion. | High |
| **WCAG 2.2** | W3C Recommendation since Oct 2023. Adds 9 criteria (2 at A: 3.2.6, 3.3.7; 4 at AA: 2.4.11, 2.5.7, 2.5.8, 3.3.8; 3 at AAA) and removes 4.1.1. | Forward-looking tag only. All six A/AA additions concern runtime behaviour or form entry, which the player owns, so none adds a check today. | Medium: criteria list is from memory and agrees with search results; confirm against the W3C "What's New in 2.2" page |
| **ADA Title II rule (DOJ)** | Sets the legal deadline. A DOJ interim final rule of 2026-04-20 reportedly moved dates back a year: entities of 50,000+ to 2027-04-26, smaller entities to 2028-04-26. One source says the extension is being challenged in court. | Context for the write-up; not a check. | Medium: verify in the Federal Register notice (91 FR, 2026-04-20) |
| **Section 508** | US federal ICT rule. References WCAG 2.0 A/AA, a subset of 2.1 AA. | Covered by the WCAG 2.1 mapping. No separate checks. | High |
| **EN 301 549 (EU)** | European procurement standard. Referenced WCAG 2.1 (v3.2.1). One later source says v4.1.1 (Sept 2026) adopts WCAG 2.2 A/AA. | Covered by WCAG mapping. | Low on the v4.1.1 claim: sources conflict, unverified |
| **Articulate's conformance report (VPAT/ACR)** | The vendor's own statement of Rise 360 conformance, dated 2026-03-17. | Source for the Rise-limitations list below. Not read in detail. | Medium |
| **Articulate's Accessibility Maturity Plan** | Vendor's list of known gaps. See section 3. | The seed for the limitations registry. | High: read directly |
| **Beyond compliance** (not researched here): Quality Matters, OSCQR, Universal Design for Learning, W3C cognitive-accessibility guidance, ATAG (the guideline for authoring tools themselves) | Practice frameworks used in course design. | Candidate sources for the "keep in mind" reminders; none is a compliance test. | Not verified |
| **Document formats** (PDF/UA, Office checkers) | Attachments and exported PDFs have their own requirements. | Out of v1. Named in NOT CHECKED. | Not researched |

One mapping covers the legal regimes, because 508, EN 301 549 and Title II all reuse WCAG. SmartAudit does not need a separate rule set per regime.

## 2. Proposed report structure: split by who controls it

Every one of the 50 A/AA criteria lands in one default section. A criterion can appear in two.

| Section | What it holds | Source of content |
|---|---|---|
| **1. Findings** (author can fix) | FAIL and REVIEW results from the checks. | Computed from the export. |
| **2. Keep in mind** (author controls, tool cannot check) | Manual-review reminders, shown only when the course contains the relevant content (e.g. "11 embedded videos: verify caption accuracy and audio description"). | Static text keyed to the census. |
| **3. Rise-documented limitations** (author cannot fix) | Gaps Articulate itself documents, shown when the course uses the affected block, theme or setting. Reported as "documented by Articulate as of <date>", not as the author's failure. | A versioned registry (section 4). |
| **4. Not applicable / not checked** | Criteria that do not apply, plus content the tool saw but did not examine (attachments, embeds, Storyline, unrecognised blocks). | Census inventory. |

## 3. Seed list: Rise gaps documented by Articulate

Source: [Rise 360 Accessibility Maturity Plan](https://www.articulate.com/about/accessibility/rise-360-accessibility-maturity-plan/), page last updated 2026-09-24. 22 gaps, all marked "Planned", none with a date. (A search snippet showed a July 2026 date for the same page; use the date on the page itself when refreshing.)

**Trigger** = how SmartAudit could tell the course is affected: **now** = identity or field observed in our exports; **identity unseen** = block exists in Rise but no export here contains it (do not guess its identity); **field unverified** = the setting may be in the export but we have not found it; **standing** = applies to every course.

| # | Gap (summary) | Affects | SC | Trigger | Vendor workaround |
|---|---|---|---|---|---|
| 1 | No audio description for video | Video | 1.2.3 A | now (`media.video`) | Make descriptions elsewhere and import |
| 2 | PDF export lacks tagging | PDF export | 1.3.1 A | standing | Fix in Acrobat |
| 3 | Image without alt is announced as a filename when zoom is on | Images | 1.1.1 A | now (missing alt) | Disable zoom on decorative images |
| 4 | Keyboard users tab through the lesson before the menu | Navigation | 2.4.3 A | standing | Shift+Tab |
| 5 | Cannot assign an H1 when the lesson header is disabled | Lesson header | 1.3.1 A | field unverified | none |
| 6 | Required Guestbook fields not marked | Guestbook | 3.3.2 A | identity unseen | none |
| 7 | Audio transcript panel sits outside its block in focus/reading order | Audio | 1.3.1 A | identity unseen | none |
| 8 | Responsive audio panel header adds a tab stop | Audio | 1.3.1 A | identity unseen | none |
| 9 | Scenario does not reflow on mobile | Scenario | 1.4.10 AA | now | none |
| 10 | Restart button unnamed in continuous Microlearning | Microlearning | 4.1.2 A | field unverified | Use stepped navigation |
| 11 | Search close loses focus (Narrator) | Search | 2.4.3 A | now (`allowSearch`) | none |
| 12 | Inactive Horizon overlay exposed to screen readers | Horizon theme | 4.1.2 A | field unverified (`themeId` value) | Use stepped navigation |
| 13 | Navigation landmark exposed when navigation disabled | Navigation | 4.1.2 A | now (`navigation: false`) | none |
| 14 | Process block controls lack a visible focus indicator | Process | 2.4.7 AA | now | none |
| 15 | iOS VoiceOver focus trapped by custom layout block | Custom layout | 2.4.3 A | identity unseen | none |
| 16 | Interactions ignore reduced-motion settings | Interactions | 2.3.3 AAA | standing | none |
| 17 | Horizon overlay navigation focus order | Horizon theme | 2.4.3 A | field unverified | Use another theme |
| 18 | Scenario options skipped or misordered (Narrator) | Scenario | 2.4.3 A | now | none |
| 19 | Narrator loses focus on custom blocks | Custom blocks | 2.4.3 A | identity unseen | none |
| 20 | Tables cannot be programmatically captioned | Tables | 1.3.1 A | now (table in rich text) | none |
| 21 | Authors cannot set the language of a passage | Text blocks | 3.1.2 AA | standing | none |
| 22 | Pulsing marker animation cannot be disabled | Labeled graphic | 2.2.2 A | now | none |

**What this changes in the earlier analysis**

- **Audio (#7, #8):** Rise audio blocks apparently have a **transcript panel**. That differs from the "no transcript block" recollection, which may predate it. If the panel is a data field, "audio with an empty transcript" could be a clean FAIL after all. No audio export is available here to settle it.
- **Language of parts (#21):** the tier-B check for 3.1.2 would flag something the author cannot fix. It belongs in section 3, not in Findings.
- **Headings (#5):** the "lesson title renders as h1" mapping holds only when the lesson header is enabled. A lesson with no heading-level-1 may be a Rise limitation rather than an author finding.
- **Vendor statements are not uniform.** Articulate's "Choosing Accessible Components" article (updated 2026-03-06) says most blocks support accessibility when authored thoughtfully and lists none as inaccessible, while the Maturity Plan names block-specific gaps. A registry entry must cite the specific document and date.

## 4. Registry design (long-term)

Each entry: id, trigger (block identity, theme id, setting, or "standing"), SC and level, effect on users, source URL, source "as of" date, vendor workaround, status. Report wording is "documented by Articulate as of <date>", never an independent claim.

Maintenance is the real cost. The source changes without notice, statuses will move from Planned to fixed, and an out-of-date entry blames the wrong thing. Every report should print the registry date, and a refresh process is needed (manual and periodic is realistic).

## 5. Open items

- Find whether the export records "lesson header disabled", the theme id for Horizon, and Microlearning navigation. None is observed in the three exports.
- Obtain one export containing an audio block, a Guestbook, and a custom layout block to learn their identities and fields.
- Read the conformance report (VPAT) itself; only its existence and date are confirmed here.
- Verify the DOJ dates and the WCAG 2.2 criteria list against primary sources before publishing either.
