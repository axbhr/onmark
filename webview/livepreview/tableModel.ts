/**
 * Structure of a GFM table and minimal text edits on it. Every operation returns changes that touch
 * only what the user changed (one cell, one inserted line, one cell per row for columns), so the rest
 * of the table keeps its formatting.
 */

import { minimalDiff } from '../../src/shared/text';

export type Align = 'left' | 'center' | 'right' | undefined;

export interface Cell {
  /** Range between the surrounding pipes (or line edges), including padding. */
  from: number;
  to: number;
  /** Trimmed source text of the cell, escapes kept (`\|`). */
  text: string;
}

export interface Row {
  from: number;
  to: number;
  cells: Cell[];
  leading: boolean;
  trailing: boolean;
}

export interface TableModel {
  from: number;
  to: number;
  header: Row;
  delimiter: Row;
  body: Row[];
  align: Align[];
  columns: number;
}

export interface Change {
  from: number;
  to?: number;
  insert?: string;
}

/** Pipes that separate cells: not escaped with a backslash. */
function pipes(line: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\') i++;
    else if (line[i] === '|') result.push(i);
  }
  return result;
}

export function parseRow(line: string, from: number): Row {
  const positions = pipes(line);
  const first = line.search(/\S/);
  const last = line.trimEnd().length - 1;
  const leading = positions.length > 0 && positions[0] === first;
  const trailing = positions.length > 0 && positions[positions.length - 1] === last && (!leading || positions.length > 1);
  const bounds = [leading ? positions[0] : (first < 0 ? 0 : first) - 1, ...positions.slice(leading ? 1 : 0, trailing ? -1 : undefined)];
  const end = trailing ? positions[positions.length - 1] : line.trimEnd().length;
  const cells: Cell[] = [];
  for (let i = 0; i < bounds.length; i++) {
    const start = bounds[i] + 1;
    const stop = i + 1 < bounds.length ? bounds[i + 1] : end;
    cells.push({ from: from + start, to: from + stop, text: line.slice(start, stop).trim() });
  }
  return { from, to: from + line.length, cells, leading, trailing };
}

function alignOf(text: string): Align {
  const left = text.startsWith(':');
  const right = text.endsWith(':');
  return left && right ? 'center' : right ? 'right' : left ? 'left' : undefined;
}

/** Parses the table source `text` that starts at document position `from`. */
export function parseTable(text: string, from: number): TableModel {
  const rows: Row[] = [];
  let pos = from;
  for (const line of text.split('\n')) {
    rows.push(parseRow(line, pos));
    pos += line.length + 1;
  }
  const [header, delimiter, ...body] = rows;
  const columns = Math.max(header.cells.length, 1);
  return {
    from,
    to: from + text.length,
    header,
    delimiter,
    body,
    align: delimiter.cells.map((c) => alignOf(c.text)),
    columns,
  };
}

/** Row by display index: 0 is the header, 1… are body rows. */
export const rowAt = (table: TableModel, row: number): Row | undefined => (row === 0 ? table.header : table.body[row - 1]);

/**
 * Cell text as typed ⇄ cell source. Every `|` becomes `\|`; unescaping turns `\|` back into `|`, so any
 * typed text (including `\|`) round-trips exactly.
 */
export const escapeCell = (text: string) => text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
export const unescapeCell = (text: string) => text.replace(/\\\|/g, '|');

