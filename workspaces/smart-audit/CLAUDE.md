# SmartAudit — Session Context

SmartAudit is a reviewer and QA tool for exported Articulate Rise courses.

**Current development phase:** shipping SmartAudit v1 as defined in `docs/SCOPE-V1.md` — a client-side WCAG 2.1 AA *triage* tool (six check families, a four-section report, FAIL / REVIEW / NOT CHECKED). The scope contract (written 2026-11-11, revised 2026-11-17) re-scoped the earlier Phase 1 plan to reach a shippable finish line sooner. `docs/SCOPE-V1-EVIDENCE.md` records what the real exports say about which checks are decidable, `docs/WCAG-COVERAGE.md` sorts all 50 A/AA criteria by effort, and `docs/ACCESSIBILITY-SOURCES.md` holds the guides researched and the seed list of Rise-documented limitations.

**Superseded phase description (kept for history):** Phase 1 — reliable Rise extraction, course inspection, and completeness validation.

Phase 1 focuses on locating and decoding authored Rise course data across supported package structures, preserving that data, exposing meaningful course content to a reviewer, and proving that SmartAudit has not silently omitted information.

Under the v1 scope contract, the six check families are no longer blocked by the Phase 1 completeness gate. Instructional-design, writing-quality, reading-level and other checks, and everything in the contract's "Explicitly out of v1" list, remain out of scope until v1 has shipped.

The current implementation runs client-side in the browser and is served over local HTTP during development. Client-side/local processing is preferred where practical, but it is not an architectural requirement if a future capability has a compelling reason to use another approach.

---

## Documentation Authority

When project documents conflict, use this order:

1. `docs/SCOPE-V1.md` — **authoritative v1 scope, check families, severity model, and definition of done**
2. `docs/SCOPE-V1-EVIDENCE.md`, `docs/WCAG-COVERAGE.md`, `docs/ACCESSIBILITY-SOURCES.md` — supporting evidence and analysis for the contract. They explain *why* the contract says what it does; where they disagree with it, the contract wins. Web-derived facts in them (legal dates, vendor gap lists) must be re-verified before publication
3. `CLAUDE.md` — current workspace rules, verified implementation notes, and session guidance
4. `docs/PHASE-1-SPEC.md` — **superseded as a scope document.** Its extraction-boundary design (payload discovery, decoding, validation) is built and remains the reference for that code. Its reviewer, support-state classification, corpus census expansion, embedded-index, package-detection and completeness-gate work is deferred past v1
5. `docs/RESTART-BRIEF.md` — restart history and rationale; some implementation details have been superseded
6. `docs/rise-extraction.md` — extraction research/reference; observed structures are evidence, not universal Rise behavior
7. `docs/CHECKS.md` — candidate checks only; not an active backlog. The six v1 families in `SCOPE-V1.md` are the only checks in scope
8. `smart-audit-oldref/` — reference only; never treat as current implementation

When an older document contradicts `SCOPE-V1.md`, follow `SCOPE-V1.md`. Several sections further down this file (Corpus Census, Support States, Field Classification, Completeness, Validation Corpus, Current Phase 1 Work, Phase 1 Definition of Done) describe the superseded Phase 1 plan; read them as reference, not as current requirements.

Do not silently reconcile contradictory documentation by guessing. Report meaningful conflicts when encountered.

---

# Sequencing Constraint — Read Before Writing Any Code

> **Changed 2026-11-17 by the v1 scope contract:** the Phase 1 completeness gate no longer blocks check logic. Only the six check families in `docs/SCOPE-V1.md` may be built, and nothing in its "Explicitly out of v1" list. The reasoning below still explains *why* the report must be honest about what it did not inspect.
>
> ~~No audit/check logic until the Phase 1 extraction and reviewer completeness gate passes against the intended validation corpus.~~

