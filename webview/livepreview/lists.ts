import { EditorView } from '@codemirror/view';
import type { NodeHandlers } from './context';
import { BulletWidget } from './widgets/bullet';
import { CheckboxWidget } from './widgets/checkbox';

const bullet = new BulletWidget();
const checked = new CheckboxWidget(true);
const unchecked = new CheckboxWidget(false);
const MAX_DEPTH = 5;

export const listHandlers: NodeHandlers = {
  ListMark(node, ctx) {
    const item = node.parent;
    if (!item || ctx.lineActive(node.from)) return;
    const { doc } = ctx.state;

    let depth = -1;
    for (let n: typeof item | null = item; n; n = n.parent) {
      if (n.name === 'BulletList' || n.name === 'OrderedList') depth++;
    }
    ctx.line(node.from, `cm-om-li cm-om-li-d${Math.min(depth, MAX_DEPTH)}`);

    // Indentation is rendered via the line class; only hide the whitespace directly before the marker
    // (never a preceding `>` quote marker).
    let indent = node.from;
    while (indent > doc.lineAt(node.from).from && /[ \t]/.test(doc.sliceString(indent - 1, indent))) indent--;
    ctx.hide(indent, node.from);

    const taskMarker = node.nextSibling?.name === 'Task' ? node.nextSibling.firstChild : null;
    const bulletList = item.parent?.name === 'BulletList';
    const withSpace = (pos: number) => (doc.sliceString(pos, pos + 1) === ' ' ? pos + 1 : pos);
    if (taskMarker?.name === 'TaskMarker') {
      const done = /x/i.test(doc.sliceString(taskMarker.from, taskMarker.to));
      if (done) ctx.line(node.from, 'cm-om-task-done');
      ctx.widget(bulletList ? node.from : taskMarker.from, withSpace(taskMarker.to), done ? checked : unchecked);
    } else if (bulletList) {
      ctx.widget(node.from, withSpace(node.to), bullet);
    }
  },
};

const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])\]/;

/** Toggles the task on the clicked checkbox's line by editing the source text. */
export const checkboxClick = EditorView.domEventHandlers({
  mousedown(event, view) {
    const target = event.target as HTMLElement;
    if (event.button !== 0 || !target.closest('.cm-om-checkbox')) return false;
    event.preventDefault();
    const line = view.state.doc.lineAt(view.posAtDOM(target));
    const match = TASK.exec(line.text);
    if (match) {
      const pos = line.from + match[1].length;
      view.dispatch({ changes: { from: pos, to: pos + 1, insert: match[2] === ' ' ? 'x' : ' ' }, userEvent: 'input' });
    }
    return true;
  },
});

const depthStyles = Object.fromEntries(
  Array.from({ length: MAX_DEPTH + 1 }, (_, d) => [
    `.cm-line.cm-om-li-d${d}`,
    { paddingLeft: `calc(${d * 1.5 + 1.5}em + 6px)`, textIndent: '-1.5em' },
  ]),
);

export const listTheme = EditorView.baseTheme({
  ...depthStyles,
  '.cm-om-bullet': {
    display: 'inline-block',
    width: '1.5em',
    textIndent: '0',
    textAlign: 'center',
    color: 'var(--vscode-descriptionForeground)',
  },
  '.cm-om-checkbox': {
    display: 'inline-block',
    boxSizing: 'border-box',
    width: '1em',
    height: '1em',
    margin: '0 0.35em 0 0.15em',
    verticalAlign: '-0.15em',
    textIndent: '0',
    border: '1px solid var(--vscode-checkbox-border, var(--vscode-descriptionForeground))',
    borderRadius: '3px',
    backgroundColor: 'var(--vscode-checkbox-background)',
    cursor: 'pointer',
  },
  '.cm-om-checkbox[aria-checked=true]': {
    backgroundColor: 'var(--vscode-textLink-foreground)',
    borderColor: 'var(--vscode-textLink-foreground)',
  },
  '.cm-om-checkbox[aria-checked=true]::after': {
    content: '"✓"',
    display: 'block',
    color: 'var(--vscode-editor-background)',
    fontSize: '0.8em',
    lineHeight: '1.15em',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  '.cm-line.cm-om-task-done': {
    color: 'var(--vscode-descriptionForeground)',
    textDecoration: 'line-through',
  },
});
