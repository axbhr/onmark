import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { DecorationContext, NodeHandlers } from './context';

/** Hides the direct `*Mark` children of an inline element unless the selection touches it. */
function hideMarks(node: SyntaxNode, ctx: DecorationContext) {
  if (ctx.touches(node.from, node.to)) return;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name.endsWith('Mark')) ctx.hide(child.from, child.to);
  }
}

export const formattingHandlers: NodeHandlers = {
  Emphasis: hideMarks,
  StrongEmphasis: hideMarks,
  Strikethrough: hideMarks,
  Highlight: hideMarks,
  InlineCode(node, ctx) {
    const open = node.firstChild;
    const close = node.lastChild;
    if (open?.name === 'CodeMark' && close?.name === 'CodeMark' && open !== close) {
      ctx.mark(open.to, close.from, 'cm-ob-code');
    }
    hideMarks(node, ctx);
  },
};

export const formattingTheme = EditorView.baseTheme({
  // Same look as the `==highlight==` token style, for rendered widgets (tables).
  '.cm-ob-highlight': {
    color: 'inherit',
    backgroundColor: 'var(--vscode-editor-findMatchHighlightBackground)',
    borderRadius: '2px',
  },
  '.cm-ob-code': {
    backgroundColor: 'var(--vscode-textPreformat-background, var(--vscode-textCodeBlock-background))',
    outline: '1px solid var(--vscode-contrastBorder, transparent)',
    borderRadius: '3px',
    padding: '0.1em 0.25em',
    fontSize: '0.9em',
  },
});