The first SmartAudit attempt (the old `smart-audit-oldref/`) failed by building checks on incomplete extraction. Tests went red, and fixes were applied at the check layer instead of the extraction layer — bandaids on a broken foundation.

The recovered `docs/CHECKS.md` claims checks were implemented and tested against an extractor that was later found not to represent the whole course reliably.

Those results must not be treated as evidence that the checks themselves are production-ready.

> **If a future check fails unexpectedly, suspect extraction or normalization before modifying the check.**

The rule that carries over into v1, and is already part of the contract's severity model:

> **Unknown information must produce an explicit REVIEW or NOT CHECKED state — never apparent success.**

In practice: a block whose identity no v1 check understands, an alt-text slot with no alt field in the data model, an external embed whose captions the export cannot reveal — each is named in the report, never silently passed. Do not widen the parser to "understand" more of Rise unless a v1 check needs it.

`docs/CHECKS.md` is a menu of candidates, not a backlog. Nothing in it is in scope unless it is one of the six families in `SCOPE-V1.md`.

---

# Check Contract (v1)

Every v1 check should:

1. be a pure function over the parsed course data — no ZIP access, no DOM rendering, no network;
2. have tests against fixture data. Hand-built fixtures are fine; real third-party exports must not be committed (see the licensing note in `tests/rise-payload.test.js`);
3. return findings of one shape carrying, per `SCOPE-V1.md`: WCAG success criterion, block location (lesson plus block, enough to find it in Rise), severity (`FAIL` | `REVIEW` | `NOT CHECKED`), measured value where applicable, and a one-line remediation note;
4. never need to know how the Rise payload was packaged or where it was found.

Severity discipline: `FAIL` only when the export makes the defect mechanically certain. If correctness depends on human judgment or on information the export does not contain, it is `REVIEW`. If a location has no field in Rise's data model for what the check needs, it is `NOT CHECKED` with the reason. The report must never claim conformance.

A future audit rule should not care whether the source was:

- `locales/und.js`;
- `runtime-data.js`;
- embedded in `index.html`;
- Web;
- SCORM;
- xAPI;
- cmi5; or
- another supported package wrapper.

Do not add checks beyond the six families in `docs/SCOPE-V1.md` before v1 ships.

Rise-documented limitations are reported as "documented by Articulate as of <date>", with the source cited. Never present them as SmartAudit's own finding, as the author's failure, or as independently verified. The limitations list is dated and sourced, and its maintenance rule in `SCOPE-V1.md` is part of the definition of done.

---

# Current Architecture

Do not treat an LMS export standard as a Rise content format.

The architecture is:

```text
Rise ZIP
   │
   ▼
Package / Export Detection
   │
   ▼
Rise Payload Discovery
   │
   ▼
Payload Decoding
   │
   ▼
Raw Rise Course Data
   │
   ▼
Corpus Census / Provenance
   │
   ▼
Normalization + Support Classification
   │
   ▼
Asset Resolution
   │
   ▼
Course Reviewer
   │
   ▼
Completeness Gate
   │
   ▼
Phase 2 Audit
```

Two separate concepts must remain separate:

```text
EXPORT / PACKAGE TYPE

Web
SCORM 1.2
SCORM 2004
xAPI / Tin Can
cmi5
AICC
unknown
```

and:

```text
RISE PAYLOAD PACKAGING STRATEGY

locale JSONP
runtime-data JSONP
embedded-index payload
future/unknown
```

Do not create separate SCORM, xAPI, or cmi5 lesson/block parsers unless actual exported data demonstrates a meaningful authored-course schema difference that requires one.

---

# Rise Payload Discovery

The current implementation began with a locale-based Rise export and therefore searches for:

```text
locales/und.js
lib/locales/und.js
```

That is a **verified packaging strategy**, not the universal Rise architecture.

At least three relevant payload strategies have been identified during Phase 1 research.

## Locale JSONP

Observed form:

```js
__resolveJsonp("course:und", "<base64-encoded-json>")
```

