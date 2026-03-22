# Zach Hunter Site and Tools

This repository publishes the `zchunter.github.io` Astro site and its active browser-based content operations tool.

## Active Site Areas

- The public site lives in `src/` and is built as a static Astro site.
- The live tool is [Rise Global Text Update](src/pages/tools/xliff-swapper.astro).
- Netlify serverless code is limited to `netlify/functions/` for xAPI telemetry forwarding.
- `workspaces/` contains local-only workspace material, including SmartAudit and non-public fixtures. It is not part of the published site.

The concrete file-placement plan for future growth lives in [docs/repo-map.md](docs/repo-map.md).

## Live Tool

### [Rise Global Text Update](src/pages/tools/xliff-swapper.astro)

A deterministic rename and text-governance workflow for Articulate Rise exports. It supports both large rename campaigns and smaller one-off text updates that are tedious to verify manually.

This tool was built from a Python script and manual workflow originally developed by [Scott Stewart](https://www.linkedin.com/in/scottwstewart/), then expanded into a browser-based workflow with reporting and telemetry.

- Finds and replaces exact strings in exported XLIFF files
- Supports CSV import for bulk replacement pairs
- Updates course text and image alt text without uploading course files to a server
- Exports replacement counts and report output for QA verification
- Preserves XML integrity with escaping and source-to-target conversion

## Security and Privacy

- XLIFF processing happens entirely in the browser
- The site does not send uploaded file contents to the telemetry endpoint
- The Netlify xAPI function only accepts aggregate counts, not source text or file payloads
- LRS credentials stay server-side in Netlify environment variables
- The telemetry function only accepts requests from the production site origin and approved localhost origins for development

Additional notes live in [SECURITY.md](SECURITY.md).

## Development

- `npm run dev` starts the Astro dev server
- `npm run build` builds the static site
- `npm run check` runs Astro checks
- `npm test` runs the XLIFF and xAPI regression tests
- `npm run smart-audit:workspace` starts the local SmartAudit workspace in `workspaces/smart-audit/`

CI runs `npm test`, `npm run build`, and `npm run check` on pushes and pull requests.
