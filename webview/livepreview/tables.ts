import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { DecorationContext, NodeHandlers } from './context';
import { resourceBase } from './images';
import { TableWidget, type Align, type TableCell } from './widgets/table';

function alignments(text: string): Align[] {
  return text
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => {
      const c = cell.trim();
      if (c.startsWith(':') && c.endsWith(':')) return 'center';
      if (c.endsWith(':')) return 'right';
      return c.startsWith(':') ? 'left' : undefined;
    });
}

/** Cells of a row: text between pipes plus non-blank text outside the outer pipes. */
function cells(row: SyntaxNode, tableFrom: number, ctx: DecorationContext): TableCell[] {
  const { doc } = ctx.state;
  const line = doc.lineAt(row.from);
  const bounds = [line.from - 1, ...row.getChildren('TableDelimiter').map((d) => d.from), line.to];
  const result: TableCell[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const raw = doc.sliceString(bounds[i] + 1, bounds[i + 1]);
    const outer = i === 0 || i === bounds.length - 2;
    if (outer && !raw.trim()) continue;
    const lead = raw.length - raw.trimStart().length;
    result.push({ text: raw.trim(), offset: bounds[i] + 1 + lead - tableFrom });
  }
  return result;
}

/**
 * GFM tables render as a block widget unless the selection touches the table; then the raw text
 * appears. Each table row is exactly one line high and the header two (it stands in for the
 * delimiter line too), so the content below does not move when switching.
 */
export const tableHandlers: NodeHandlers = {
  Table(node, ctx) {
    if (ctx.touches(node.from, node.to)) return false;
    const { doc } = ctx.state;
    const from = doc.lineAt(node.from).from;
    const to = doc.lineAt(node.to).to;
    const rows = [node.getChild('TableHeader'), ...node.getChildren('TableRow')]
      .filter((r): r is SyntaxNode => !!r)
      .map((row) => cells(row, from, ctx));
    const delimiter = node.getChildren('TableDelimiter').find((d) => doc.lineAt(d.from).from === d.from);
    const align = delimiter ? alignments(doc.sliceString(delimiter.from, delimiter.to)) : [];
    const { base, root } = ctx.state.facet(resourceBase);
    ctx.widget(from, to, new TableWidget(doc.sliceString(from, to), rows, align, base, root), true);
    return false;
  },
};

/** Clicking a rendered cell puts the cursor at the start of that cell's text (raw view appears). */
export const tableClick = EditorView.domEventHandlers({
  mousedown(event, view) {
    const target = event.target as HTMLElement;
    const wrap = target.closest('.cm-ob-table-wrap');
    if (event.button !== 0 || !wrap || event.ctrlKey || event.metaKey) return false;
    event.preventDefault();
    const cell = target.closest<HTMLElement>('[data-offset]');
    const start = view.posAtDOM(wrap);
    view.dispatch({ selection: EditorSelection.cursor(start + Number(cell?.dataset.offset ?? 0)) });
    view.focus();
    return true;
  },
});

const border = 'var(--vscode-editorGroup-border, var(--vscode-textSeparator-foreground))';
const headerRule = 'inset 0 -2px 0 var(--vscode-textSeparator-foreground, var(--vscode-descriptionForeground))';

export const tableTheme = EditorView.baseTheme({
  '.cm-ob-table-wrap': { overflowX: 'auto', cursor: 'text' },
  // Borders are box-shadows so they take no space: row heights must equal raw line heights.
  '.cm-ob-table': { borderCollapse: 'separate', borderSpacing: '0', maxWidth: '100%' },
  '.cm-ob-table td, .cm-ob-table th': {
    padding: '0 0.75em',
    lineHeight: 'inherit',
    verticalAlign: 'middle',
    boxShadow: `inset 0 -1px 0 ${border}, inset -1px 0 0 ${border}`,
  },
  '.cm-ob-table td:last-child': { boxShadow: `inset 0 -1px 0 ${border}` },
  // Header row covers two raw lines (header + delimiter): 1.6em content + 1.6em padding.
  '.cm-ob-table th': { padding: '0.8em 0.75em', textAlign: 'left', boxShadow: `${headerRule}, inset -1px 0 0 ${border}` },
  '.cm-ob-table th:last-child': { boxShadow: headerRule },
  '.cm-ob-table tbody tr:hover': { backgroundColor: 'var(--vscode-list-hoverBackground)' },
  '.cm-ob-inline-image': { maxHeight: '1.4em', verticalAlign: 'middle' },
});
