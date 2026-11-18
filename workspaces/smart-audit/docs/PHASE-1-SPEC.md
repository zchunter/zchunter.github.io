# SmartAudit Phase 1 — Rise Extraction and Course Reviewer

**Revised:** 10 September 2026  
**Purpose:** Define the implementation target for SmartAudit Phase 1 after validating the architecture against current and recent Articulate Rise export structures.

---

## 1. Phase 1 Goal

Phase 1 turns SmartAudit into a trustworthy **Rise course reviewer and inspector**.

Given a supported Articulate Rise export ZIP, SmartAudit should:

1. identify the package and locate the authored Rise course payload;
2. decode that payload without depending on the Rise learner interface;
3. preserve the original source data and its location;
4. inventory every lesson, block, nested item, asset reference, and meaningful authored property encountered;
5. normalize supported content into a stable SmartAudit model;
6. show the course in a reviewer-oriented interface;
7. explicitly identify anything SmartAudit does not yet fully understand; and
8. prove that the reviewer has not silently omitted meaningful course content.

Phase 1 is **not an automated audit**.

Automated accessibility, instructional-design, writing-quality, and QA findings belong to Phase 2.

---

# 2. Governing Constraint

> **Do not implement audit/check logic until extraction and reviewer completeness have been demonstrated across the Phase 1 validation corpus.**

The previous SmartAudit implementation failed because successful parsing of some data was treated as proof that the course had been completely understood.

That must not happen again.

Successful Base64 decoding is not completeness.

Recognizing a block identity is not completeness.

Rendering some text and images is not completeness.

A supported course must pass an explicit completeness/reconciliation process before SmartAudit is allowed to describe the course as fully reviewable.

The current repository already preserves this sequencing constraint, and Phase 0 has repaired the workspace/test infrastructure needed to enforce it. 

---

# 3. Definition of Phase 1 Success

The primary Phase 1 user journey is:

```text
Drop Rise ZIP
    ↓
Identify package
    ↓
Locate and decode Rise payload
    ↓
Inventory raw course structure
    ↓
Normalize understood content
    ↓
Resolve referenced assets
    ↓
Classify support/completeness
    ↓
Display Course Reviewer
```

A successful Phase 1 demonstration should allow a reviewer to:

- see every lesson and section;
- see every block encountered;
- inspect meaningful text;
- view referenced images where locally available;
- inspect authored alt text;
- inspect captions;
- inspect buttons and destinations;
- inspect knowledge-check questions, answer options, correctness configuration, and feedback;
- inspect interactive content in its stored/authored sequence;
- inspect meaningful metadata that is difficult to see in the normal Rise learner experience;
- identify unsupported or partially understood structures immediately;
- understand where extracted information came from; and
- obtain a numerical completeness summary.

A representative success statement is:

> **Drop in a Rise ZIP → see every lesson and block → inspect meaningful authored content and assets → know exactly what SmartAudit understands and what it does not.**

---

# 4. Non-Goals for Phase 1

Phase 1 does not need to:

- recreate the Rise learner interface;
- visually reproduce Rise styling;
- execute Rise's original JavaScript application;
- emulate an LMS;
- validate SCORM/xAPI/cmi5 communication;
- reproduce animations;
- calculate browser-rendered color contrast;
- claim JSON order is keyboard focus order without independent validation;
- perform automated accessibility findings;
- perform instructional-design findings;
- perform reading-level or writing-quality analysis;
- perform AI analysis;
- support every historical Rise package ever generated.

Rise itself can already produce a learner-facing experience. SmartAudit's Phase 1 value is exposing authored information for **review**, not cloning the player.

---

# 5. Architectural Principles

## 5.1 Export standard and Rise payload packaging are separate concerns

SmartAudit must not assume that:

```text
xAPI = one Rise parser
SCORM = another Rise parser
cmi5 = another Rise parser
```

Instead:

```text
ZIP
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
Raw Rise Model
 │
 ▼
Normalization
```

The package may identify itself as:

