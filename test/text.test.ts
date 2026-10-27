import { describe, expect, it } from 'vitest';
import { applyChanges, minimalDiff, toLf } from '../src/shared/text';

describe('toLf', () => {
  it('normalizes CRLF and lone CR', () => {
    expect(toLf('a\r\nb\rc\n')).toBe('a\nb\nc\n');
  });
});

describe('applyChanges', () => {
  it('applies a batch in original coordinates', () => {
    const text = 'one\ntwo\nthree';
    const result = applyChanges(text, [
      { from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 }, insert: 'ONE' },
      { from: { line: 2, ch: 5 }, to: { line: 2, ch: 5 }, insert: '!\nfour' },
      { from: { line: 1, ch: 1 }, to: { line: 2, ch: 0 }, insert: '' },
    ]);
    expect(result).toBe('ONE\ntthree!\nfour');
  });

  it('throws on positions outside the text', () => {
    expect(() => applyChanges('a', [{ from: { line: 3, ch: 0 }, to: { line: 3, ch: 0 }, insert: 'x' }])).toThrow(
      RangeError,
    );
  });
});

describe('minimalDiff', () => {
  const apply = (a: string, d: ReturnType<typeof minimalDiff>) => a.slice(0, d.from) + d.insert + a.slice(d.to);

  it('touches only the changed middle', () => {
    expect(minimalDiff('hello world', 'hello brave world')).toEqual({ from: 6, to: 6, insert: 'brave ' });
    expect(minimalDiff('aaa', 'aa')).toEqual({ from: 2, to: 3, insert: '' });
    expect(minimalDiff('same', 'same')).toEqual({ from: 4, to: 4, insert: '' });
  });

  it('round-trips random edits', () => {
    const alphabet = 'ab\n ';
    const rand = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * 4)]).join('');
    for (let i = 0; i < 500; i++) {
      const a = rand(Math.floor(Math.random() * 20));
      const b = rand(Math.floor(Math.random() * 20));
      expect(apply(a, minimalDiff(a, b))).toBe(b);
    }
  });
});