Example locations include:

```text
locales/und.js
lib/locales/und.js
```

Do not hardcode the JSONP key.

---

## Runtime Data JSONP

Observed form:

```js
__jsonp("runtime-data.js", "<base64-encoded-json>")
```

Example:

```text
runtime-data.js
scormcontent/runtime-data.js
```

The decoded payload can contain the same kind of authored Rise course model required by SmartAudit.

---

## Embedded Index Payload

Current/recent Rise exports may store Base64 course data directly in `index.html`.

The exact wrapper has varied.

Do not invent or hardcode an embedded-index syntax until it is verified against a fixture.

Payload discovery should detect supported structural signatures rather than assume a filename based on export date or LMS standard.

---

# Payload Validation

Successfully decoding Base64 is not sufficient evidence that the correct Rise payload was found.

A candidate should be structurally validated.

At minimum, verify that the decoded value plausibly contains a Rise course structure, such as:

```text
object
└── course
    └── lessons[]
```

Do not accept arbitrary valid JSON as a Rise course.

If a Rise-like ZIP cannot be decoded using a supported payload strategy, fail clearly with an unsupported-layout/extraction state.

Never convert extraction failure into:

```text
0 lessons
0 blocks
0 issues
```

That is a false success.

---

# File Layout

Current project organization (v1 report work, 2026-11-18). `src/report/` is the live v1 pipeline. The older inventory viewer files (`dump.js`, `images.js`, `issues.js`, `render.js`) are no longer wired into `index.html`; they are kept until the v1 checks make them redundant, then should be removed so there is one finding format.

```text
workspaces/smart-audit/
├── index.html                  accessible shell: loads a ZIP, renders the report
├── src/
│   ├── extract.js              ZIP + payload discovery -> raw parsed course
│   ├── rise-payload.js         payload strategies, decoding, validation
│   ├── census.js               lesson/block/identity counts
│   ├── html.js                 esc() / stripHtml()
│   ├── report/
│   │   ├── walk.js             shared course walker; gives every finding a location
│   │   ├── finding.js          the one finding shape (FAIL / REVIEW / NOT CHECKED)
│   │   ├── run-checks.js       runs checks; a crashing check becomes NOT CHECKED
│   │   ├── checks/             one file per family: image-alt, heading-structure,
│   │   │                       link-purpose, media-alternatives, theme-contrast,
│   │   │                       titles-navigation; index.js lists them in contract order
│   │   ├── rich-text.js        DOMParser helpers: links, headings, plain text
│   │   ├── colour.js           contrast ratio maths and nearest compliant colour
│   │   ├── inventory.js        attachments, embeds, Storyline (section 4)
│   │   ├── reminders.js        "keep in mind" text (section 2)
│   │   ├── limitations.js      staleness rule for the limitations list (section 3)
│   │   ├── scope.js            what is out of scope (section 4)
│   │   ├── report.js           buildReport(): the four sections
│   │   └── render-report.js    report -> escaped, accessible HTML
│   ├── dump.js, images.js, issues.js, render.js   older viewer, unwired
├── tests/
│   ├── extract.test.js
│   ├── rise-payload.test.js
│   └── report.test.js
├── tooling/
│   └── serve-workspace.cjs
├── docs/
│   ├── SCOPE-V1.md
│   ├── SCOPE-V1-EVIDENCE.md
│   ├── WCAG-COVERAGE.md
│   ├── ACCESSIBILITY-SOURCES.md
│   ├── PHASE-1-SPEC.md
│   ├── RESTART-BRIEF.md
│   ├── CHECKS.md
│   └── rise-extraction.md
├── jest.config.cjs
└── CLAUDE.md
```

Phase 1 may refactor extraction toward a structure similar to:

