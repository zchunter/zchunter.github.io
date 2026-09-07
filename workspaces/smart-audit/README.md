# SmartAudit v2

Browser-based quality audit tool for Articulate Rise xAPI exports.

## Status

Active development. Replaces `workspaces/smart-audit-oldref/`, which was built on an incorrect assumption that Rise course content required server-side rendering to access. See `docs/rise-extraction.md` for the corrected architecture.

## Architecture

Course data is extracted entirely client-side from the uploaded ZIP file. No bundler and no rendering pass — just a local static server so the browser will load the ES modules.

- `src/extract.js` — parses `locales/und.js` (or `lib/locales/und.js`) from the ZIP into a structured course object
- `src/dump.js` — produces a complete human-readable inventory of extracted course content for verification
- `src/images.js` — turns ZIP `assets/` into blob URLs for the renderer (browser only)
- `src/issues.js` — the v1 verification pass (not the audit-check module; see `docs/RESTART-BRIEF.md` §1)
- `src/render.js`, `src/html.js` — HTML rendering for `index.html`
- `tests/` — Jest test suite

## References

- `docs/rise-extraction.md` — extraction pipeline, JSON structure, known block types, alt text paths
- `docs/CHECKS.md` — full audit check specification
- `workspaces/smart-audit-oldref/` — prior implementation (reference only, do not import)

## Development

```bash
# Run tests
npm run smart-audit:test

# Serve the workspace, then open http://localhost:4179/ and drop a Rise xAPI ZIP
npm run smart-audit:workspace
```
