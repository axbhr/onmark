import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { DecorationContext, NodeHandlers } from './context';

function heading(level: number) {
  return (node: SyntaxNode, ctx: DecorationContext) => {
    // Size applies even on the active line so the height never jumps while typing.
    ctx.line(node.from, `cm-om-h cm-om-h${level}`);
    if (ctx.lineActive(node.from)) return;
    const text = ctx.state.doc;
    for (let mark = node.firstChild; mark; mark = mark.nextSibling) {
      if (mark.name !== 'HeaderMark') continue;
      if (mark.from === node.from) {
        ctx.hide(mark.from, text.sliceString(mark.to, mark.to + 1) === ' ' ? mark.to + 1 : mark.to);
      } else {
        // Optional closing sequence: `# Title ##`
        ctx.hide(text.sliceString(mark.from - 1, mark.from) === ' ' ? mark.from - 1 : mark.from, mark.to);
      }
    }
  };
}

export const headingHandlers: NodeHandlers = Object.fromEntries(
  [1, 2, 3, 4, 5, 6].map((level) => [`ATXHeading${level}`, heading(level)]),
);

export const headingTheme = EditorView.baseTheme({
  '.cm-om-h': { fontWeight: 'bold', lineHeight: '1.3' },
  '.cm-om-h1': { fontSize: '2em', paddingTop: '0.4em' },
  '.cm-om-h2': { fontSize: '1.6em', paddingTop: '0.35em' },
  '.cm-om-h3': { fontSize: '1.37em', paddingTop: '0.3em' },
  '.cm-om-h4': { fontSize: '1.25em', paddingTop: '0.25em' },
  '.cm-om-h5': { fontSize: '1.12em' },
  '.cm-om-h6': { fontSize: '1em', color: 'var(--vscode-descriptionForeground)' },
});