```text
src/
├── intake/
│   ├── load-zip.js
│   ├── detect-package.js
│   └── locate-content-root.js
│
├── adapters/
│   └── rise/
│       ├── locate-payload.js
│       ├── decode-payload.js
│       ├── strategies/
│       ├── census.js
│       ├── normalize.js
│       ├── assets.js
│       └── completeness.js
│
├── reviewer/
│   └── ...
│
└── audit/
    └── [Phase 2]
```

This proposed structure is guidance, not permission to perform a large refactor in one step.

Prefer small implementation slices with tests.

---

# Current Workspace Status

Phase 0 reconciliation is complete.

Verified Phase 0 outcomes include:

- `index.html` is a thin shell using ES modules rather than duplicating source logic;
- the SmartAudit Jest configuration exists;
- `npm run smart-audit:test` is runnable;
- `docs/CHECKS.md` and `docs/rise-extraction.md` were recovered;
- `serve-workspace.cjs` was ported into the active workspace;
- `smart-audit-oldref` is reference-only.

Do not undo these changes.

In particular:

> **Do not re-inline application logic into `index.html`.**

---

# Observed Rise Course Structure

The following structure has been observed in existing fixtures.

It is useful implementation evidence, but it is **not a complete or universal Rise schema**.

```text
courseData.course
├── .id
├── .title
├── .description
├── .coverImage
├── .media
└── .lessons[]
    ├── .id
    ├── .title
    ├── .type
    └── .items[]
        ├── .family
        ├── .type
        ├── .variant
        ├── .media
        └── .items[]
```

Observed nested properties include:

```text
heading
paragraph
description
title
label
caption
completeHint
date
media
destination
answers[]
front
back
slides[]
items[]
```

Do not assume this list is exhaustive.

The Phase 1 census exists specifically to discover structures that previous fixtures did not contain.

---

# Lesson Type: `section`

In existing fixtures:

```js
lesson.type === "section"
```

represents a Rise section-divider row.

It has a title and may not contain an `items[]` collection.

This is expected behavior and must not automatically be treated as extraction failure.

Preserve and render sections explicitly.

---

# Block Identity

Observed Rise blocks can be identified using:

```js
`${block.family}/${block.type}/${block.variant}`
```

Example:

```text
image/image/hero
knowledgeCheck/knowledgeCheck/multiple choice
```

This identity is useful for census, normalization, renderer selection, and support classification.

It is not itself proof that SmartAudit fully understands the block.

---

# Observed Block Identities in Current Fixtures

The following identities have been observed in prior SmartAudit fixture work:

```text
buttons/interactive/button
buttons/interactive/button stack
continue/divider/continue
divider/divider/divider
flashcard/interactive/flashcard
image/image/hero
image/image/text aside
impact/text/d
interactive-fullscreen/interactive/labeledgraphic
interactive-fullscreen/interactive/process
interactive-fullscreen/interactive/scenario
interactive-fullscreen/interactive/timeline
interactive/interactive/accordion
interactive/interactive/tabs
knowledgeCheck/knowledgeCheck/multiple choice
list/list/bulleted
text/text/heading
text/text/heading paragraph
text/text/paragraph
text/text/subheading
text/text/subheading paragraph
```

This list means:

> **SmartAudit has observed these identities in existing fixture data.**

It does **not** mean:

> **These are all Rise block types.**

Do not add guessed identities merely because a Rise authoring block exists in the UI.

Actual internal identities should come from exported data.

---

# Corpus Census

Phase 1 must build its understanding of Rise from observed exported data rather than a manually maintained whitelist.

For every validation fixture, record at minimum:

```text
lesson types
family/type/variant identities
identity occurrence counts
block-level fields
item-level fields
nested structures
media structures
assessment structures
unknown structures
```

The census should eventually be capable of reporting:

```text
Identity                                      Count   Courses
──────────────────────────────────────────────────────────────
text/text/paragraph                             87       5
text/text/heading                               32       5
interactive/interactive/accordion               14       3
...
```

Unknown identities must remain visible.

