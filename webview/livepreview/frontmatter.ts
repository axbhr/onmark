import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { NodeHandlers } from './context';
import { flippedFolds, toggleFold } from './folds';
import { PropertiesWidget } from './widgets/properties';

export const frontmatterHandlers: NodeHandlers = {
  Frontmatter(node, ctx) {
    const marks = node.getChildren('FrontmatterMark');
    // Unclosed frontmatter (e.g. while typing) stays raw.
    if (marks.length < 2 || ctx.touches(node.from, node.to)) return false;
    const yaml = ctx.state.doc.sliceString(marks[0].to + 1, marks[1].from);
    const folded = ctx.state.field(flippedFolds).has(node.from);
    ctx.widget(node.from, node.to, new PropertiesWidget(yaml, folded), true);
    return false;
  },
};

/** Header click folds; a click anywhere else in the block puts the cursor into the YAML (raw view). */
export const frontmatterClick = EditorView.domEventHandlers({
  mousedown(event, view) {
    const target = event.target as HTMLElement;
    const box = target.closest('.cm-ob-properties');
    if (event.button !== 0 || !box) return false;
    event.preventDefault();
    const start = view.posAtDOM(box);
    if (target.closest('.cm-ob-properties-head')) {
      view.dispatch({ effects: toggleFold.of(start) });
      return true;
    }
    const yamlLine = Number((target.closest('.cm-ob-property') as HTMLElement | null)?.dataset.line ?? 0);
    const line = view.state.doc.lineAt(start).number + 1 + yamlLine;
    const pos = view.state.doc.line(Math.min(line, view.state.doc.lines)).to;
    view.dispatch({ selection: EditorSelection.cursor(pos) });
    view.focus();
    return true;
  },
});

export const frontmatterTheme = EditorView.baseTheme({
  '.cm-ob-properties': {
    margin: '0.3em 0 0.8em',
    padding: '0.3em 0',
    borderBottom: '1px solid var(--vscode-textSeparator-foreground, var(--vscode-editorGroup-border))',
    fontSize: '0.9em',
    cursor: 'text',
  },
  '.cm-ob-properties-head': {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3em',
    color: 'var(--vscode-descriptionForeground)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  '.cm-ob-property': { display: 'flex', gap: '1em', padding: '0.15em 0 0.15em 1.3em' },
  '.cm-ob-property:hover': { backgroundColor: 'var(--vscode-list-hoverBackground)' },
  '.cm-ob-property-key': { flex: '0 0 9em', color: 'var(--vscode-descriptionForeground)', overflowWrap: 'anywhere' },
  '.cm-ob-property-value': { display: 'flex', flexWrap: 'wrap', gap: '0.3em', overflowWrap: 'anywhere' },
  '.cm-ob-chip': {
    padding: '0 0.5em',
    borderRadius: '1em',
    backgroundColor: 'var(--vscode-badge-background)',
    color: 'var(--vscode-badge-foreground)',
  },
});
