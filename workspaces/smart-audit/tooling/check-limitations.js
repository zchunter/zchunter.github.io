/**
 * Maintainer script: compare Articulate's Rise accessibility maturity plan
 * with the stored snapshot and with src/report/limitations-data.js.
 *
 *   npm run smart-audit:limitations                 compare, print differences
 *   npm run smart-audit:limitations -- --update     also rewrite the snapshot
 *   npm run smart-audit:limitations -- --file page.html   use a saved page, no network
 *
 * Exit code: 0 nothing differs, 1 something differs (or the data file no
 * longer matches the page), 2 the page could not be fetched or understood.
 *
 * Run by hand, roughly monthly. It is deliberately outside the shipped tool:
 * the tool must never touch the network. After reviewing a difference, edit
 * limitations-data.js (asOf, checkedOn and the entries) and run with --update.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { RISE_LIMITATIONS } from '../src/report/limitations-data.js';
import { parseGaps, parsePageDate, toSnapshot, diffGaps, compareWithRegistry } from './limitations-source.js';

const here = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(here, 'snapshots', 'rise-maturity-plan.json');
const args = process.argv.slice(2);
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const update = args.includes('--update');

const fail = (message) => {
  console.error(`\nCould not complete the check: ${message}`);
  process.exit(2);
};

async function loadHtml() {
  if (fileArg) return readFileSync(resolve(fileArg), 'utf8');
  const response = await fetch(RISE_LIMITATIONS.sourceUrl, { headers: { 'user-agent': 'smartaudit-maintainer-check' } });
  if (!response.ok) fail(`the page returned HTTP ${response.status}`);
  return response.text();
}

const html = await loadHtml().catch((e) => fail(`could not fetch the page (${e.message})`));
const document = new JSDOM(html).window.document;
const pageDate = parsePageDate(document);
const gaps = parseGaps(document);

if (gaps.length === 0) fail('no gap rows were found. The page layout has probably changed; update parseGaps() before trusting any result.');
if (!pageDate) fail('the "Last updated" date was not found. The page layout has probably changed.');

console.log(`Source: ${RISE_LIMITATIONS.sourceUrl}`);
console.log(`Page last updated: ${pageDate}  (registry asOf: ${RISE_LIMITATIONS.asOf}, checkedOn: ${RISE_LIMITATIONS.checkedOn})`);
console.log(`Gaps on the page: ${gaps.length}\n`);

let differs = false;

if (existsSync(SNAPSHOT_PATH)) {
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  const diff = diffGaps(snapshot, gaps, pageDate);
  const paired = new Set(diff.pairs.flatMap((p) => [p.added, p.removed]));

  if (diff.dateChanged) console.log(`The page date changed: ${snapshot.asOf} -> ${pageDate}`);
  for (const { gap, what } of diff.changed) console.log(`CHANGED   "${gap.description}"\n          ${what.join('; ')}`);
  for (const { added, removed } of diff.pairs) console.log(`REWORDED? "${added.description}"\n          (a gap with the same criterion ${removed.sc.join(', ')} disappeared; check whether this is the same gap)`);
  for (const g of diff.added) if (!paired.has(g)) console.log(`ADDED     "${g.description}"  [WCAG ${g.sc.join(', ')}, ${g.status}]`);
  for (const g of diff.removed) if (!paired.has(g)) console.log(`REMOVED   a gap with WCAG ${g.sc.join(', ')} (${g.status}) is no longer on the page. It may have been fixed; check the Resolved section.`);

  differs = diff.dateChanged || diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0;
  if (!differs) console.log('Nothing changed since the stored snapshot.');
} else {
  console.log('No snapshot exists yet; run with --update to create one.');
  differs = true;
}

const problems = compareWithRegistry(RISE_LIMITATIONS, gaps);
if (problems.length) {
  differs = true;
  console.log('\nThe data file (src/report/limitations-data.js) does not match the page:');
  for (const p of problems) console.log(`  - ${p}`);
}

if (update) {
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(toSnapshot(gaps, pageDate, today), null, 2)}\n`);
  console.log(`\nSnapshot written to ${SNAPSHOT_PATH}.`);
  console.log('Now update asOf and checkedOn in src/report/limitations-data.js to match, so the report shows the right dates.');
} else if (differs) {
  console.log('\nReview the differences, edit src/report/limitations-data.js, then re-run with --update to accept them.');
}

process.exit(differs ? 1 : 0);
