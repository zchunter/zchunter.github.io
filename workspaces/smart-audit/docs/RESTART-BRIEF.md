# SmartAudit v2 — Restart Brief

**Written:** 3 September 2026
**Revised:** 3 September 2026 — corrected after a verification pass caught four errors in the first draft (§2.2 README ambiguity, §2.3 a destructive worktree instruction, a missing ESM/Jest blocker now at §2.5, and an unexamined dirty working tree now at §2.6).
**Purpose:** Single briefing document for resuming SmartAudit development. Read this before touching code.
**Status of facts below:** every path, line number, and library figure was verified against the repo on 3 Sep 2026. Re-verify before trusting anything older than a few months.

---

## 1. Sequencing constraint — the rule that governs everything else

> **No check logic until the extraction completeness gate passes on both sample courses.**
>
> v1 failed by building checks on incomplete extraction. Tests went red, and the fixes were applied at the check layer instead of the extraction layer — bandaids on a broken foundation. `oldref/docs/CHECKS.md` claims 11 checks "Fully Implemented & Tested" against an extractor that could not see the whole course; those green tests were measuring nothing.
>
> **If a check is failing, suspect extraction first.**

This is a constraint, not history. `CLAUDE.md`'s "Planned next work" mentions `src/audit.js`, which reads as an invitation to start writing checks. It is not. The gate in §3 comes first.

Copy this rule into `workspaces/smart-audit/CLAUDE.md` so it is loaded in every session.

---

## 2. Known debt

Current as of 3 Sep 2026. Delete entries as they are resolved.

### 2.1 `index.html` does not import from `src/` — it duplicates it

| Symbol | Defined in | And again in |
|---|---|---|
| `toStr` | `src/extract.js:72` | `index.html` (inline script) |
| `isEmptyAlt` | `src/extract.js:79` | `index.html` (inline script) |
| `KNOWN_ICON_LABELS` | `src/dump.js:241` | `index.html:561` |

`index.html` lines 220–1254 are one inline `<script>` with **no `type="module"`**. Consequence: `tests/extract.test.js` tests `src/`, but the artifact you actually run is `index.html`. Fixing a bug in `src/dump.js` does not fix the tool.

**Cause:** opening via `file://` blocks ES module imports (CORS). Code was inlined to make it work.

**Fix:** serve over local HTTP, switch to `<script type="module">`, import from `src/`. `index.html` becomes a thin shell of markup plus event wiring. This preserves the "no build step" rule — a dev server is not a build — and costs nothing later, since the Astro page will be served over HTTP anyway.

`serve-workspace.cjs` already exists at `workspaces/smart-audit-oldref/workspace/tooling/serve-workspace.cjs`. Port it rather than writing a new one.

### 2.2 The test suite cannot run

- `workspaces/smart-audit/README.md:27` documents `npm run test:smart-audit`. That script does not exist; the real name is `smart-audit:test` (reversed).
- **Root `README.md:44`** separately advertises `npm run smart-audit:workspace` as the way to start the local workspace. That script is also broken (see below). Two different docs point users at two different broken commands — fix both.
- `smart-audit:test` resolves to `workspaces/smart-audit/jest.config.cjs`, **which does not exist**. Running it produces: `Error: Can't find a root directory while resolving a config file path.`
- `smart-audit:workspace` points to `workspaces/smart-audit/workspace/tooling/serve-workspace.cjs` — a v1 path. The file only exists under `smart-audit-oldref/`.
- Root `jest.config.cjs` sets `testPathIgnorePatterns: ["/workspaces/"]`, so the default `npm test` excludes SmartAudit by design.

These are v1 leftovers, not decay — test wiring simply hasn't been reached yet. But they must be fixed **before** porting anything, because "pull things over in chunks" requires a working harness. Without it, chunk-porting drifts back into building on unverified ground.

### 2.3 Dangling doc references

`workspaces/smart-audit/README.md` references `docs/rise-extraction.md` and `docs/CHECKS.md`. Neither exists under `workspaces/smart-audit/docs/`. Both are stranded in an abandoned git worktree — **which contains three files, not two**:

```
.claude/worktrees/great-golick-92e3ea/docs/CHECKS.md          (8,757 bytes / 174 lines)
.claude/worktrees/great-golick-92e3ea/docs/rise-extraction.md (6,664 bytes / 180 lines)
.claude/worktrees/great-golick-92e3ea/docs/repo-map.md        (3,805 bytes)  ← DO NOT DISCARD
```

