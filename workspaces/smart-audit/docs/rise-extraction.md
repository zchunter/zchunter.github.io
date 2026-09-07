# Rise xAPI Export — Client-Side Data Extraction

## Why No Server Is Needed

A Rise xAPI/Tin Can export is a `.zip` file. Inside that zip, at `lib/locales/und.js`, is a single file containing the entire course data in this format:

```
__resolveJsonp("course:und","<base64 encoded string>")
```

That base64 string decodes to a single large JSON object containing every lesson, every block, every text field, every image reference, and every alt text value for the entire course. No server, no authentication, no network calls required.

The `mondrian/`, `sandbox/`, and `rise/` subdirectories contain hashed webpack bundles that look like they might hold course content — they do not. They contain the Rise player application code and component renderers. Course data is exclusively in `und.js`. The webpack bundles are the same across all exports of the same Rise version.

---

## Extraction Pipeline

Five steps, all native browser APIs plus JSZip:

```javascript
// 1. Unzip (JSZip — runs entirely in browser memory)
const zip = await JSZip.loadAsync(file);

// 2. Read the file
const raw = await zip.file('lib/locales/und.js').async('string');

// 3. Strip the JSONP wrapper
const match = raw.match(/^__resolveJsonp\("[^"]+","([\s\S]+)"\)\s*;?\s*$/);

// 4. Decode base64
const decoded = atob(match[1]);

// 5. Parse JSON
const courseData = JSON.parse(decoded);
```

`courseData.course.lessons` contains the full course structure — sections, lessons, blocks, and all content.

### Implementation Notes

- `und.js` path is `lib/locales/und.js` — add a fallback search for `f.name.endsWith('/und.js')` in case path depth varies across export versions
- The JSONP key (`"course:und"`) should not be hardcoded — match any string in that position
- `toStr(val)` guard required before any `.replace()` call — some fields that appear to be HTML strings are occasionally objects or null
- Block `items` can be zero-length — always guard with `?? []`

---

## Supporting Metadata

Two additional plaintext files in the zip root require no special handling:

- `tc-config.js` — course ID and title, readable via simple regex
- `tincan.xml` — activity ID and launch info, readable as XML

---

## JSON Structure

| Content | Path |
|---|---|
| Lessons and sections | `course.lessons[]` |
| Blocks | `course.lessons[n].items[]` |
| Block sub-items | `course.lessons[n].items[n].items[]` |
| Image alt text | `...media.image.alt` |
| Scenario character alt | `...slides[n].alt` |
| Scenario response alt | `...slides[n].responses[n].alt` |
| Block background image | `block.media.image` (not in items) |
| Course logo | `course.media.image` |
| Cover image | `course.coverImage.media.image` |

---

## Known Block Types

All confirmed present in a real export. Block identity is `family/type/variant`.

```
text/text/heading
text/text/heading paragraph
text/text/subheading
text/text/subheading paragraph
text/text/paragraph
list/list/bulleted
image/image/hero
image/image/text aside
impact/text/d
interactive/interactive/accordion
interactive/interactive/tabs
interactive-fullscreen/interactive/labeledgraphic
interactive-fullscreen/interactive/process
interactive-fullscreen/interactive/timeline
interactive-fullscreen/interactive/scenario
flashcard/interactive/flashcard
knowledgeCheck/knowledgeCheck/multiple choice
buttons/interactive/button
buttons/interactive/button stack
continue/divider/continue
divider/divider/divider
```

Content is always in `block.items[]` except:
- `interactive-fullscreen` blocks carry their background image at `block.media.image`
- `labeledgraphic` background image is at `block.media.image`, markers are in `block.items[]`

---

## Alt Text Locations

Alt text requires walking multiple paths:

| Location | Path | Notes |
|---|---|---|
| Standard image blocks | `block.items[n].media.image.alt` | |
| Labeled graphic background | `block.media.image.alt` | |
| Course logo | `course.media.image` | No alt field — needs manual review flag |
| Cover image | `course.coverImage.media.image.alt` | Can be `""` or `"\"\""` |
| Scenario character images | `slides[n].alt` | |
| Scenario response images | `slides[n].responses[n].alt` | |

Empty alt is stored as `""` or the escaped form `"\"\""`. Both should be treated as missing.

---

## Validated Audit Checks

The following were validated against a real course designed to surface issues:

### Errors
- Image missing or empty alt text
- Button with empty or missing destination URL
- Button destination missing protocol (`www.` without `https://`)
- Broken link in paragraph/description HTML (`href` with same protocol issues)
- Knowledge check with no correct answer marked
- Knowledge check missing `feedbackCorrect` or `feedbackIncorrect`
- Empty heading block

### Warnings
- Lesson title exceeds 80 characters
- Inline `font-size` style overrides in content HTML
- Knowledge check answer missing per-choice feedback (when `feedbackType === "CHOICE"`)
- Empty paragraph, list item, or interactive description
- Section with no lessons beneath it
- Orphaned heading: `heading` field has content on a paragraph-variant block (data present but not rendered in Rise)

### Manual Review
- Any image where alt text path does not exist in the data model

### Assessment Feedback Logic

`feedbackType` on knowledge checks is either:
- `"CHOICE"` — per-answer feedback; audit logic checks each answer option
- `"GENERAL"` — correct/incorrect feedback; audit logic checks `feedbackCorrect` and `feedbackIncorrect`

---

## Checks Enabled vs. Still Requiring Rendering

| Check | Possible from und.js | Notes |
|---|---|---|
| Alt text | Yes | All paths documented above |
| Heading structure, empty headings | Yes | |
| Inclusive language | Yes | All text accessible |
| Reading level, sentence length, passive voice | Yes | All text accessible |
| Links, button URLs, broken link detection | Yes | |
| Assessments (feedback, correct answers) | Yes | |
| Course length, lesson count, content distribution | Yes | |
| Navigation / menu structure | Yes | Lessons array |
| Course title, description, export format | Yes | `tc-config.js` + `tincan.xml` |
| File size | Yes | Analyzable from ZIP |
| Color contrast | No | Needs computed CSS from Rise player |
| Keyboard navigation | No | Needs live DOM |
| ARIA labels | No | Defined in player code, not course data |
| Mobile responsiveness | No | Needs rendering |

---

## Privacy

All extraction is client-side. The course file never leaves the user's machine. This matters for enterprise adoption — Rise courses frequently contain proprietary content that organizations will not upload to third-party servers.
