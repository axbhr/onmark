import { describe, expect, it } from 'vitest';
import {
  deleteColumn,
  deleteRow,
  escapeCell,
  insertColumn,
  insertRow,
  parseTable,
  setAlign,
  setCell,
  unescapeCell,
  type Change,
} from '../webview/livepreview/tableModel';

/** Applies changes (in original coordinates) to `text`. */
function apply(text: string, changes: Change[]): string {
  const sorted = [...changes].sort((a, b) => b.from - a.from);
  for (const c of sorted) text = text.slice(0, c.from) + (c.insert ?? '') + text.slice(c.to ?? c.from);
  return text;
}

const piped = '| A | B |\n| :-- | --: |\n| 1 | 2 |\n| 3 | 4 |';
const bare = 'A | B\n--- | ---\n1 | 2';
const run = (text: string, op: (t: ReturnType<typeof parseTable>, slice: (a: number, b: number) => string) => Change[]) =>
  apply(text, op(parseTable(text, 0), (a, b) => text.slice(a, b)));

describe('parseTable', () => {
  it('reads cells, alignment and pipe style', () => {
    const t = parseTable(piped, 0);
    expect(t.header.cells.map((c) => c.text)).toEqual(['A', 'B']);
    expect(t.body.map((r) => r.cells.map((c) => c.text))).toEqual([['1', '2'], ['3', '4']]);
    expect(t.align).toEqual(['left', 'right']);
    expect(t.header.leading && t.header.trailing).toBe(true);
    expect(parseTable(bare, 0).header.leading).toBe(false);
  });

  it('keeps escaped pipes inside a cell', () => {
    const t = parseTable('| a \\| b | c |\n| - | - |', 10);
    expect(t.header.cells.map((c) => c.text)).toEqual(['a \\| b', 'c']);
    expect(t.header.cells[0].from).toBe(11);
  });
});

describe('table edits', () => {
  it('sets a cell and keeps its padding', () => {
    expect(run(piped, (t, s) => setCell(t, 1, 1, 'two', s))).toBe('| A | B |\n| :-- | --: |\n| 1 | two |\n| 3 | 4 |');
    expect(run(piped, (t, s) => setCell(t, 0, 0, 'a|b', s))).toContain('| a\\|b | B |');
    expect(run(bare, (t, s) => setCell(t, 1, 0, 'x', s))).toBe('A | B\n--- | ---\nx | 2');
  });

  it('fills an empty cell with padding and extends short rows', () => {
    expect(run('| a | b |\n| - | - |\n|  |  |', (t, s) => setCell(t, 1, 1, 'x', s))).toBe('| a | b |\n| - | - |\n|  | x |');
    expect(run('| a | b | c |\n| - | - | - |\n| 1 |', (t, s) => setCell(t, 1, 2, 'x', s))).toBe(
      '| a | b | c |\n| - | - | - |\n| 1 |   | x |',
    );
    expect(run(bare, (t, s) => setCell(t, 1, 0, '', s))).toBe('A | B\n--- | ---\n|  | 2');
  });

  it('inserts and deletes rows', () => {
    expect(run(piped, (t) => insertRow(t, 0))).toBe('| A | B |\n| :-- | --: |\n|   |   |\n| 1 | 2 |\n| 3 | 4 |');
    expect(run(piped, (t) => insertRow(t, 2))).toBe(`${piped}\n|   |   |`);
    expect(run(bare, (t) => insertRow(t, 1))).toBe('A | B\n--- | ---\n1 | 2\n   |   ');
    expect(run(piped, (t) => deleteRow(t, 0))).toBe('| A | B |\n| :-- | --: |\n| 3 | 4 |');
  });

  it('inserts columns at any position', () => {
    expect(run(piped, (t) => insertColumn(t, 1))).toBe('| A |   | B |\n| :-- | --- | --: |\n| 1 |   | 2 |\n| 3 |   | 4 |');
    expect(run(piped, (t) => insertColumn(t, 0))).toBe('|   | A | B |\n| --- | :-- | --: |\n|   | 1 | 2 |\n|   | 3 | 4 |');
    expect(run(piped, (t) => insertColumn(t, 2))).toBe('| A | B |   |\n| :-- | --: | --- |\n| 1 | 2 |   |\n| 3 | 4 |   |');
    expect(run(bare, (t) => insertColumn(t, 2))).toBe('A | B |   |\n--- | --- | --- |\n1 | 2 |   |');
  });

  it('deletes columns but never the last one', () => {
    expect(run(piped, (t, s) => deleteColumn(t, 0, s))).toBe('| B |\n| --: |\n| 2 |\n| 4 |');
    expect(run(piped, (t, s) => deleteColumn(t, 1, s))).toBe('| A |\n| :-- |\n| 1 |\n| 3 |');
    expect(run(bare, (t, s) => deleteColumn(t, 1, s))).toBe('A\n---\n1');
    expect(run('| A |\n| - |', (t, s) => deleteColumn(t, 0, s))).toBe('| A |\n| - |');
  });

  it('changes the alignment marker only', () => {
    expect(run(piped, (t, s) => setAlign(t, 0, 'center', s))).toBe('| A | B |\n| :---: | --: |\n| 1 | 2 |\n| 3 | 4 |');
    expect(run(piped, (t, s) => setAlign(t, 1, undefined, s))).toBe('| A | B |\n| :-- | --- |\n| 1 | 2 |\n| 3 | 4 |');
  });

  it('round-trips escaping', () => {
    for (const typed of ['a | b', 'a \\| b', 'a\\', '\\|', '||']) expect(unescapeCell(escapeCell(typed))).toBe(typed);
    expect(escapeCell('x\ny')).toBe('x y');
  });
});