Do not silently add an identity to a "known" list merely to make completeness metrics green.

---

# Support States

Binary `known / unknown` classification is not sufficient for Phase 1.

Use these conceptual support states:

## SUPPORTED

SmartAudit understands the observed meaningful authored properties of the block and exposes them appropriately to the reviewer.

## PARTIALLY_SUPPORTED

The block is recognized and preserved, but one or more potentially meaningful authored properties remain unrepresented or unexplained.

## UNKNOWN

SmartAudit does not understand the structure sufficiently to provide a meaningful reviewer representation.

Raw data must still be preserved.

A recognized identity does not automatically qualify as `SUPPORTED`.

---

# Field Classification

Do not globally discard a property simply because it appears to be metadata.

Observed fields should eventually be classified as:

```text
reviewer-facing content
reviewer-useful structure/metadata
implementation/presentation metadata
unknown
```

Classification may differ by block family.

Properties such as:

```text
x
y
icon
goTo
nextSlide
position
emotion
hasCharacter
```

may be meaningful in some interactions even if they are irrelevant elsewhere.

Do not automatically suppress them without understanding their role.

Unknown properties should remain available for census/provenance reporting.

---

# Source Order and Keyboard Order

Preserve array/source position.

Use terminology such as:

```text
source order
stored sequence
authored sequence
```

Do **not** automatically describe `items[]` order as:

```text
keyboard order
focus order
screen-reader order
```

For Labeled Graphic markers, current evidence supports displaying:

- stored marker sequence;
- marker ID;
- marker icon/code where available;
- x/y visual position;
- marker title;
- marker description.

It has **not yet been proven** that `items[]` sequence necessarily equals runtime keyboard-focus traversal order.

A separate controlled runtime fixture should compare:

```text
A. JSON items[] sequence
B. rendered DOM order
C. Tab / Shift+Tab focus order
```

Do not block general extraction work on that experiment.

Do not generalize its eventual result automatically to other interaction families.

---

# Observed Alt-Text Paths

The following paths have been observed in existing fixture data.

They are evidence, not a guarantee that every Rise block stores accessibility information identically.

| Observed location | Observed path |
|---|---|
| Course cover image | `course.coverImage.media.image.alt` |
| Course logo | `course.media.image.alt` where present |
| Block image/background | `block.media.image.alt` |
| Item image | `item.media.image.alt` |
| Flashcard front image | `item.front.media.image` |
| Flashcard back image | `item.back.media.image` |
| Scenario character | `item.character.src` |
| Scenario background | `item.background.media.image.alt` |
| Scenario slide alt | `slide.alt` |
| Scenario response alt | `slide.responses[n].alt` |

Some observed media structures have no alt field.

Do not infer from one block family's missing alt property that all versions or related blocks behave identically.

Preserve the raw structure so future fixtures can confirm or revise these observations.

`isEmptyAlt(val)` currently treats observed empty representations such as `null`, `""`, and `"\"\""` as missing.

---

# Image Resolution

Existing SmartAudit logic resolves images stored under ZIP assets to browser blob URLs.

Observed image records may contain:

```text
image.key
image.crushedKey
image.useCrushedKey
image.originalUrl
```

Existing behavior chooses the appropriate local key, handles percent-encoded filenames, searches the ZIP asset index, and uses remote source information only as a fallback.

Preserve this useful behavior unless Phase 1 evidence requires a change.

Asset resolution is part of completeness.

An image reference that exists in raw course data but silently disappears from the reviewer is an extraction/reviewer failure.

Track referenced, resolved, fallback, and unresolved assets explicitly.

---

# Labeled Graphic Notes

Observed Labeled Graphic markers include:

```text
items[] sequence
icon
x
y
title
description
```

Observed marker icon codes include:

| Icon code | Observed display label |
|---|---|
| 17 | 1 |
| 18 | 2 |
| 19 | 3 |
| 20 | 4 |
| 21 | 5 |

