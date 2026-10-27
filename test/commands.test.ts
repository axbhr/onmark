import { EditorSelection, EditorState, type Transaction } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { toggleBold, toggleItalic } from '../webview/livepreview/commands';

/** Runs a command on `doc` where `[` and `]` mark the selection; returns the result in the same notation. */
function run(command: typeof toggleBold, doc: string): string {
  const from = doc.indexOf('[');
  const to = doc.indexOf(']') - 1;
  let state = EditorState.create({
    doc: doc.replace('[', '').replace(']', ''),
    selection: EditorSelection.single(from, to),
  });
  command({ state, dispatch: (tr: Transaction) => (state = tr.state) });
  const { from: f, to: t } = state.selection.main;
  const text = state.doc.toString();
  return `${text.slice(0, f)}[${text.slice(f, t)}]${text.slice(t)}`;
}

describe('toggleWrap', () => {
  it('wraps and unwraps a selection', () => {
    expect(run(toggleBold, 'a [word] b')).toBe('a **[word]** b');
    expect(run(toggleBold, 'a **[word]** b')).toBe('a [word] b');
    expect(run(toggleItalic, 'a [word] b')).toBe('a *[word]* b');
    expect(run(toggleItalic, 'a *[word]* b')).toBe('a [word] b');
  });

  it('inserts an empty pair at a cursor', () => {
    expect(run(toggleBold, 'a []b')).toBe('a **[]**b');
  });

  it('keeps bold and italic apart', () => {
    expect(run(toggleItalic, '**[x]**')).toBe('***[x]***');
    expect(run(toggleItalic, '***[x]***')).toBe('**[x]**');
    expect(run(toggleBold, '***[x]***')).toBe('*[x]*');
    expect(run(toggleBold, '*[x]*')).toBe('***[x]***');
  });
});
