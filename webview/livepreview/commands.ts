import { EditorSelection, type EditorState, type StateCommand } from '@codemirror/state';

/** Number of consecutive `ch` characters starting at `pos` going in direction `dir`. */
function run(state: EditorState, pos: number, dir: 1 | -1, ch: string): number {
  let n = 0;
  for (let p = dir < 0 ? pos - 1 : pos; p >= 0 && p < state.doc.length && state.sliceDoc(p, p + 1) === ch; p += dir) n++;
  return n;
}

/**
 * Wraps each selection in `marker`, or unwraps it if it is already wrapped. A run of three markers
 * (`***x***`) counts as both bold and italic, so Ctrl+B/Ctrl+I peel off the right part.
 */
export function toggleWrap(marker: '*' | '**'): StateCommand {
  const n = marker.length;
  const ch = marker[0];
  return ({ state, dispatch }) => {
    const tr = state.changeByRange((range) => {
      const wrapped = (r: number) => r === n || r === 3;
      if (wrapped(run(state, range.from, -1, ch)) && wrapped(run(state, range.to, 1, ch))) {
        return {
          changes: [
            { from: range.from - n, to: range.from },
            { from: range.to, to: range.to + n },
          ],
          range: EditorSelection.range(range.anchor - n, range.head - n),
        };
      }
      return {
        changes: [
          { from: range.from, insert: marker },
          { from: range.to, insert: marker },
        ],
        range: EditorSelection.range(range.anchor + n, range.head + n),
      };
    });
    dispatch(state.update(tr, { scrollIntoView: true, userEvent: 'input' }));
    return true;
  };
}

export const toggleBold = toggleWrap('**');
export const toggleItalic = toggleWrap('*');
