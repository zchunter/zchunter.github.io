# Claude Code — Repo Context

## What this repo is

`zchunter.github.io` — Zach Hunter's portfolio site, built with Astro 5, Tailwind CSS, and DaisyUI. Deployed to GitHub Pages (static) and Netlify (for serverless functions). Also contains local-only workspace code that is not published.

## Key directories

| Directory | Purpose |
|---|---|
| `src/pages/` | Published Astro routes |
| `src/components/` | Shared Astro components |
| `src/layouts/` | Page shells |
| `src/styles/` | Shared styles |
| `public/` | Static assets copied as-is |
| `netlify/functions/` | Deployed serverless endpoints |
| `workspaces/smart-audit/` | **Active** SmartAudit v2 local workspace (not published) |
| `workspaces/smart-audit-oldref/` | Prior implementation — reference only, do not import |
| `workspaces/samples/` | Sample Rise xAPI ZIP inputs for local testing |
| `workspaces/fixtures/` | Extracted course data and test fixtures |
| `docs/` | Repo-level documentation |

## Active project

**SmartAudit** — a browser-based QA tool for Articulate Rise xAPI exports. See `workspaces/smart-audit/CLAUDE.md` for full context before touching any SmartAudit files.

## Placement rules

- Files for the public site → `src/` or `public/`
- Local-only work → `workspaces/`
- Never wire workspace code into `src/pages/` or the Astro build

## Tech stack

- **Site**: Astro 5, Tailwind CSS, DaisyUI, TypeScript
- **SmartAudit workspace**: Vanilla JS, JSZip (CDN), Jest for tests — no build step
- **Deploy**: GitHub Pages (static), Netlify (functions)