Do not infer unverified icon mappings beyond observed evidence.

When an unknown icon code appears:

- preserve the raw code;
- show it as unknown if useful;
- add evidence to research/census notes;
- do not guess the visual label.

The reviewer may use marker sequence plus x/y coordinates to help a human inspect the relationship between authored sequence and visual layout.

Do not call that keyboard order.

---

# Known Accessibility Content Pattern

Existing course work identified a useful authoring pattern:

```text
Labeled Graphic
+
adjacent Accordion containing detailed textual description
```

The short image alt text may intentionally direct the learner to the following detailed description.

Do not automatically treat the accordion as redundant or the short alt text as insufficient without understanding the surrounding content.

This is an example of why future audit rules must operate over trusted course context rather than isolated strings.

---

# Knowledge Checks

Existing fixture work has verified at least:

```text
knowledgeCheck/knowledgeCheck/multiple choice
```

Observed information includes:

```text
question/title
answers[]
answer title
correctness configuration
feedback configuration
```

Other current Rise knowledge-check types should be discovered from real exports.

Do not invent their internal identities from their authoring-UI names.

Phase 1 should expose assessment configuration for review.

It should not yet decide whether that configuration constitutes a QA/accessibility problem.

---

# Scenarios

Existing SmartAudit code contains special handling for Scenario structures.

Potentially meaningful observed properties include:

```text
slides
responses
character
background
alt
goTo
nextSlide
emotion
position
```

Do not globally classify these properties as implementation noise.

Phase 1 should preserve them and determine through fixtures which are meaningful for reviewer representation.

---

# Raw Data and Provenance

Normalization must not destroy the evidence needed to understand future Rise structures.

Where practical, normalized entities should retain provenance similar to:

```js
{
  source: {
    path: "course.lessons[2].items[5]",
    raw: { ... }
  }
}
```

The exact implementation may differ to avoid excessive duplication.

The requirement is:

> **SmartAudit must be able to trace normalized/reviewer content back to the source structure from which it was derived.**

Unknown blocks and fields must not be silently discarded.

---

# Completeness

Phase 1 distinguishes two related concepts.

## Preservation Completeness

Did SmartAudit retain everything it encountered?

Examples:

```text
raw lesson count == preserved lesson count
raw block count == preserved block count
unknown blocks retain raw data
assets are resolved or explicitly reported
```

## Understanding / Reviewer Completeness

Does SmartAudit understand the meaningful authored information it claims to support?

Examples:

```text
unknown identities = 0 for a fully supported fixture
unexplained partial structures = 0
unclassified meaningful fields = 0
unexplained asset failures = 0
```

A course can be completely preserved while still being only partially supported.

Never collapse these concepts into one "success" boolean.

---

# Validation Corpus

The old completeness plan referenced two sample courses.

Phase 1 now uses the broader concept of a **validation corpus**.

The corpus should eventually cover:

- locale JSONP packaging;
- `runtime-data.js` packaging;
- embedded-index packaging;
- current LMS package structures;
- Web export where available;
- multiple LMS targets where practical;
- simple courses;
- interaction-heavy courses;
- media-heavy courses;
- intentionally broad block coverage.

The corpus should seek examples of current authoring categories without guessing their internal identities.

Examples include:

```text
text
lists
images
gallery/image layouts
video
audio
embeds
attachments
buttons
accordion
tabs
process
timeline
labeled graphic
scenario
flashcards
sorting
knowledge-check types
other blocks discovered during census
```

---

# Testing Rules

Phase 0 made the test harness runnable.

Use it.

The next important tests are integration tests around the extraction boundary.

At minimum, Phase 1 should establish:

```text
locale JSONP fixture
→ detected
→ decoded
→ structurally validated

runtime-data JSONP fixture
→ detected
→ decoded
→ structurally validated

unsupported/malformed payload
→ fails clearly
```

Then expand into:

```text
census tests
normalization tests
asset reconciliation
completeness reconciliation
```

Tests should prove behavior rather than merely exercise functions.

Do not modify expected values simply to make tests green without verifying why the underlying fixture behaves differently.

---

# Current Work (v1)

The authoritative scope is `docs/SCOPE-V1.md`. v1 is done when its eight-item definition of done is true; then stop building and publish. Open items (alt-text blank/decorative behaviour, the worked-example source, bare-URL link severity, what Rise stores for audio, lesson-header and theme fields) are listed in `docs/SCOPE-V1.md` and `docs/SCOPE-V1-EVIDENCE.md` and need resolving before the affected checks are built.

Already built and tested: the extraction boundary described below (payload discovery for locale-JSONP and runtime-data-JSONP, UTF-8-correct decoding, structural validation, loud failure, and an initial lesson/block/identity census). Nothing further is needed there for v1 unless a check requires it.

The remainder of this section is the earlier first-slice brief, kept for history.

**Earlier first slice (done):**

> **Generalize SmartAudit's extraction boundary so it discovers Rise course payloads rather than assuming `und.js`, while preserving the existing locale-JSONP behavior. Add initial census output. Do not add audit/check logic.**

First-slice scope:

1. inspect the existing extraction implementation before editing;
2. create/generalize a payload-discovery boundary;
3. preserve locale JSONP as one extraction strategy;
4. add verified `runtime-data.js` JSONP support;
5. return payload strategy and source-path metadata;
6. structurally validate decoded Rise data;
7. fail loudly for unsupported/malformed payloads;
8. produce an initial census containing:
   - lesson count;
   - block count;
   - encountered `family/type/variant` identities;
   - identity occurrence counts;
9. add appropriate integration tests.

Excluded from that first slice (check logic is now governed by `SCOPE-V1.md`, not by this list):

- add audit/check logic;
- redesign the reviewer;
- implement guessed block identities;
- claim full block support;
- implement embedded-index parsing without a verified fixture;
- treat source order as keyboard order;
- perform a broad repository refactor merely because the eventual architecture may support one.

---

# Working Method

Prefer:

```text
research/evidence
      ↓
specification
      ↓
small implementation slice
      ↓
tests
      ↓
review results
      ↓
next slice
```

Before a significant implementation slice:

1. read the relevant section of `docs/SCOPE-V1.md` (and `docs/SCOPE-V1-EVIDENCE.md` for what the data supports);
2. inspect the existing implementation;
3. state which files/functions need modification;
4. preserve working code that remains compatible with the specification;
5. avoid unrelated cleanup.

After a slice:

1. report files changed;
2. report tests added;
3. report tests run and their results;
4. identify assumptions made;
5. report conflicts with `SCOPE-V1.md`;
6. report newly observed Rise identities, fields, or structures;
7. do not automatically expand scope to address those discoveries.

When evidence contradicts existing documentation, flag the contradiction before encoding a new assumption into the architecture.

---

# Reference Implementation

`smart-audit-oldref/` is reference-only.

It exists to help understand previous approaches and potentially recover useful isolated logic.

Do not:

- treat it as current;
- port whole subsystems because they already exist;
- assume old green tests prove correctness;
- copy symptom-level fixes whose original extraction assumptions were invalid.

Reuse concepts or isolated implementation only when they fit the current Phase 1 architecture and can be independently verified.

---

# Definition of Done

v1 is done when the six items in the "Definition of done" section of `docs/SCOPE-V1.md` are true. That supersedes the Phase 1 definition below, which is kept for reference only.

**Superseded — Phase 1 definition:** Phase 1 would have been complete when SmartAudit could truthfully state, for its supported validation corpus:

> **SmartAudit preserved every course structure it encountered, represented every meaningful authored property it claims to support, resolved or explained every referenced asset, and explicitly reported everything it did not understand.**

Only then would Phase 2 automated audit development have begun.