- Web;
- SCORM 1.2;
- SCORM 2004;
- xAPI / Tin Can;
- cmi5;
- AICC; or
- unknown.

That information should be retained as package metadata.

It should **not**, by itself, select a separate lesson/block parser.

Current Rise LMS exports generally use a shared content/package architecture while changing LMS launch and tracking behavior around that content. Older exports may have different outer layouts, so SmartAudit should inspect structure rather than infer structure from the export standard.

---

## 5.2 Payload location must be detected structurally

SmartAudit currently assumes the Rise payload is stored in a locale file such as `locales/und.js` or `lib/locales/und.js`. 

That assumption is no longer acceptable.

At least three relevant Rise payload-packaging strategies have been identified:

```text
Locale JSONP
  e.g. locales/und.js
  __resolveJsonp(...)

Runtime data JSONP
  runtime-data.js
  __jsonp("runtime-data.js", ...)

Embedded index payload
  Base64 course data stored directly in index.html
  exact wrapper may vary
```

These are **packaging strategies**, not separate SmartAudit course formats.

SmartAudit should discover candidates from the ZIP, validate them, and then decode the one that contains a plausible Rise course model.

Do not infer the payload location from:

- file date;
- presumed Rise version;
- LMS standard;
- ZIP filename; or
- one previously observed sample.

---

# 6. Proposed Phase 1 Architecture

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
│       │   ├── locale-jsonp.js
│       │   ├── runtime-data-jsonp.js
│       │   └── embedded-index.js
│       ├── census.js
│       ├── normalize.js
│       ├── assets.js
│       └── completeness.js
│
├── reviewer/
│   ├── render-course.js
│   └── block-renderers/
│
└── audit/
    └── [Phase 2 — do not implement yet]
