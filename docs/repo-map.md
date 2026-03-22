# Repo Map

This document defines where files should live as the portfolio, tools, and local workspaces grow.

## Current Intent

This repository has two different concerns:

- published site code for `zchunter.github.io`
- local-only workspace code that supports experiments or in-progress tooling

Those concerns can coexist for now, but they should not share the same directories or entry points.

## Source Of Truth By Area

### Published Site

Use these directories for anything that ships to the public site:

- `src/pages/` for public routes
- `src/components/` for shared Astro components used by public routes
- `src/layouts/` for public page shells
- `src/styles/` for shared site styling used by public routes
- `src/assets/` for images, video, and static media imported by site code
- `public/` for public static files that should be copied as-is
- `netlify/functions/` for deployed serverless endpoints

### Local-Only Workspace

Use these directories for work that is intentionally not published:

- `workspaces/smart-audit/` for the active SmartAudit local workspace
- `workspaces/samples/` for local sample inputs or reference payloads
- `workspaces/fixtures/` for local test data, extracted courses, and other non-public fixtures

### Generated Output

These should remain generated and disposable:

- `dist/`
- `coverage/`
- `reports/`
- `.astro/`

## Placement Rules

### New Site Pages

- New public portfolio pages belong in `src/pages/`
- Public case studies belong in `src/pages/case-studies/`
- Public tools belong in `src/pages/tools/`

If a page is not meant to publish, it should not live under `src/pages/`.

### Tool Logic

- Shared browser-side tool logic belongs in `src/scripts/` only if it supports a published route
- Shared site-safe utilities belong in `src/utils/`
- Tool-specific fixtures that are not meant for production should stay outside `src/`

### Experimental UI

- Do not place prototype UI code under `src/pages/`
- Do not add new local-only prototype code under `src/ui/` or `src/types/`
- If an experiment is local-only, put it inside `workspaces/`

### Documentation

- Root `README.md` stays high-level and repository-wide
- `SECURITY.md` stays focused on active security boundaries and residual risk
- `docs/` holds cross-cutting repo documentation such as architecture notes and this repo map
- Workspace-specific notes stay with the workspace, such as `workspaces/smart-audit/README.md`

## Growth Plan

Use this structure as the repo expands:

- `src/pages/` for published routes only
- `src/components/`, `src/layouts/`, `src/styles/`, `src/assets/` for shared published-site code
- `netlify/functions/` for deployed backend surface
- `docs/` for repo-level documentation
- `workspaces/` for local SmartAudit development and non-public fixtures until they are large enough to justify separate repos

## Extraction Threshold

`workspaces/smart-audit/` should become its own repository if one or more of these become true:

- it gains its own dependency stack or lockfile
- it needs its own CI pipeline
- it starts producing deployable output
- its release cadence diverges from the portfolio site
- its docs become larger than a small workspace README

Until then, it stays local-only and should not be wired into `src/pages/` or the public build.

## Quick Decision Guide

When adding a file, use this rule:

- If it will publish on `zchunter.github.io`, it belongs under the site directories
- If it only supports local exploration or a future project, it belongs in a local workspace
- If it is generated, it should not be treated as source
