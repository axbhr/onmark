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
  Highlight(node, ctx) {
    ctx.mark(node.from, node.to, 'cm-om-highlight');
    hideMarks(node, ctx);
  },
  InlineCode(node, ctx) {
    const open = node.firstChild;
    const close = node.lastChild;
    if (open?.name === 'CodeMark' && close?.name === 'CodeMark' && open !== close) {
      ctx.mark(open.to, close.from, 'cm-om-code');
    }
    hideMarks(node, ctx);
  },
};

export const formattingTheme = EditorView.baseTheme({
  // Inside editor lines these backgrounds are painted by the background layer (backgrounds.ts).
  '.cm-om-highlight, .cm-om-bg.cm-om-highlight': {
    color: 'inherit',
    backgroundColor: 'var(--vscode-editor-findMatchHighlightBackground)',
    borderRadius: '2px',
  },
  '.cm-om-code, .cm-om-bg.cm-om-code': {
    backgroundColor: 'var(--vscode-textPreformat-background, var(--vscode-textCodeBlock-background))',
    borderRadius: '3px',
  },
  '.cm-om-code': {
    outline: '1px solid var(--vscode-contrastBorder, transparent)',
    padding: '0.1em 0.25em',
    fontSize: '0.9em',
  },
});
