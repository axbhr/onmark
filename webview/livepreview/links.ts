import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { DecorationContext, NodeHandlers } from './context';

const LINK = 'cm-ob-link';

function hideAround(node: SyntaxNode, textFrom: number, textTo: number, ctx: DecorationContext) {
  ctx.hide(node.from, textFrom);
  ctx.hide(textTo, node.to);
  ctx.mark(textFrom, textTo, LINK);
}

export const linkHandlers: NodeHandlers = {
  /** `[text](url)`: only the text stays visible, unless the selection touches the link. */
  Link(node, ctx) {
    const marks = node.getChildren('LinkMark');
    if (!node.getChild('URL') || marks.length < 2 || ctx.touches(node.from, node.to)) return;
    hideAround(node, marks[0].to, marks[1].from, ctx);
  },
  /** `<https://…>` */
  Autolink(node, ctx) {
    const url = node.getChild('URL');
    if (url && !ctx.touches(node.from, node.to)) hideAround(node, url.from, url.to, ctx);
  },
  /** Bare GFM autolinks. */
  URL(node, ctx) {
    if (node.parent?.name !== 'Link' && node.parent?.name !== 'Autolink') ctx.mark(node.from, node.to, LINK);
  },
};

/** Link target at `pos`, if `pos` is inside a link. */
export function linkTargetAt(state: EditorState, pos: number): string | undefined {
  const tree = syntaxTree(state);
  for (const side of [1, -1] as const) {
    for (let node: SyntaxNode | null = tree.resolveInner(pos, side); node; node = node.parent) {
      if (node.name === 'Link' || node.name === 'Autolink') node = node.getChild('URL') ?? node;
      if (node.name === 'URL') return state.sliceDoc(node.from, node.to).replace(/^<(.*)>$/, '$1');
      if (node.name === 'Link') break;
    }
  }
  return undefined;
}

export type OpenLink = (target: string, toSide: boolean) => void;

/** Ctrl/Cmd+click opens the link under the pointer; Alt additionally opens it to the side. */
export function linkClick(open: OpenLink) {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button !== 0 || !(event.ctrlKey || event.metaKey)) return false;
      // Links inside non-editable widgets (e.g. rendered tables) carry their target in data-href.
      const rendered = (event.target as HTMLElement).closest<HTMLElement>('[data-href]')?.dataset.href;
      const pos = rendered ? null : view.posAtCoords({ x: event.clientX, y: event.clientY });
      const target = rendered ?? (pos === null ? undefined : linkTargetAt(view.state, pos));
      if (!target) return false;
      event.preventDefault();
      open(target, event.altKey);
      return true;
    },
  });
}

export const linkTheme = EditorView.baseTheme({
  [`.${LINK}`]: {
    color: 'var(--vscode-textLink-foreground)',
    textDecoration: 'underline',
    textDecorationColor: 'color-mix(in srgb, currentColor 40%, transparent)',
  },
  [`.${LINK}:hover`]: { color: 'var(--vscode-textLink-activeForeground)' },
});
