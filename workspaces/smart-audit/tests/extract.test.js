/**
 * Extraction pipeline tests.
 * These run against fixture data — add real course fixtures to workspaces/fixtures/
 * once you have a verified extraction to compare against.
 */

import { toStr, isEmptyAlt } from '../src/extract.js';

describe('toStr', () => {
  test('returns empty string for null', () => expect(toStr(null)).toBe(''));
  test('returns empty string for undefined', () => expect(toStr(undefined)).toBe(''));
  test('passes through a string', () => expect(toStr('hello')).toBe('hello'));
  test('coerces a number', () => expect(toStr(42)).toBe('42'));
  test('coerces an object', () => expect(toStr({})).toBe('[object Object]'));
});

describe('isEmptyAlt', () => {
  test('treats null as empty', () => expect(isEmptyAlt(null)).toBe(true));
  test('treats empty string as empty', () => expect(isEmptyAlt('')).toBe(true));
  test('treats escaped empty string as empty', () => expect(isEmptyAlt('""')).toBe(true));
  test('treats real alt text as not empty', () => expect(isEmptyAlt('A bar chart')).toBe(false));
});

// TODO: add extractCourse() integration test once a fixture ZIP is in workspaces/fixtures/
