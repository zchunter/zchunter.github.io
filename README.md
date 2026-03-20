# Zach Hunter - Technical Tools

This repository currently publishes one live tool for Articulate Rise content operations.

## Live Tool

### [Rise Global Text Update](src/pages/tools/xliff-swapper.astro)

A deterministic rename and text-governance workflow for Articulate Rise exports. It was designed for high-volume rename cycles and also supports routine one-off text updates that are tedious and error-prone in manual review.

This tool was built by me, based on a Python script and manual workflow developed by [Scott Stewart](https://www.linkedin.com/in/scottwstewart/). I expanded that original approach into a browser-based tool with broader replacement support and reporting.

- Finds and replaces exact strings in exported XLIFF files
- Supports CSV import to apply many known rename pairs in one pass
- Updates course text and image alt text that can be slow to review manually
- Handles both high-volume rename campaigns and small single-word updates
- Exports replacement counts and report output for QA verification
- Preserves XML integrity with proper escaping and source-to-target conversion
- Includes targeted regression tests for CSV parsing, XML transformation, and xAPI payload validation

## Shared Dependencies

- **Astro** - MIT License - Static site generator and build tool
- **Vite** - MIT License - Frontend build tool and development server

## Privacy

The live tool in this repository:

- Processes files entirely in your browser
- Does not send your file content to external servers
- Works offline once loaded
- Collects minimal anonymous usage metrics via xAPI for replacement activity

## Testing

Run targeted regression tests for the live tool and xAPI function with `npm run test:xliff-regression`.

Coverage includes:

- CSV parsing (quoted commas and escaped quotes)
- XML transformation behavior (including no-op when replacement list is empty)
- Netlify xAPI endpoint method and payload validation paths