/** Replaces the text of one cell, keeping its padding. Missing cells of a short row are appended. */
export function setCell(table: TableModel, row: number, col: number, text: string, slice: (from: number, to: number) => string): Change[] {
  const target = rowAt(table, row);
  if (!target) return [];
  const escaped = escapeCell(text);
  const cell = target.cells[col];
  if (cell) {
    const raw = slice(cell.from, cell.to);
    const blank = raw.trim() === '';
    const edgeStart = col === 0 && !target.leading;
    const edgeEnd = col === target.cells.length - 1 && !target.trailing;
    let lead = blank ? (edgeStart ? '' : ' ') : raw.match(/^\s*/)![0];
    let trail = blank ? (edgeEnd ? '' : ' ') : raw.match(/\s*$/)![0];
    // An empty cell at the edge of a row without outer pipes would vanish; give the row that pipe.
    if (!escaped && edgeStart) lead = '| ';
    if (!escaped && edgeEnd) trail = ' |';
    // Minimal edit, so typing produces adjacent insertions that the undo history groups together.
    const diff = minimalDiff(raw, lead + escaped + trail);
    return [{ from: cell.from + diff.from, to: cell.from + diff.to, insert: diff.insert }];
  }
  const pieces = [...Array(col - target.cells.length).fill('   '), ` ${escaped} `].map((p) => `${p}|`).join('');
  return [{ from: target.to, insert: target.trailing ? pieces : ` |${pieces}` }];
}

function emptyRowText(table: TableModel): string {
  const cells = Array(table.columns).fill('   ').join('|');
  return `${table.header.leading ? '|' : ''}${cells}${table.header.trailing ? '|' : ''}`;
}

/** Inserts an empty body row so it becomes body row `index` (0 = first row below the header). */
export function insertRow(table: TableModel, index: number): Change[] {
  const after = index <= 0 ? table.delimiter : table.body[Math.min(index, table.body.length) - 1];
  return [{ from: after.to, insert: `\n${emptyRowText(table)}` }];
}

export function deleteRow(table: TableModel, index: number): Change[] {
  const row = table.body[index];
  return row ? [{ from: row.from - 1, to: row.to }] : [];
}

/** Inserts an empty column so it becomes column `index`. */
export function insertColumn(table: TableModel, index: number): Change[] {
  const changes: Change[] = [];
  for (const row of [table.header, table.delimiter, ...table.body]) {
    const content = row === table.delimiter ? ' --- ' : '   ';
    if (index < row.cells.length) {
      const cell = row.cells[index];
      // Without a leading pipe an empty first cell would vanish, so the row gets one.
      const atLineStart = index === 0 && !row.leading;
      changes.push({ from: cell.from, insert: atLineStart ? `|${content}|` : `${content}|` });
    } else {
      // Without a trailing pipe an empty last cell would vanish, so the row gets one.
      const missing = [...Array(index - row.cells.length).fill('   '), content].map((p) => `${p}|`).join('');
      changes.push({ from: row.to, insert: row.trailing ? missing : ` |${missing}` });
    }
  }
  return changes;
}

export function deleteColumn(table: TableModel, index: number, slice: (from: number, to: number) => string): Change[] {
  if (table.columns <= 1) return [];
  const changes: Change[] = [];
  for (const row of [table.header, table.delimiter, ...table.body]) {
    const cell = row.cells[index];
    if (!cell) continue;
    const pipeAfter = index < row.cells.length - 1 || row.trailing;
    if (pipeAfter) {
      changes.push({ from: cell.from, to: cell.to + 1 });
    } else {
      // Last cell without a trailing pipe: remove it with the pipe and the padding before it.
      const prev = row.cells[index - 1];
      const from = prev ? prev.from + slice(prev.from, prev.to).trimEnd().length : row.from;
      changes.push({ from, to: cell.to });
    }
  }
  return changes;
}

export function setAlign(table: TableModel, col: number, align: Align, slice: (from: number, to: number) => string): Change[] {
  const cell = table.delimiter.cells[col];
  if (!cell) return [];
  const raw = slice(cell.from, cell.to);
  const dashes = Math.max(3, cell.text.replace(/:/g, '').length);
  const text = `${align === 'left' || align === 'center' ? ':' : ''}${'-'.repeat(dashes)}${align === 'right' || align === 'center' ? ':' : ''}`;
  const start = cell.from + raw.search(/\S|$/);
  return [{ from: start, to: start + cell.text.length, insert: text }];
}
