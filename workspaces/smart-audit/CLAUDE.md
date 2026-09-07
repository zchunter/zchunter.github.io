# SmartAudit — Session Context

A browser-based QA tool for Articulate Rise xAPI exports. No build step. Runs
entirely client-side — nothing leaves the machine. Served over local HTTP during
development (`npm run smart-audit:test`'s sibling `npm run smart-audit:workspace`);
a dev server is not a build step.

## Sequencing constraint — read before writing any code

> **No check logic until the extraction completeness gate passes on both sample
> courses.**
>
> v1 failed by building checks on incomplete extraction. Tests went red, and the
> fixes were applied at the check layer instead of the extraction layer — bandaids
> on a broken foundation. The recovered `docs/CHECKS.md` claims 11 checks "Fully
> Implemented & Tested" against an extractor that could not see the whole course;
> those green tests were measuring nothing.
>
> **If a check is failing, suspect extraction first.**

This is a constraint, not history. "Planned next work" below mentions `src/audit.js`,
which reads as an invitation to start writing checks. It is not. The completeness
gate (see `docs/RESTART-BRIEF.md` §3) comes first. Treat `docs/CHECKS.md` as a
**menu of candidates, not a backlog**.

### Definition of done for a check (once unblocked)

Every check in `src/audit.js` must:

1. Be a **pure function over the dump model** — no ZIP access, no DOM, no network.
2. Have a **Jest test against a real fixture** extracted from a sample course.
3. Return findings in a single shape:
   `{ severity: 'Action Needed' | 'Consider Revising' | 'Information', checkId,
   lessonId, blockId, itemPath, message }`.
4. **Never know what format the course came from** — checks consume the normalized
   dump model only. This is the seam that lets later versions add SCORM / Common
   Cartridge adapters without touching a single check.

## Known debt

Current as of 5 Sep 2026. Delete entries as they are resolved. Full detail in
`docs/RESTART-BRIEF.md` §2.

- **`index.html` duplicated `src/` instead of importing it.** Resolved in Phase 0:
  `index.html` is now a thin shell that loads `src/*.js` as ES modules over local
  HTTP. Do not re-inline logic into `index.html` — it is where bloat re-forms.
- **Test suite could not run.** Resolved in Phase 0: `workspaces/smart-audit/jest.config.cjs`
  now exists; the runnable script is `npm run smart-audit:test`.
- **Dangling doc references.** Resolved in Phase 0: `docs/CHECKS.md` and
  `docs/rise-extraction.md` recovered into `workspaces/smart-audit/docs/`.
- **`serve-workspace.cjs`** ported from `smart-audit-oldref` to
  `workspaces/smart-audit/tooling/serve-workspace.cjs`.

## File layout

```
workspaces/smart-audit/
├── index.html          # Thin shell: markup + <script type="module"> that wires src/*.js
├── src/
│   ├── extract.js      # ZIP extraction pipeline; exports extractCourse(), toStr(), isEmptyAlt()
│   ├── dump.js         # Full course inventory builder; exports dumpCourse(), buildUnknownsReport()
│   ├── images.js       # Browser-only: ZIP assets → blob URLs; attachDisplayUrls(dump)
│   ├── issues.js       # v1 verification pass (NOT src/audit.js — see sequencing constraint)
│   ├── render.js       # dump + issues → HTML string for index.html
│   └── html.js         # esc() / stripHtml() shared helpers
├── tests/
│   └── extract.test.js # Jest unit tests (toStr, isEmptyAlt; integration test stubbed)
├── tooling/
│   └── serve-workspace.cjs  # Local static server (npm run smart-audit:workspace)
├── docs/
│   ├── RESTART-BRIEF.md     # Read first when resuming
│   ├── CHECKS.md            # v1 check spec — a menu of candidates, not a backlog
│   └── rise-extraction.md   # Extraction pipeline / JSON structure reference
├── jest.config.cjs     # babel-jest transform for ESM; npm run smart-audit:test
└── CLAUDE.md           # This file
```

`workspaces/samples/` — sample Rise xAPI ZIPs for local testing (not committed if large)
`workspaces/fixtures/` — extracted course data, test payloads

## Architecture in one paragraph

A Rise xAPI export is a ZIP file. All course content lives in `locales/und.js` (or `lib/locales/und.js` in older exports) as a base64-encoded JSONP string. JSZip extracts it client-side; `atob()` + `JSON.parse()` decode it. No bundler, no rendering pass, no Electron needed — just a local static server so the browser will load `src/*.js` as ES modules. The webpack bundles (`mondrian/`, `sandbox/`, `rise/`) are the Rise player code — they look like course data but are not.

## Rise ZIP structure

```
locales/und.js          ← ALL course data (try this path first)
lib/locales/und.js      ← older exports
tc-config.js            ← course ID and title (global variable syntax, not JSON)
tincan.xml              ← xAPI activity ID
assets/                 ← all images, named by hash
```

### und.js format

```js
__resolveJsonp("some-key","<base64-encoded-JSON>") ;
```

Regex: `/^__resolveJsonp\("[^"]+","([\s\S]+)"\)\s*;?\s*$/`
Decode: `JSON.parse(atob(match[1]))`

### tc-config.js format

Uses bare global variable assignments — NOT object properties, NOT JSON:
```js
TC_COURSE_ID = "some-id"
TC_COURSE_NAME = { "en-US": "Course Title" }
```

Regexes:
```js
/TC_COURSE_ID\s*=\s*["']([^"']+)["']/
/TC_COURSE_NAME\s*=\s*\{[^}]*"en-US"\s*:\s*"([^"]+)"/
```

## courseData JSON structure

```
courseData.course
├── .id, .title, .description
├── .coverImage.media.image    ← course cover image
├── .media.image               ← course logo
└── .lessons[]
    ├── .id, .title
    ├── .type                  ← 'blocks' | 'section'
    └── .items[]               ← blocks (empty for type:'section' — this is by design)
        ├── .family, .type, .variant   ← identity = "family/type/variant"
        ├── .media.image               ← block-level background image
        └── .items[]                   ← item rows within the block
            ├── text fields: heading, paragraph, description, title, label, caption, completeHint, date
            │   (NOT body, text, html — those don't exist in Rise)
            ├── .media.image           ← item-level image
            ├── .destination           ← button/link URL
            ├── .answers[]             ← knowledge check answers
            │   └── .title             ← answer text (NOT .text — field is 'title')
            ├── .front / .back         ← flashcard faces
            ├── .slides[]              ← scenario slides
            └── .items[]              ← sub-items (accordion panels, tabs, etc.)
```

## Image resolution

Images are stored in the ZIP under `assets/<hash>.<ext>`. The JSON record has:
- `image.key` — always present
- `image.crushedKey` — present when a compressed version exists
- `image.useCrushedKey` — boolean; **true** → use `crushedKey` for the local filename, **false** → use `key`

```js
const localKey    = image.useCrushedKey ? image.crushedKey : image.key;
const rawFilename = localKey ? localKey.split('/').pop() : null;
// crushedKey is sometimes percent-encoded ("SSML%20Play%20Prompt.jpg") while the
// actual file in assets/ uses literal spaces — always decodeURIComponent before lookup.
let localFilename = rawFilename;
try { localFilename = decodeURIComponent(rawFilename); } catch {}
// Look up blob URL in imageMap (keyed by both bare filename and full assets/ path)
```

`image.originalUrl` is a CDN URL (not in the ZIP); use it as last-resort display fallback only.

## Lesson type: 'section'

`lesson.type === 'section'` is a Rise section-divider row. It has a `.title` but no `.items[]` — this is correct by design. Render it as a styled divider, not an expandable lesson block.

## Block identity format

`"${block.family}/${block.type}/${block.variant}"` — e.g. `"image/image/hero"`, `"knowledgeCheck/knowledgeCheck/multiple choice"`

## Known block identities (as of last update)

```
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

Any identity not in this set is flagged `unknown: true` and stored with `rawBlock` for feedback.

## Alt text paths (all known locations)

| Location | Path |
|---|---|
| Course cover image | `course.coverImage.media.image.alt` |
| Course logo | `course.media.image.alt` |
| Block background image | `block.media.image.alt` |
| Item image | `item.media.image.alt` |
| Flashcard front image | `item.front.media.image` — **no alt field in data model** |
| Flashcard back image | `item.back.media.image` — **no alt field in data model** |
| Scenario character | `item.character.src` — **no alt field in data model** |
| Scenario background | `item.background.media.image.alt` |
| Scenario slide character alt | `slide.alt` |
| Scenario slide response alt | `slide.responses[n].alt` |

`isEmptyAlt(val)` treats `null`, `''`, and `'""'` all as missing.

## Known content patterns

### Labeled graphic marker icons
Each marker item has an `icon` field containing a numeric string (`"17"`, `"18"`, `"19"`, …). These are opaque indices into Rise's built-in icon library, which is bundled with the Rise player — not stored as files in the course ZIP. **There is no image file to display for marker icons.**

**Confirmed codes** (verified against a 5-marker labeled graphic in a real export):
| Icon code | Display label |
|---|---|
| 17 | 1 |
| 18 | 2 |
| 19 | 3 |
| 20 | 4 |
| 21 | 5 |

Codes beyond 21 likely continue the numbered sequence (22 = 6, etc.) but are **unverified** — do not assume.

**TODO:** Identify icon codes for arrows, pins, and other non-numbered marker styles. When a course is encountered that uses these, capture the raw icon code and add it to `KNOWN_ICON_LABELS` in both `index.html` and `src/dump.js`.

The dump uses `sequence` (1-based array index, always valid) as the primary label, `iconLabel` (confirmed display label or `null`) as secondary, and shows `icon` (raw code) in the renderer with a `(?)` warning when the code is unrecognised. The `x`/`y` position (percentage from top-left) lets a reviewer verify reading order without opening the course.

### Labeled graphic + accordion as long-form alt text
A common Rise accessibility pattern: a `interactive-fullscreen/interactive/labeledgraphic` block with a short alt text like "Screenshot of X. A more detailed description follows." paired with an `interactive/interactive/accordion` block immediately below it — the accordion provides the structured long-form text alternative promised by the alt text. **This is intentional and correct, not a bug.** Do not flag the accordion as redundant or the alt text as insufficient.

### Empty image slot (imageSlotEmpty)
Accordion and tab panel items always have a `media` field in the Rise JSON, even when no image was placed (stored as `{}`). When `media` is present but `media.image` is absent, the dump sets `imageSlotEmpty: true` on the item and the Issues list raises a `warn`. This is important because:
- Panels inside accordions and tabs require navigating into the interaction to check, so they're easy to overlook during a manual course scan
- A designer may have intended to add an image and forgotten, or may have left the slot intentionally empty
- The warn nudges the reviewer to make a conscious decision rather than leaving it unexamined

## Current status

Phase 0 (reconciliation) complete — see `docs/RESTART-BRIEF.md` §7.

- `index.html` — thin shell; loads `src/*.js` as ES modules over local HTTP. No duplicated logic.
- `src/extract.js` — extraction pipeline complete; `extractCourse()` also returns the `zip` handle
- `src/dump.js` — full structured dump + unknowns aggregation complete
- `src/images.js` / `src/issues.js` / `src/render.js` / `src/html.js` — extracted from the old inline script
- `jest.config.cjs` + `npm run smart-audit:test` — runnable; existing helper tests pass
- `tests/extract.test.js` — unit tests for helpers; integration test still stubbed (needs fixture ZIP)

## Planned next work

Next: **Phase 1 — extraction completeness gate** (`docs/RESTART-BRIEF.md` §3). Build the
gate metrics as the first real Jest test and run them against both sample courses.
No check work (`src/audit.js`) until that gate reconciles on both — see the
sequencing constraint at the top of this file.
