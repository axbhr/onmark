import { syntaxTree } from '@codemirror/language';
import { Facet, type EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { DecorationContext, NodeHandlers } from './context';

const LINK = 'cm-om-link';

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

/** The link at `pos` (its target and the range of the whole link), if `pos` is inside a link. */
export function linkAt(state: EditorState, pos: number): { target: string; from: number; to: number } | undefined {
  const tree = syntaxTree(state);
  for (const side of [1, -1] as const) {
    for (let node: SyntaxNode | null = tree.resolveInner(pos, side); node; node = node.parent) {
      const link = node.name === 'Link' || node.name === 'Autolink' ? node : node.name === 'URL' ? node : null;
      if (!link) continue;
      const url = link.name === 'URL' ? link : link.getChild('URL');
      if (!url) break;
      const outer = link.name === 'URL' && link.parent && /^(Link|Autolink)$/.test(link.parent.name) ? link.parent : link;
      const target = state.sliceDoc(url.from, url.to).replace(/^<(.*)>$/, '$1');
      return { target, from: outer.from, to: outer.to };
    }
  }
  return undefined;
}

/** Link target at `pos`, if `pos` is inside a link. */
export const linkTargetAt = (state: EditorState, pos: number) => linkAt(state, pos)?.target;

export type OpenLink = (target: string, toSide: boolean) => void;

/** Opens links from widgets that handle their own events (e.g. tables). */
export const linkOpener = Facet.define<OpenLink, OpenLink>({ combine: (values) => values[0] ?? (() => {}) });

/**
 * A click on a rendered link opens it, like in a preview. While the link's syntax is visible (the
 * cursor is in it) a plain click edits the text, and Ctrl/Cmd+click opens it. Alt opens to the side.
 */
export function linkClick(open: OpenLink) {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button !== 0) return false;
      const element = event.target as HTMLElement;
      const modifier = event.ctrlKey || event.metaKey;
      // Links inside non-editable widgets (tables, HTML) carry their target in data-href.
      let target = element.closest<HTMLElement>('[data-href]')?.dataset.href;
      if (!target) {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        const link = pos === null ? undefined : linkAt(view.state, pos);
        const rendered = !!element.closest(`.${LINK}`) && !!link && !touchesSelection(view, link.from, link.to);
        if (link && (modifier || rendered)) target = link.target;
      }
      if (!target) return false;
      event.preventDefault();
      open(target, event.altKey);
      return true;
    },
  });
}

const touchesSelection = (view: EditorView, from: number, to: number) =>
  view.state.selection.ranges.some((r) => r.from <= to && r.to >= from);

export const linkTheme = EditorView.baseTheme({
  [`.${LINK}`]: {
    cursor: 'pointer',
    color: 'var(--vscode-textLink-foreground)',
    textDecoration: 'underline',
    textDecorationColor: 'color-mix(in srgb, currentColor 40%, transparent)',
  },
  [`.${LINK}:hover`]: { color: 'var(--vscode-textLink-activeForeground)' },
});