describe('table edits (randomized)', () => {
  /** Reference: the table as plain arrays of cell texts. */
  const read = (text: string) => {
    const t = parseTable(text, 0);
    const pad = (cells: string[]) => [...cells, ...Array(Math.max(0, t.columns - cells.length)).fill('')].slice(0, t.columns);
    return {
      header: pad(t.header.cells.map((c) => c.text)),
      body: t.body.map((r) => pad(r.cells.map((c) => c.text))),
      align: pad(t.align.map((a) => a ?? '')),
    };
  };

  it.each([3, 17, 99, 610, 4181])('keeps every other cell intact (seed %i)', (initialSeed) => {
    let seed = initialSeed;
    const rand = (n: number) => (seed = (seed * 1103515245 + 12345) % 2 ** 31) % n;
    let text = rand(2) ? piped : bare;
    let expected = read(text);
    for (let step = 0; step < 150; step++) {
      const t = parseTable(text, 0);
      const slice = (a: number, b: number) => text.slice(a, b);
      const rows = t.body.length + 1;
      const op = rand(6);
      if (op === 0) {
        const row = rand(rows);
        const col = rand(t.columns);
        const value = ['x', 'a b', 'p|q', '', '**z**'][rand(5)];
        text = apply(text, setCell(t, row, col, value, slice));
        (row === 0 ? expected.header : expected.body[row - 1])[col] = escapeCell(value).trim();
      } else if (op === 1) {
        const index = rand(t.body.length + 1);
        text = apply(text, insertRow(t, index));
        expected.body.splice(index, 0, Array(t.columns).fill(''));
      } else if (op === 2 && t.body.length > 1) {
        const index = rand(t.body.length);
        text = apply(text, deleteRow(t, index));
        expected.body.splice(index, 1);
      } else if (op === 3 && t.columns < 6) {
        const index = rand(t.columns + 1);
        text = apply(text, insertColumn(t, index));
        for (const r of [expected.header, ...expected.body]) r.splice(index, 0, '');
        expected.align.splice(index, 0, '');
      } else if (op === 4 && t.columns > 1) {
        const index = rand(t.columns);
        text = apply(text, deleteColumn(t, index, slice));
        for (const r of [expected.header, ...expected.body, expected.align]) r.splice(index, 1);
      } else if (op === 5) {
        const col = rand(t.columns);
        const align = (['left', 'center', 'right', undefined] as const)[rand(4)];
        text = apply(text, setAlign(t, col, align, slice));
        expected.align[col] = align ?? '';
      }
      expect(read(text), `step ${step}:\n${text}`).toEqual(expected);
    }
  });
});