```

The exact filenames may change during implementation.

The separation of responsibilities should not.

---

# 7. Phase 1A — Package Intake and Payload Discovery

## Objective

Given a ZIP, SmartAudit should determine:

1. whether it plausibly contains a Rise course;
2. what export/package type can be identified;
3. where the Rise authored payload appears to be stored; and
4. which extraction strategy successfully decoded it.

## Package metadata

Example:

```js
{
  packageType: "xapi",
  contentRoot: "scormcontent/",
  indicators: [
    "tincan.xml"
  ]
}
```

Package detection should remain informational whenever possible.

Failure to identify the LMS standard should not prevent Rise extraction if a valid Rise payload can still be located.

## Payload-source metadata

Example:

```js
{
  strategy: "runtime-data-jsonp",
  path: "scormcontent/runtime-data.js",
  wrapper: "__jsonp"
}
```

or:

```js
{
  strategy: "locale-jsonp",
  path: "locales/und.js",
  wrapper: "__resolveJsonp"
}
```

## Candidate validation

A decoded Base64 string should not automatically be accepted as Rise data.

A candidate should pass structural validation such as:

```text
decoded value is an object
AND
course object exists
AND
course.lessons is plausibly structured
```

Additional non-destructive checks may be added as evidence accumulates.

## Failure behavior

If SmartAudit detects a Rise-like package but cannot locate a supported payload:

```text
Unsupported Rise package layout
```

It must not:

- return an empty course;
- claim that the course has no blocks;
- proceed into audit logic;
- silently skip the unknown structure.

---

# 8. Phase 1B — Preserve the Raw Rise Model

The decoded authored payload is evidence.

SmartAudit should preserve it before normalization.

Normalization must not destroy information required to investigate future block types or packaging changes.

For normalized entities, retain provenance wherever practical.

Example:

```js
{
  id: "abc123",
  kind: "labeledGraphic",
  source: {
    path: "course.lessons[2].items[5]",
    identity: "interactive-fullscreen/interactive/labeledgraphic",
    raw: { ... }
  }
}
```

The raw object may eventually be stored separately to reduce duplication, but the relationship between normalized data and original source must remain recoverable.

---

# 9. Phase 1C — Corpus Census

SmartAudit must not use a manually guessed list of Rise block types as its definition of completeness.

The existing `KNOWN_BLOCK_IDENTITIES` contains identities observed in prior sample data. 

Those identities are a **seed dataset**, not the Rise specification.

## Census process

For each validation course, enumerate:

```text
lesson types
block family/type/variant combinations
block-level fields
item-level fields
nested item structures
media structures
assessment structures
interaction structures
unknown structures
```

At minimum, record:

```js
{
  identity: "interactive/interactive/accordion",
  occurrences: 14,
  courses: [...],
  blockFields: [...],
  itemFields: [...],
  nestedStructures: [...]
}
```

## Corpus report

The tool or test harness should be capable of producing something similar to:

```text
Identity                                         Count   Courses
───────────────────────────────────────────────────────────────
text/text/paragraph                                87       5
text/text/heading                                  32       5
interactive/interactive/accordion                  14       3
interactive-fullscreen/interactive/process          6       2
...
```

Unknown identities must remain visible.

---

# 10. Block Support States

Binary `known / unknown` classification is insufficient.

Each observed block identity should have one of three support states.

## SUPPORTED

SmartAudit understands the block well enough to expose all known meaningful authored information.

```text
Identity recognized
Meaningful fields classified
Nested structures understood
Assets represented
Reviewer representation exists
No unexplained meaningful properties remain
```

## PARTIALLY_SUPPORTED

SmartAudit recognizes the block and preserves it, but one or more meaningful authored properties have not yet been fully represented.

Example:

```text
Process block recognized
Step title represented
Step description represented
Image represented
Unknown nested property still present
──────────────────────────
PARTIALLY_SUPPORTED
```

## UNKNOWN

SmartAudit does not understand the block structure well enough to provide a meaningful reviewer representation.

The raw block must still be preserved and surfaced.

---

# 11. Field Classification

A field must not disappear merely because it looks like metadata.

Observed properties should be classified into one of four groups:

```text
1. Reviewer-facing content
2. Reviewer-useful structure/metadata
3. Implementation/presentation metadata
4. Unknown
```

Examples of reviewer-facing content:

```text
heading
paragraph
title
description
caption
alt
feedback
answer text
```

Examples of potentially reviewer-useful structure:

```text
destination
marker x/y position
marker icon
stored item order
goTo
nextSlide
character/emotion configuration
```

Examples that may prove to be implementation-only:

```text
createdAt
updatedAt
duplicatedFromId
temporary editor state
```

Classification should preferably occur **per block family**, not through one global ignore list.

The current dumper contains a global set of ignored fields that includes properties such as `x`, `y`, `icon`, `goTo`, `nextSlide`, `emotion`, and `position`; some of those may be meaningful to a reviewer depending on the interaction. 

---

# 12. Ordering Semantics

Array position should be preserved.

Example:

```js
{
  sourceIndex: 0
}
```

However, SmartAudit must not give that position accessibility semantics without proof.

For example:

```text
GOOD:
Stored marker sequence: 3

