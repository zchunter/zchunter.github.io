import { parseCSVLine, processXliff, toCsvField } from './xliff-tool.js';

describe('xliff-tool utilities', () => {
  test('parseCSVLine handles quoted commas', () => {
    const line = '"Original, Value","Replacement, Value"';
    expect(parseCSVLine(line)).toEqual(['Original, Value', 'Replacement, Value']);
  });

  test('parseCSVLine handles escaped quotes', () => {
    const line = '"Original ""quoted"" text","Replacement ""quoted"" text"';
    expect(parseCSVLine(line)).toEqual(['Original "quoted" text', 'Replacement "quoted" text']);
  });

  test('toCsvField escapes internal quotes', () => {
    expect(toCsvField('He said "hello"')).toBe('"He said ""hello"""');
  });
});

describe('processXliff', () => {
  test('returns content unchanged when replacement list is empty', () => {
    const input = '<xliff><file><body><trans-unit><source>Hello world</source></trans-unit></body></file></xliff>';
    const result = processXliff(input, []);

    expect(result.content).toBe(input);
    expect(result.replacementCounts).toEqual({});
    expect(result.content).toContain('<source>Hello world</source>');
    expect(result.content).not.toContain('<target>');
  });

  test('applies replacements, counts matches, and converts source tags to target tags', () => {
    const input = '<xliff><file><body><trans-unit><source>Hello world</source></trans-unit><trans-unit><source>Hello world</source></trans-unit></body></file></xliff>';
    const result = processXliff(input, [['Hello', 'Hi']]);

    expect(result.replacementCounts).toEqual({ Hello: 2 });
    expect(result.content).not.toContain('<source>');
    expect(result.content).toContain('<target>Hi world</target>');
  });

  test('preserves inline XML tags within source content', () => {
    const input = '<xliff><file><body><trans-unit><source>Click <ph id="1"/> now</source></trans-unit></body></file></xliff>';
    const result = processXliff(input, [['Click', 'Tap']]);

    expect(result.replacementCounts).toEqual({ Click: 1 });
    expect(result.content).toContain('<target>Tap <ph id="1"/> now</target>');
  });
});
