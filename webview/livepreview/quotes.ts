import { EditorView } from '@codemirror/view';
import type { NodeHandlers } from './inline';

export const quoteHandlers: NodeHandlers = {
  Blockquote(node, ctx) {
    const { doc } = ctx.state;
    const last = doc.lineAt(node.to).number;
    for (let n = doc.lineAt(node.from).number; n <= last; n++) ctx.line(doc.line(n).from, 'cm-ob-quote');
  },
  QuoteMark(node, ctx) {
    if (ctx.lineActive(node.from)) return;
    const space = ctx.state.doc.sliceString(node.to, node.to + 1) === ' ';
    ctx.hide(node.from, space ? node.to + 1 : node.to);
  },
};

export const quoteTheme = EditorView.baseTheme({
  '.cm-line.cm-ob-quote': {
    borderLeft: '3px solid var(--vscode-textBlockQuote-border, var(--vscode-textLink-foreground))',
    paddingLeft: '1em',
    color: 'var(--vscode-descriptionForeground)',
  },
});
