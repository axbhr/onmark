import type { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { NodeHandlers } from './context';
import { flippedFolds, toggleFold } from './folds';
import { CalloutTitleWidget } from './widgets/calloutTitle';
import { FoldWidget } from './widgets/fold';

/** Obsidian callout types; aliases share a group. Colors are theme variables, icons are codicons. */
const GROUPS: Record<string, { aliases: string[]; color: string; icon: string }> = {
  note: { aliases: [], color: 'charts-blue', icon: 'edit' },
  abstract: { aliases: ['summary', 'tldr'], color: 'terminal-ansiCyan', icon: 'note' },
  info: { aliases: [], color: 'terminal-ansiBrightBlue', icon: 'info' },
  todo: { aliases: [], color: 'terminal-ansiBlue', icon: 'pass' },
  tip: { aliases: ['hint', 'important'], color: 'terminal-ansiBrightCyan', icon: 'flame' },
  success: { aliases: ['check', 'done'], color: 'charts-green', icon: 'check' },
  question: { aliases: ['help', 'faq'], color: 'charts-yellow', icon: 'question' },
  warning: { aliases: ['caution', 'attention'], color: 'charts-orange', icon: 'warning' },
  failure: { aliases: ['fail', 'missing'], color: 'terminal-ansiBrightRed', icon: 'close' },
  danger: { aliases: ['error'], color: 'charts-red', icon: 'zap' },
  bug: { aliases: [], color: 'terminal-ansiRed', icon: 'bug' },
  example: { aliases: [], color: 'charts-purple', icon: 'list-unordered' },
  quote: { aliases: ['cite'], color: 'descriptionForeground', icon: 'quote' },
};

const GROUP_OF = new Map(
  Object.entries(GROUPS).flatMap(([group, { aliases }]) => [group, ...aliases].map((t) => [t, group] as const)),
);

const HEADER = /^(\s*>\s?)\[!([^\]\s]+)\]([+-]?)\s*/;

export interface CalloutInfo {
  group: string;
  type: string;
  fold: '' | '+' | '-';
  /** End of `> [!type]+ ` on the title line. */
  markerEnd: number;
  hasTitle: boolean;
}

export function calloutInfo(state: EditorState, node: SyntaxNode): CalloutInfo | undefined {
  const line = state.doc.lineAt(node.from);
  const match = HEADER.exec(line.text);
  if (!match) return undefined;
  const type = match[2].toLowerCase();
  return {
    type,
    group: GROUP_OF.get(type) ?? 'note',
    fold: match[3] as CalloutInfo['fold'],
    markerEnd: line.from + match[0].length,
    hasTitle: line.text.length > match[0].length,
  };
}

export const calloutHandlers: NodeHandlers = {
  Blockquote(node, ctx) {
    const info = calloutInfo(ctx.state, node);
    if (!info) return;
    const { doc } = ctx.state;
    const first = doc.lineAt(node.from);
    const last = doc.lineAt(node.to);

    const folded =
      info.fold !== '' &&
      (info.fold === '-') !== ctx.state.field(flippedFolds).has(node.from) &&
      !ctx.touches(first.to + 1, node.to);

    for (let n = first.number; n <= (folded ? first.number : last.number); n++) {
      const edge = n === first.number ? ' cm-ob-callout-title' : '';
      const end = n === last.number || folded ? ' cm-ob-callout-last' : '';
      ctx.line(doc.line(n).from, `cm-ob-callout cm-ob-callout-${info.group}${edge}${end}`);
    }
    if (folded && last.number > first.number) ctx.hide(first.to, node.to);

    if (!ctx.lineActive(first.from)) {
      const fallback = info.hasTitle ? undefined : info.type[0].toUpperCase() + info.type.slice(1);
      ctx.widget(first.from, info.markerEnd, new CalloutTitleWidget(GROUPS[info.group].icon, fallback));
    }
    if (info.fold) ctx.widget(first.to, first.to, new FoldWidget(folded));
  },
};

/** Clicking the chevron flips the fold state (view only). */
export const calloutFoldClick = EditorView.domEventHandlers({
  mousedown(event, view) {
    const target = (event.target as HTMLElement).closest('.cm-ob-callout .cm-ob-fold');
    if (event.button !== 0 || !target) return false;
    event.preventDefault();
    view.dispatch({ effects: toggleFold.of(view.state.doc.lineAt(view.posAtDOM(target)).from) });
    return true;
  },
});

const groupStyles = Object.fromEntries(
  Object.entries(GROUPS).map(([group, { color }]) => [
    `.cm-line.cm-ob-callout-${group}`,
    { '--ob-callout': `var(--vscode-${color})` },
  ]),
);

export const calloutTheme = EditorView.baseTheme({
  ...groupStyles,
  '.cm-line.cm-ob-callout': {
    backgroundColor: 'color-mix(in srgb, var(--ob-callout) 10%, var(--vscode-editor-background))',
    padding: '0 1em',
    borderLeft: '1px solid var(--vscode-contrastBorder, transparent)',
    borderRight: '1px solid var(--vscode-contrastBorder, transparent)',
  },
  '.cm-line.cm-ob-callout-title': {
    color: 'var(--ob-callout)',
    fontWeight: 'bold',
    paddingTop: '0.3em',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
    boxShadow: 'inset 0 1px 0 var(--vscode-contrastBorder, transparent)',
  },
  '.cm-line.cm-ob-callout-last': {
    paddingBottom: '0.3em',
    borderBottomLeftRadius: '4px',
    borderBottomRightRadius: '4px',
    boxShadow: 'inset 0 -1px 0 var(--vscode-contrastBorder, transparent)',
  },
  '.cm-ob-callout-head': { display: 'inline-flex', alignItems: 'center', gap: '0.4em', marginRight: '0.4em' },
  '.cm-ob-callout-head .codicon': { fontSize: '1.05em' },
  '.cm-ob-fold': {
    display: 'inline-flex',
    verticalAlign: 'middle',
    marginLeft: '0.3em',
    cursor: 'pointer',
    borderRadius: '3px',
    color: 'var(--vscode-icon-foreground)',
  },
  '.cm-ob-fold:hover': { backgroundColor: 'var(--vscode-toolbar-hoverBackground)' },
});