**⚠️ The worktree `repo-map.md` is newer than the root copy, not a stale duplicate.** Root `docs/repo-map.md` is 3,600 bytes; the worktree copy adds a line the root version lacks:

```
- `workspaces/smart-audit-oldref/` for the prior implementation (reference only — do not import)
```

…and describes the workspace as "SmartAudit **v2**" where root says only "SmartAudit". Deleting the worktree without merging this first destroys the better copy.

A stale copy of `CHECKS.md` also sits in `workspaces/smart-audit-oldref/archive/ref/legacy-2026-03-12/docs/`.

### Separately: root `docs/CHECKS.md` has an uncommitted deletion

`git status` shows ` D docs/CHECKS.md` — a root-level copy that exists in HEAD but is deleted in the working tree, unstaged. The last commit touching it was `3f33c5c` ("remove SmartAudit link, fix broken links in README"), which suggests it was removed deliberately while pulling SmartAudit out of the public site.

Recover it with `git show HEAD:docs/CHECKS.md` before deciding anything. **Understand why it was deleted before restoring another copy** — you may be re-introducing a file that was intentionally retired, in which case the worktree copy belongs in `workspaces/smart-audit/docs/` and the root deletion should simply be committed.

**Action (revised):**

1. Diff worktree `repo-map.md` against root `docs/repo-map.md`; merge the newer content into root
2. Move `CHECKS.md` and `rise-extraction.md` into `workspaces/smart-audit/docs/`
3. Resolve the root `docs/CHECKS.md` deletion deliberately — commit it or restore it, don't leave it dangling
4. **Only then** delete the worktree

Treat the recovered `CHECKS.md` as a **menu of candidates, not a backlog** — see §5.

### 2.4 Current file sizes

| File | Lines |
|---|---|
| `index.html` | 1,256 |
| `src/dump.js` | 475 |
| `src/extract.js` | 81 |
| `tests/extract.test.js` | 24 |

`index.html` is where bloat re-forms. Watch it.

### 2.5 A Jest config file alone will not make the tests pass

Creating `workspaces/smart-audit/jest.config.cjs` is necessary but **not sufficient**. The blocker:

- root `package.json` sets `"type": "module"`
- `tests/extract.test.js` and `src/*.js` use ESM `import` / `export`
- a minimal config still fails with `SyntaxError: Cannot use import statement outside a module`
- `babel-jest` does **not** pick up the root `babel.config.cjs` automatically once `rootDir` is `workspaces/smart-audit`

The new config needs an explicit `transform` pointing at the root Babel preset, or `rootMode: "upward"` so Babel walks up to find `babel.config.cjs`. Not difficult, but scope Phase 0 step 2 as "make ESM tests actually execute," not "create a file."

Note also that root `babel.config.cjs` currently shows as modified (` M`) in `git status` — check what changed there before relying on it.

### 2.6 The working tree is dirty and there is no clean checkpoint

`git status` shows **12 modified files** plus:

- ` D docs/CHECKS.md` — unstaged deletion (see §2.3)
- `?? CLAUDE.md` — **root `CLAUDE.md` is untracked and has never been committed**
- `?? .claude/` — untracked, and contains the worktree holding the only copy of three docs

Phase 0 modifies `index.html` (1,256 lines) — the highest-risk change in the plan — and right now there is nothing clean to revert to if it goes wrong.

**Commit or stash the existing work before starting Phase 0.** At minimum, commit root `CLAUDE.md`; losing it would cost more than any code in this workspace.

### 2.6a ⚠️ `workspaces/` IS GITIGNORED — none of SmartAudit is under version control

`.gitignore` line 34:

```
# Local-only workspaces and prototype artifacts
workspaces/
```

**Nothing in `workspaces/` is tracked by git.** Not `src/extract.js`, not `src/dump.js`, not `index.html`, not this brief, not the samples, not oldref.

This makes the checkpoint advice above **insufficient on its own**. `git commit` or `git stash` protects the 12 modified root files; it gives SmartAudit zero protection. Rewriting 1,256 lines of `index.html` in Phase 0 step 5 currently has **no version-control safety net at all** — a bad edit is unrecoverable.

**Tracking is not publishing.** `.github/workflows/deploy.yml` runs `withastro/action@v3`, which builds the Astro project and uploads only the build output. Astro generates routes from `src/pages/`; `workspaces/` is not a source directory and produces no routes. Committing SmartAudit makes it *browsable in the repo* — it does not put it on zchunter.github.io. Publishing happens deliberately at Phase 4.

