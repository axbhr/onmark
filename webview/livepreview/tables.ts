import { EditorView } from '@codemirror/view';
import type { NodeHandlers } from './context';
import { resourceBase } from './images';
import { TableWidget } from './widgets/table';

/**
 * GFM tables render as an editable table (see widgets/table.ts) unless the selection touches the
 * table; then the raw text appears. Each row is exactly one line high and the header two (it stands
 * in for the delimiter line too), so the content below does not move when switching.
 */
export const tableHandlers: NodeHandlers = {
  Table(node, ctx) {
    if (ctx.touches(node.from, node.to)) return false;
    const { doc } = ctx.state;
    const from = doc.lineAt(node.from).from;
    const to = doc.lineAt(node.to).to;
    const { base, root } = ctx.state.facet(resourceBase);
    ctx.widget(from, to, new TableWidget(doc.sliceString(from, to), base, root), true);
    return false;
  },
};

const border = 'var(--vscode-editorGroup-border, var(--vscode-textSeparator-foreground))';
const headerRule = 'inset 0 -2px 0 var(--vscode-textSeparator-foreground, var(--vscode-descriptionForeground))';
const focusRing = 'inset 0 0 0 1px var(--vscode-focusBorder)';

export const tableTheme = EditorView.baseTheme({
  '.cm-om-table-wrap': { position: 'relative', width: 'fit-content', maxWidth: '100%', cursor: 'text' },
  '.cm-om-table-scroll': { overflowX: 'auto' },
  // Borders are box-shadows so they take no space: row heights must equal raw line heights.
  '.cm-om-table': { borderCollapse: 'separate', borderSpacing: '0', maxWidth: '100%' },
  '.cm-om-table td, .cm-om-table th': {
    padding: '0 0.75em',
    minWidth: '2em',
    lineHeight: 'inherit',
    verticalAlign: 'middle',
    outline: 'none',
    whiteSpace: 'pre-wrap',
    boxShadow: `inset 0 -1px 0 ${border}, inset -1px 0 0 ${border}`,
  },
  '.cm-om-table td:last-child': { boxShadow: `inset 0 -1px 0 ${border}` },
  // Header row covers two raw lines (header + delimiter): 1.6em content + 1.6em padding.
  '.cm-om-table th': { padding: '0.8em 0.75em', textAlign: 'left', boxShadow: `${headerRule}, inset -1px 0 0 ${border}` },
  '.cm-om-table th:last-child': { boxShadow: headerRule },
  '.cm-om-table tbody tr:hover': { backgroundColor: 'var(--vscode-list-hoverBackground)' },
  '.cm-om-table td:focus, .cm-om-table th:focus': {
    backgroundColor: 'var(--vscode-editor-background)',
    boxShadow: focusRing,
    fontFamily: 'var(--vscode-editor-font-family)',
    fontSize: '0.9em',
  },
  '.cm-om-inline-image': { maxHeight: '1.4em', verticalAlign: 'middle' },

  // Toolbar: shown above the table while a cell is edited, overlaying the line above.
  '.cm-om-table-toolbar': {
    display: 'none',
    position: 'absolute',
    bottom: '100%',
    left: '0',
    zIndex: '5',
    gap: '2px',
    padding: '2px',
    borderRadius: '4px',
    fontFamily: 'var(--vscode-font-family)',
    fontSize: '12px',
    lineHeight: '1',
    backgroundColor: 'var(--vscode-editorWidget-background)',
    border: '1px solid var(--vscode-editorWidget-border, var(--vscode-contrastBorder, transparent))',
    boxShadow: '0 2px 8px var(--vscode-widget-shadow, transparent)',
  },
  '.cm-om-table-editing .cm-om-table-toolbar': { display: 'flex' },
  '.cm-om-table-group': { display: 'inline-flex', gap: '1px' },
  '.cm-om-table-group + .cm-om-table-group': {
    borderLeft: '1px solid var(--vscode-editorWidget-border, var(--vscode-descriptionForeground))',
    paddingLeft: '2px',
    marginLeft: '2px',
  },
  '.cm-om-table-button': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1px',
    minWidth: '22px',
    height: '22px',
    justifyContent: 'center',
    padding: '0 3px',
    border: 'none',
    borderRadius: '3px',
    background: 'none',
    color: 'var(--vscode-icon-foreground, var(--vscode-foreground))',
    font: 'inherit',
    cursor: 'pointer',
  },
  '.cm-om-table-button:hover': { backgroundColor: 'var(--vscode-toolbar-hoverBackground)' },
  '.cm-om-table-button .codicon': { fontSize: '14px' },

  // `+` handles to add a row or column at the end; visible while hovering the table.
  '.cm-om-table-add-row, .cm-om-table-add-column': {
    position: 'absolute',
    opacity: '0',
    minWidth: '0',
    padding: '0',
    backgroundColor: 'var(--vscode-editorWidget-background)',
    border: '1px solid var(--vscode-editorWidget-border, transparent)',
    transition: 'opacity 0.1s',
  },
  '.cm-om-table-add-row': { left: '0', right: '0', bottom: '-12px', height: '12px' },
  '.cm-om-table-add-column': { top: '0', bottom: '0', right: '-14px', width: '12px', height: 'auto' },
  '.cm-om-table-wrap:hover .cm-om-table-add-row, .cm-om-table-wrap:hover .cm-om-table-add-column': { opacity: '1' },
  '.cm-om-table-add-row .codicon, .cm-om-table-add-column .codicon': { fontSize: '10px' },
});