NOT YET JUSTIFIED:
Keyboard focus order: 3
```

For labeled graphics, SmartAudit should expose:

- stored marker sequence;
- marker ID;
- visible marker/icon value where known;
- x/y visual position;
- title;
- description;
- relevant media.

Whether stored sequence equals keyboard traversal order requires separate runtime validation.

The same caution applies independently to:

- tabs;
- accordions;
- process blocks;
- timeline blocks;
- scenarios;
- knowledge checks;
- other interactive components.

---

# 13. Normalized Course Model

The normalized model exists to provide a stable interface for the reviewer and later Phase 2 audit rules.

It should not attempt to erase Rise-specific meaning prematurely.

A possible top-level contract:

```js
{
  format: "rise",

  package: {
    type: "xapi",
    contentRoot: "scormcontent/",
    metadata: { ... }
  },

  extraction: {
    strategy: "runtime-data-jsonp",
    sourcePath: "scormcontent/runtime-data.js"
  },

  course: {
    id: "...",
    title: "...",
    description: "...",
    cover: { ... },
    lessons: [...]
  },

  census: { ... },

  completeness: { ... }
}
```

A normalized block might resemble:

```js
{
  id: "...",

  identity: {
    family: "interactive-fullscreen",
    type: "interactive",
    variant: "labeledgraphic",
    raw: "interactive-fullscreen/interactive/labeledgraphic"
  },

  support: "supported",

  sourceIndex: 4,

  content: { ... },

  source: {
    path: "course.lessons[2].items[4]",
    raw: { ... }
  }
}
```

This is illustrative, not a frozen schema.

The important requirements are:

- stable identifiers;
- block identity;
- source order;
- support state;
- meaningful normalized content;
- raw provenance.

---

# 14. Assets

Asset handling must be included in completeness.

An image appearing in raw Rise data but not in SmartAudit's reviewer cannot be treated as successful extraction.

The current project already contains browser-side asset resolution logic that maps ZIP assets to local blob URLs. 

Phase 1 should preserve and refactor that useful behavior as necessary.

For every referenced asset, track:

```text
reference found
local asset resolved
remote fallback available
missing/unresolved
```

Example:

```js
{
  type: "image",
  sourcePath: "...media.image",
  localKey: "...",
  resolution: "local",
  displayUrl: "...",
  alt: "..."
}
```

Unresolved assets must appear in completeness results.

---

# 15. Reviewer Requirements

The Course Reviewer is not a learner-player clone.

Its interface should optimize for inspection.

## Course level

Show:

- title;
- description;
- export/package type if known;
- payload extraction strategy;
- lesson count;
- block count;
- asset summary;
- support/completeness summary.

## Lesson level

Show:

- lesson/section title;
- lesson type;
- source order;
- contained blocks.

Sections must remain visible as sections rather than being mistaken for empty lessons.

## Block level

Show:

- block identity;
- understandable human label;
- support status;
- authored sequence;
- meaningful content;
- meaningful metadata;
- media/assets;
- unresolved properties where applicable.

## Particularly useful reviewer information

Examples include:

### Images

- actual image;
- alt text;
- caption;
- source/reference information.

### Labeled Graphic

- base image;
- base-image alt text;
- every marker;
- stored sequence;
- marker icon/number where known;
- marker coordinates;
- marker title;
- marker description.

### Knowledge Check

- question;
- response type;
- answer choices;
- which answers are configured as correct;
- choice feedback;
- general correct/incorrect feedback;
- relevant media.

### Scenario

- character configuration;
- background;
- dialogue/content;
- choices;
- response relationships;
- branching metadata when understood;
- authored sequence.

### Buttons and links

- displayed text;
- destination;
- target metadata where available.

---

# 16. Completeness Model

Completeness must be measurable.

At minimum, Phase 1 should reconcile:

```text
Raw lessons
vs.
Normalized lessons

Raw blocks
vs.
Normalized/preserved blocks

Observed block identities
vs.
Classified support identities

Raw meaningful fields
vs.
represented/classified fields

Referenced assets
vs.
resolved/explained assets
```

## Example completeness object

```js
{
  lessons: {
    raw: 12,
    represented: 12
  },

  blocks: {
    raw: 87,
    represented: 87
  },

  support: {
    supported: 82,
    partial: 5,
    unknown: 0
  },

  fields: {
    meaningfulObserved: 341,
    classified: 341,
    unexplained: 0
  },

  assets: {
    referenced: 31,
    resolved: 31,
    unexplained: 0
  }
}
```

## Important distinction

These numbers answer different questions.

```text
represented blocks = raw blocks
```

does **not** necessarily mean:

```text
all blocks supported
```

An unknown block can be preserved successfully.

Therefore Phase 1 should report both:

```text
preservation completeness
```

and:

```text
understanding/support completeness
```

That distinction prevents unknown data from disappearing while also preventing SmartAudit from overstating its understanding.

---

# 17. Completeness Gate

A course may pass **preservation completeness** when:

```text
every lesson is retained
every block is retained
all unknown structures retain raw provenance
all referenced assets are resolved or explicitly reported
no data is silently dropped
```

A course may pass **full reviewer support** when, additionally:

```text
unknown block identities = 0
unexplained PARTIALLY_SUPPORTED content = 0
unclassified meaningful properties = 0
unexplained asset failures = 0
```

The exact numerical thresholds may evolve as the census system is implemented.

The fundamental rule does not:

> **Unknown information must produce an explicit incomplete/unsupported state, never apparent success.**

---

# 18. Validation Corpus

Phase 1 should use multiple real Rise exports.

The corpus should eventually include examples covering:

- locale JSONP packaging;
- `runtime-data.js` packaging;
- embedded-index packaging;
- current unified LMS package structure;
- at least one Web export if available;
- more than one LMS export type;
- simple courses;
- interaction-heavy courses;
- media-heavy courses.

The corpus should deliberately seek block coverage including:

```text
text
lists
images
gallery/image variants
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
all current knowledge-check types
other currently available Rise blocks discovered during census
```

This list describes **authoring categories to seek**, not assumed `family/type/variant` values.

Actual identities must come from exported data.

---

# 19. Testing Strategy

The current test harness works, but extraction integration coverage has not yet been established. 

Phase 1 tests should move outward from the payload boundary.

## Payload strategy tests

```text
locale JSONP fixture
→ candidate detected
→ decoded
→ plausible Rise course returned