**Resolution — Option 1.** Replace the `workspaces/` line with:

```gitignore
# Local-only workspaces — track the active SmartAudit source only
workspaces/*
!workspaces/smart-audit/
```

Note the mechanics: `workspaces/` with a trailing slash cannot be negated, because git never descends into an excluded directory. Excluding the *contents* with `workspaces/*` is what makes `!workspaces/smart-audit/` work. This fails silently if done wrong — verify with `git status` that SmartAudit files now appear.

`workspaces/samples/` (72 MB of real course exports), `workspaces/fixtures/`, and `workspaces/smart-audit-oldref/` stay ignored. Those contain actual course content and the repo is public.

Before flipping this, confirm `workspaces/smart-audit/` still holds only `CLAUDE.md`, `README.md`, `docs/`, `index.html`, `src/`, and `tests/` — no course data, no fixtures.

**Extraction happens at Phase 4, not now.** `docs/repo-map.md`'s extraction threshold will be met once SmartAudit has its own dependency stack (vendored retext, §6) and produces deployable output. Splitting it out now would also require giving it its own `package.json` and devDependencies, since its Jest setup currently borrows the root `babel.config.cjs` — that is §2.5's problem, and it would make Phase 0 larger. Track in place now; extract when there is a v1 to publish. History carries over.

### 2.7 ⚠️ `smart-audit-oldref/README.md` claims to be the ACTIVE workspace

The reference directory contains a README that says the opposite of the truth. Opening lines of `workspaces/smart-audit-oldref/README.md`:

> "This folder is the active restart point for SmartAudit."
> "`workspace/app/` is the active local parser sandbox."
> "The active parser now targets a normalized bundle, not a rebuilt learner UI."

That file was accurate when the directory *was* `workspaces/smart-audit/`. The rename to `-oldref` never updated it. Any session that reads it is told the reference folder is live code.

**This is also the origin of both broken npm scripts.** The same README documents:

- `npm run smart-audit:workspace` → `workspaces/smart-audit/workspace/tooling/serve-workspace.cjs`
- "archived SmartAudit Jest work uses `workspaces/smart-audit/jest.config.cjs`"
- "check documentation remains … under `workspaces/smart-audit/archive/ref/legacy-2026-03-12/docs/`"

All three paths were correct pre-rename and point into the wrong directory now. The scripts in `package.json` were never updated to follow the rename.

### 2.7a No guard exists inside the reference directory

Where the active/reference distinction is currently recorded:

| Location | States it correctly? |
|---|---|
| Root `CLAUDE.md` | ✅ — but **untracked**, one `git clean` from gone |
| `workspaces/smart-audit/CLAUDE.md` | ✅ |
| `workspaces/smart-audit/README.md` | ✅ |
| Worktree `docs/repo-map.md` | ✅ — but slated for deletion (§2.3) |
| Root `docs/repo-map.md` | ❌ silent — no mention of oldref |
| `workspaces/smart-audit-oldref/README.md` | ❌ **actively asserts the opposite** |
| A `CLAUDE.md` inside oldref | ❌ does not exist |

Every correct marker is either untracked, about to be deleted, or outside the directory it describes. Phase 0 step 4 reads files *from* oldref — that's precisely when the wrong signal is most likely to be acted on.

**Fix, in Phase 0:**

1. Create `workspaces/smart-audit-oldref/CLAUDE.md` containing a single unambiguous guard. Claude Code loads nested `CLAUDE.md` files during traversal, so this is the most reliable mechanism available:

   > **REFERENCE ONLY — DO NOT IMPORT, DO NOT EDIT.** This is the pre-restart SmartAudit implementation, kept to consult while porting logic in chunks. The active workspace is `workspaces/smart-audit/`. This directory's own `README.md` is stale and incorrectly describes this folder as active; ignore its claims about what is current.

2. Rewrite the header of `workspaces/smart-audit-oldref/README.md` so it identifies itself as the prior implementation, and correct or strike its three stale paths.

3. Merge the oldref line from the worktree `repo-map.md` into root `docs/repo-map.md` (§2.3).

4. Commit root `CLAUDE.md`.

---

## 3. Extraction completeness gate

The v1 failure was not knowing whether extraction saw the whole course. `buildUnknownsReport()` is the right seed, but it only catches **unknown block identities**. It will not catch:

