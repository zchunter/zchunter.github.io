/**
 * Helpers for the HTML fragments Rise stores in text fields (paragraphs,
 * headings, descriptions, captions...).
 *
 * Parsing uses DOMParser, which builds an inert document: scripts do not run
 * and images are not fetched. It is a parser, not a renderer. It is available
 * in browsers and in the Jest jsdom environment. Where it is missing, helpers
 * that need real parsing throw, so a check fails loudly (and is reported as
 * NOT CHECKED by the runner) rather than silently finding nothing.
 */

import { stripHtml } from '../html.js';

const NBSP = / /g;

export function parseHtml(html) {
  if (typeof DOMParser === 'undefined') {
    throw new Error('HTML parsing is not available in this environment (DOMParser is missing).');
  }
  return new DOMParser().parseFromString(String(html ?? ''), 'text/html');
}

const squash = (s) => String(s).replace(NBSP, ' ').replace(/\s+/g, ' ').trim();

/** Visible text of an HTML fragment, whitespace collapsed. Falls back to a tag-stripper if there is no DOMParser. */
export function htmlToText(html) {
  if (html === undefined || html === null) return '';
  if (typeof DOMParser === 'undefined') return squash(stripHtml(html));
  return squash(parseHtml(html).body.textContent ?? '');
}

/**
 * The name assistive technology would announce for a link: aria-label, else
 * its content (with image alt text standing in for images), else its title.
 */
export function accessibleLinkName(anchor) {
  const label = anchor.getAttribute('aria-label');
  if (label && squash(label)) return squash(label);

  const fromContent = (node) => {
    let out = '';
    for (const child of node.childNodes) {
      if (child.nodeType === 3) out += child.data;
      else if (child.nodeType === 1) {
        if (child.tagName === 'IMG') out += ` ${child.getAttribute('alt') ?? ''} `;
        else if (child.getAttribute('aria-hidden') !== 'true') out += fromContent(child);
      }
    }
    return out;
  };
  const text = squash(fromContent(anchor));
  if (text) return text;

  return squash(anchor.getAttribute('title') ?? '');
}

/** Every link with an href in an HTML fragment: { href, name }. */
export function linksIn(html) {
  if (typeof html !== 'string' || !/<a[\s>]/i.test(html)) return [];
  return [...parseHtml(html).querySelectorAll('a[href]')].map((a) => ({
    href: (a.getAttribute('href') ?? '').trim(),
    name: accessibleLinkName(a),
  }));
}

/** Every literal h1-h6 element in an HTML fragment, in order: { level, text }. */
export function headingsIn(html) {
  if (typeof html !== 'string' || !/<h[1-6][\s>]/i.test(html)) return [];
  return [...parseHtml(html).querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
    level: Number(h.tagName[1]),
    text: squash(h.textContent ?? ''),
  }));
}

/**
 * Every string directly on an object (and in arrays and sub-objects), except
 * under .items, which the course walker visits as separate items. Yields
 * { value, path } with paths like "paragraph" or "answers[1].title".
 */
export function* ownStrings(owner, path = '') {
  if (typeof owner === 'string') {
    yield { value: owner, path };
  } else if (Array.isArray(owner)) {
    for (let i = 0; i < owner.length; i++) yield* ownStrings(owner[i], `${path}[${i}]`);
  } else if (owner && typeof owner === 'object') {
    for (const key of Object.keys(owner)) {
      if (key === 'items') continue;
      yield* ownStrings(owner[key], path ? `${path}.${key}` : key);
    }
  }
}