runtime-data JSONP fixture
→ candidate detected
→ decoded
→ plausible Rise course returned

embedded-index fixture
→ candidate detected
→ decoded
→ plausible Rise course returned
```

## Failure tests

```text
non-Rise ZIP
→ rejected clearly

Rise-like package with unsupported payload
→ unsupported package error

malformed Base64
→ extraction error

valid Base64 but wrong JSON structure
→ candidate rejected
```

## Census tests

Known fixture:

```text
expected identities observed
expected field sets observed
unknown identity remains visible
```

## Completeness tests

```text
raw block count == preserved block count
raw lesson count == preserved lesson count
unexplained meaningful fields == expected
unresolved assets == expected
```

Tests should use extracted/sanitized fixture data where practical rather than unnecessarily committing large proprietary course ZIPs.

---

# 20. Runtime Validation Research Task

One small research task remains from the architecture review.

For at least one current Rise labeled graphic, compare:

```text
A. raw items[] sequence
B. rendered DOM order
C. actual Tab / Shift+Tab focus order
```

Do not block general Phase 1 extraction development on this experiment.

Until verified, the reviewer should label `items[]` position only as:

```text
Stored sequence
Authored sequence
Source order
```

not:

```text
Keyboard order
```

Other interaction families should not inherit the labeled-graphic result automatically.

---

# 21. Documentation Changes Required

Several current SmartAudit documents contain assumptions that were reasonable during earlier investigation but are no longer supported.

## `CLAUDE.md`

Update statements asserting:

```text
SmartAudit is specifically an xAPI parser
all course content lives in locales/und.js
```

The current file still makes both claims. 

Replace them with the package/payload architecture in this specification.

Keep:

- Phase 0 status;
- sequencing constraint;
- workspace commands;
- reference-only warning for oldref;
- useful confirmed field observations.

## `docs/rise-extraction.md`

This document currently states that the entire course exclusively resides in `und.js` and presents that location as the extraction architecture. 

Recast it as either:

```text
Rise Export Anatomy
```

or:

```text
Rise Extraction Research Notes
```

with multiple payload strategies.

Do not delete the verified `und.js` observations; make them one documented strategy rather than the universal model.

## `docs/RESTART-BRIEF.md`

Preserve its historical explanation and sequencing rule, but update the active Phase 1 plan to reference this specification.

---

# 22. Work That Should Be Preserved From the Current Implementation

The restart does not require discarding everything.

Current code already contains potentially useful work for:

- ZIP handling;
- locale JSONP extraction;
- human-readable inventory generation;
- raw unknown-block preservation;
- image resolution;
- labeled-graphic inspection;
- flashcards;
- knowledge checks;
- scenarios;
- reviewer rendering;
- unknown-field reporting.

The current dumper already preserves unknown blocks and their raw content rather than silently omitting them. 

That behavior should survive the refactor.

However:

> Existing code is evidence and prototype implementation, not proof that any Rise format or block family is completely supported.

Every retained component must eventually pass the new census/completeness model.

---

# 23. Phase 1 Work Sequence

## Phase 1A — Generalize intake

Implement:

```text
ZIP loading
package detection
content-root discovery
payload candidate discovery
payload-source metadata
```

No normalization changes unless required.

## Phase 1B — Multiple payload strategies

Support:

```text
locale JSONP
runtime-data JSONP
embedded index payload
```

All strategies should produce the same raw Rise payload contract.

## Phase 1C — Census and provenance

Implement:

```text
identity enumeration
field enumeration
nested-structure enumeration
source paths
raw preservation
corpus-level census reporting
```

## Phase 1D — Normalization and support classification

Build/refactor normalized representations only from observed evidence.

Assign:

```text
SUPPORTED
PARTIALLY_SUPPORTED
UNKNOWN
```

## Phase 1E — Course Reviewer

Refactor the existing reviewer around the normalized/support-aware model.

Optimize for review, not visual fidelity to Rise.

## Phase 1F — Completeness Gate

Implement reconciliation metrics and tests.

Only after representative courses pass the intended support threshold should Phase 2 audit/check development begin.

---

# 24. First Implementation Slice

Do **not** give Claude/Cursor the entire Phase 1 scope as one coding task.

The first implementation task should be:

> **Generalize SmartAudit's extraction boundary so it can discover Rise course payloads instead of assuming `und.js`, while preserving current locale-JSONP behavior. Add census output that reports every encountered lesson and block identity. Do not change or add audit/check logic.**

## Deliverables

### 1. Payload-source interface

Something conceptually equivalent to:

```js
locateRisePayload(zip)
```

returning:

```js
{
  strategy,
  path,
  wrapper,
  raw
}
```

### 2. Decoder boundary

Something conceptually equivalent to:

```js
decodeRisePayload(source)
```

returning the raw parsed Rise object.

### 3. Locale strategy moved behind this boundary

The existing `und.js` implementation should become one strategy rather than the entire extractor.

### 4. `runtime-data.js` strategy

Support the observed:

```js
__jsonp("runtime-data.js", "<base64>")
```

form.

### 5. Unsupported-layout error

No empty-course fallback.

### 6. Initial census

After decoding, produce at minimum:

```js
{
  lessons: ...,
  blocks: ...,
  identities: {
    "text/text/paragraph": 7,
    ...
  }
}
```

### 7. Integration tests

At least:

```text
locale payload fixture passes
runtime-data payload fixture passes
unsupported payload fails loudly
```

### 8. No audit changes

Do not modify `issues.js` or begin `audit.js` except where required to keep the application compiling.

---

# 25. First-Slice Definition of Done

The first implementation slice is complete when two Rise fixtures using different verified payload-packaging strategies can both run through:

```text
ZIP
↓
payload discovery
↓
payload decode
↓
course structural validation
↓
census
```

and produce:

```text
payload strategy used
payload source path
lesson count
block count
complete list of encountered block identities
```

while an unsupported structure fails clearly.

It is **not** necessary at this point for the reviewer to understand every block returned by those courses.

That is what the census is for.

---

# 26. Phase Boundary

Phase 1 ends when SmartAudit can make this statement truthfully for its supported corpus:

> **SmartAudit preserved every course structure it encountered, represented every meaningful authored property it claims to support, resolved or explained every referenced asset, and explicitly reported everything it did not understand.**

Only then begin:

# Phase 2 — Smart Audit

Phase 2 can use the trusted normalized model for deterministic findings such as:

- missing or questionable alt text;
- heading structure;
- knowledge-check configuration;
- link quality;
- feedback completeness;
- instructional-design review;
- writing/readability analysis;
- other author-fixable QA findings.

Audit rules should consume the normalized model.

They should never need to know whether the original course payload came from:

```text
und.js
runtime-data.js
index.html
xAPI
SCORM
cmi5
Web
```

That separation is the architectural boundary Phase 1 exists to establish.