- a known block whose text fields were never walked
- an image reference that never resolved to a blob URL
- a nested `items[]` the recursion stopped short of

### Metrics to emit

Run against both samples in `workspaces/samples/`:

- `big-course-tool-checker-xapi-tweLjOIK.zip` (16.3 MB, already extracted alongside)
- `course.zip` (55.5 MB)

| Metric | Pass condition |
|---|---|
| Blocks in raw JSON vs. blocks emitted into dump | Equal |
| Unknown block identities | 0 on known-good samples |
| Images referenced vs. images resolved to blob URL | Equal, or every gap explained |
| Text fields present in raw but absent from dump | 0 |
| Lessons with `type: 'section'` | Counted separately; empty `items[]` is correct by design, not a gap |

Emit these as a report object and assert on them in Jest. **This is the first real test and the gate for all check work.** When these reconcile on both samples, checks are unblocked. Until then, they are not.

### Expected non-gaps

Do not let the gate flag these as failures — they are correct behaviour documented in `CLAUDE.md`:

- `lesson.type === 'section'` has a `.title` and no `.items[]`
- Flashcard front/back images and scenario characters have **no alt field in the Rise data model** — absence is not a defect
- Labeled-graphic marker icons are opaque indices into Rise's bundled icon library; there is no file in the ZIP to resolve

---

## 4. Definition of done for a check

Every check in `src/audit.js` must:

1. Be a **pure function over the dump model** — no ZIP access, no DOM, no network
2. Have a **Jest test against a real fixture** extracted from one of the sample courses
3. Return findings in a **single shape**:

```js
{
  severity: 'Action Needed' | 'Consider Revising' | 'Information',
  checkId:  'missing-alt-text',
  lessonId: '...',
  blockId:  '...',
  itemPath: 'items[2].answers[0]',   // enough to locate it in the course
  message:  'Human-readable, reviewer-facing.'
}
```

Severity vocabulary is carried over from v1's `CHECKS.md` — keep it for continuity.

4. **Never know what format the course came from.** Checks consume the normalized dump model only. This is the seam that lets v3 add SCORM/Common Cartridge adapters without touching a single check.

Write this contract into `CLAUDE.md` before check #1, or check #7 will be shaped differently from check #1 and you will refactor instead of build.

---

## 5. Check triage — what to build, what to cut

v1's `CHECKS.md` specifies roughly 40 checks. They are not one kind of thing, and treating them as one list is what sank v1. Sort every candidate into one of three buckets:

### Bucket A — Data-model checks ✅ BUILD THESE

Answerable from the extracted JSON alone. Deterministic, cheap, testable. **This is ~80% of the real value.**

### Bucket B — Network checks ⚠️ CUT OR ISOLATE

