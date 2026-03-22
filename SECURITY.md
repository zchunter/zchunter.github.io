# Security Notes

## Scope

This repository publishes a static Astro site plus a narrow Netlify serverless boundary for xAPI telemetry.

Active production code:

- `src/`
- `netlify/functions/`

Local-only workspace material that is intentionally excluded from the published site:

- `workspaces/`
- ignored prototype files under `src/ui/`, `src/types/`, and the related toggle styles

## Data Handling

- The XLIFF tool processes uploaded files in the browser.
- The telemetry endpoint only receives aggregate counts such as `replacementsChecked` and `totalReplacements`.
- Uploaded XLIFF contents, replacement strings, and generated output files are not sent to the telemetry endpoint.
- LRS credentials are read from Netlify environment variables and never exposed to client code.

## Implemented Controls

- The site is built as static output.
- The Netlify telemetry function only accepts `POST` and `OPTIONS`.
- The telemetry function enforces an origin allowlist for the production site and localhost development origins.
- The telemetry function validates numeric payload fields before sending xAPI statements upstream.

## Dependency Risk

As of 2026-03-22, `npm audit` reports unresolved advisories in Astro's transitive `h3` dependency chain. There is no upstream fix available in the currently-resolved tree.

Current impact assessment:

- The published site is static, which reduces exposure compared with a long-running Astro server.
- The remaining risk is mostly in the development/build dependency chain until upstream packages publish a fix.

Practical follow-up:

- Keep Astro and `@astrojs/tailwind` updated.
- Re-run `npm audit` after Astro dependency updates.
- Treat any future move from static hosting to server rendering as a trigger for a fresh security review.
