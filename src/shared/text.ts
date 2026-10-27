/** Zero-based line, UTF-16 column. Used on the wire instead of offsets because EOL widths differ. */
export interface Pos {
  line: number;
  ch: number;
}

/** A replacement in coordinates of the document *before* any change of the same batch. */
export interface Change {
  from: Pos;
  to: Pos;
  insert: string;
}

export const toLf = (text: string): string => text.replace(/\r\n?/g, '\n');

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  return starts;
}

/** Applies a batch of non-overlapping changes to an LF text. */
export function applyChanges(text: string, changes: readonly Change[]): string {
  const starts = lineStarts(text);
  const offset = (p: Pos) => {
    if (p.line >= starts.length) throw new RangeError(`Line ${p.line} out of range`);
    return starts[p.line] + p.ch;
  };
  const ranges = changes
    .map((c) => ({ from: offset(c.from), to: offset(c.to), insert: c.insert }))
    .sort((a, b) => b.from - a.from);
  for (const r of ranges) text = text.slice(0, r.from) + r.insert + text.slice(r.to);
  return text;
}

/** Smallest single replacement (offsets in `a`) that turns `a` into `b`, via common prefix/suffix. */
export function minimalDiff(a: string, b: string): { from: number; to: number; insert: string } {
  const max = Math.min(a.length, b.length);
  let from = 0;
  while (from < max && a.charCodeAt(from) === b.charCodeAt(from)) from++;
  let endA = a.length;
  let endB = b.length;
  while (endA > from && endB > from && a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)) {
    endA--;
    endB--;
  }
  return { from, to: endA, insert: b.slice(from, endB) };
}