"Broken Links" (marked *Action Needed* in v1's spec) is **not implementable client-side**. CORS blocks cross-origin requests from the browser; from `file://` essentially all of them fail. You can validate link *format* and *text quality*, not liveness.

Liveness would need a proxy via `netlify/functions/` — possible, but it breaks the "nothing leaves your machine" story that is the tool's best feature. Cut, or ship as a clearly-labelled optional online mode.

### Bucket C — Rendered-DOM checks ❌ CUT

Color contrast, keyboard navigation, ARIA labels, focus indicators, screen-reader compatibility, mobile responsiveness. These need the rendered Rise player.

Cut them for a better reason than difficulty: **in Rise, the player owns all of it.** Contrast comes from the theme; focus and ARIA come from Articulate's components. Your reviewer cannot fix any of it. You would ship checks reporting identical unactionable findings on every course.

This also retires the axe-core dependency — the data-model approach genuinely does not need it.

### Suggested first wave (native, no dependencies)

Ship these six before adding any library:

| # | Check | Severity | Source in dump |
|---|---|---|---|
| 1 | Missing alt text | Action Needed | All paths in `CLAUDE.md` alt-text table |
| 2 | Generic alt text (`"image"`, `"picture"`, filename-like) | Consider Revising | Same paths |
| 3 | Empty image slot | Consider Revising | `imageSlotEmpty` — already flagged by dump, promote to check |
| 4 | Knowledge check: no correct answer / too few options | Action Needed | `item.answers[]` |
| 5 | Link text quality (`"click here"`, bare URLs) | Consider Revising | `item.destination` |
| 6 | Heading structure (empty, duplicate, order) | Consider Revising | `text/text/heading`, `subheading` identities |

**Two mandatory test cases**, both from `CLAUDE.md`'s known patterns:

- A labeled-graphic block with short alt text followed by an accordion providing long-form description **must not be flagged**. This is a correct accessibility pattern.
- Flashcard front/back images and scenario characters must report as **"unverifiable — manual review"**, not "missing alt." Rise stores no alt field for them; flagging them as failures produces noise on every course.

### Second wave (library-backed)

Only after the check framework shape is proven by the first wave:

| Check | Library |
|---|---|
| Sentence length | `retext-readability` or native |
| Passive voice | `retext-passive` |
| Reading level | `retext-readability` |
| Inclusive language | `alex` |
| Jargon / simpler alternatives | `retext-simplify` |

---

## 6. Libraries worth adopting

All figures verified via the GitHub API on **3 September 2026**.

| Library | Stars | Last commit | License | Covers |
|---|---|---|---|---|
| [`get-alex/alex`](https://github.com/get-alex/alex) | 5,098 | 2024-11-27 | MIT | Inclusive language (used in v1) |
| [`retextjs/retext`](https://github.com/retextjs/retext) | 2,437 | 2025-02-04 | MIT | The pipeline itself |
| [`retextjs/retext-equality`](https://github.com/retextjs/retext-equality) | 162 | 2024-05-30 | MIT | Engine underneath Alex |
| [`retextjs/retext-readability`](https://github.com/retextjs/retext-readability) | 101 | 2023-09-11 | MIT | Reading level, multi-formula |
| [`retextjs/retext-simplify`](https://github.com/retextjs/retext-simplify) | 98 | 2023-09-10 | MIT | Jargon / simpler alternatives |
| [`retextjs/retext-passive`](https://github.com/retextjs/retext-passive) | 17 | 2023-09-08 | MIT | Passive voice |
| [`btford/write-good`](https://github.com/btford/write-good) | 5,088 | 2025-03-10 | MIT | General prose linting |
| [`Stuk/jszip`](https://github.com/Stuk/jszip) | 10,379 | 2025-03-28 | **Dual MIT / GPLv3** | Already in use |

**The win:** retext plugins compose into one pipeline. Four language checks become one `retext()` processor with four plugins, instead of four bespoke implementations.

**On the low star counts:** `retext-passive` at 17 stars with zero open issues is *finished*, not abandoned — a small focused plugin in a maintained ecosystem. Judge staleness by scope. A 200-line plugin with no open issues is done; a 30-issue application untouched since 2020 is dead.

### Three caveats

1. **They consume plain text; the dump is structured blocks.** A text-extraction pass must walk the course model, pull the text fields enumerated in `CLAUDE.md` (`heading`, `paragraph`, `description`, `title`, `label`, `caption`, `completeHint`, `date`), and carry provenance so each finding maps back to lesson + block + item path. This integration is the real work — small, but do not let planning skip it.
2. **Browser delivery vs. the no-build-step rule.** These are ESM npm packages. Under Jest they install normally. For the browser, either import from `https://esm.sh/retext` — which adds a network dependency that undercuts the offline/privacy story — or vendor into `workspaces/smart-audit/vendor/`. **Vendor.** Alex and `retext-equality` carry sizable word lists; check the weight before committing.
3. **JSZip is dual-licensed MIT or GPLv3.** Take the MIT option explicitly and record that choice, rather than leaving it ambiguous.

### Do not adopt

- **axe-core** (MPL-2.0) — rendered DOM only, and the findings are not actionable for Rise authors. See §5 Bucket C.
- **Any link-checking library** — CORS makes liveness checking impossible client-side. See §5 Bucket B.
- **pa11y** (LGPL-3.0) — same rendered-DOM problem, plus a license that complicates bundling.

---

## 7. Phased plan

### Phase 0 — Reconciliation *(do first, one session)*

**Step 0 — establish a real checkpoint.** In order:

1. Commit or stash the 12 modified root files, and **commit root `CLAUDE.md`** — currently untracked (§2.6)
2. Apply the §2.6a gitignore change so `workspaces/smart-audit/` is tracked, then commit it. Git protects none of SmartAudit today; step 6 rewrites 1,256 lines with no undo otherwise
3. Work on a branch: `git switch -c phase-0-reconciliation`

Commit after each numbered step below with a plain message. Eight small commits make it possible to see exactly what broke; one large commit does not. If the branch goes wrong, `git switch main` and `git branch -D phase-0-reconciliation` discards the attempt cleanly.

Do not proceed until `git status` confirms SmartAudit files are actually being tracked.

1. Add the §1 sequencing constraint and a "Known debt" section to `workspaces/smart-audit/CLAUDE.md`; add a pointer to this brief from `CLAUDE.md` and `workspaces/smart-audit/README.md` so it isn't orphaned the way `CHECKS.md` was
2. **Flag the reference directory before anything reads from it** (§2.7a): create `workspaces/smart-audit-oldref/CLAUDE.md` with the guard text, rewrite that folder's stale README header, and merge the oldref line into root `docs/repo-map.md`
3. Make the ESM test suite **execute** — create `workspaces/smart-audit/jest.config.cjs` with an explicit `transform` or `rootMode: "upward"` (§2.5), and fix the `smart-audit:test` / `test:smart-audit` mismatch in `workspaces/smart-audit/README.md:27`
4. Resolve the docs per §2.3's revised four-step action — **merge `repo-map.md` before deleting the worktree**
5. Port `serve-workspace.cjs` from oldref, and fix root `README.md:44` which advertises the broken `smart-audit:workspace`
6. Collapse `index.html` onto `src/` via `<script type="module">`
7. Get the existing tests green

**Exit criteria:** `npm run smart-audit:test` executes and passes, `index.html` contains no duplicated logic, both READMEs document commands that work, and the worktree is gone with no content lost.

### Phase 1 — Completeness gate

Build §3 as the first real test. Run against both samples.

**Exit criteria:** all gate metrics reconcile on both courses. **This unblocks check work.**

### Phase 2 — First-wave checks

`src/audit.js` with the six native checks from §5, each with a fixture test, all conforming to the §4 contract.

**Exit criteria:** six checks green, including the two mandatory non-flagging cases.

### Phase 3 — Reviewer-facing report

Turn findings into something a reviewer acts on: grouped by lesson, sorted by severity, with enough location detail to find the item in Rise. Export to HTML or print-friendly.

This is the phase where domain expertise shows and where the portfolio value actually lives. Budget real time for it — it is not a wrapper around a JSON dump.

### Phase 4 — Publish

Move to an Astro route under `src/pages/tools/`. Per `docs/repo-map.md`, this is the point where the extraction threshold should be re-examined: if SmartAudit gains its own lockfile, CI, or release cadence, split it into its own repository.

### Phase 5 — Generalize beyond Rise *(v3, do not start early)*

Add format adapters behind the existing course model:

```
intake      zip → in-memory file tree, detect format
   ↓
adapters    Rise | SCORM | Common Cartridge → normalized course model
   ↓
checks      consume the model only, format-agnostic (§4 rule 4)
   ↓
report      renderers consuming findings
```

Reference implementations, all verified 3 Sep 2026:

| Repo | Stars | Last commit | License | Use |
|---|---|---|---|---|
| [`instructure/common-cartridge-viewer`](https://github.com/instructure/common-cartridge-viewer) | 93 | 2026-06-08 | MIT | Lift its IMSCC manifest-parsing into an **adapter**. MIT permits copying source with attribution — do not fork the repo; its CRA/webpack-4 toolchain is legacy debt (its own README still requires `NODE_OPTIONS=--openssl-legacy-provider`). |
| [`jcputney/scorm-again`](https://github.com/jcputney/scorm-again) | 343 | 2026-09-01 | MIT | Actively maintained SCORM runtime. Reference for manifest semantics; build on it rather than competing. |
| [`adlnet/CATAPULT`](https://github.com/adlnet/CATAPULT) | 56 | 2026-01-20 | Apache-2.0 | cmi5 conformance reference, if cmi5 support is ever wanted. |

**Scope warning:** SCORM 2004 sequencing (the `imsss` namespace) is among the worst-specified areas in e-learning. Ship SCORM 1.2 + Common Cartridge first and defer 2004 sequencing explicitly.

---

## 8. Session-start habit

**Start by executing, not by reading.** Docs drift; commands do not. The broken test scripts in §2.2 would have surfaced in ten seconds by running the documented command.

Opening move for a new Claude Code session:

> Read `workspaces/smart-audit/CLAUDE.md`, `README.md`, and `docs/RESTART-BRIEF.md`, then verify every factual claim against the actual repo before changing any code. Run the documented test command, check that every path referenced in `package.json` scripts exists, and confirm whether `index.html` imports from `src/` or duplicates it. Report discrepancies as a list. Do not fix anything yet.
