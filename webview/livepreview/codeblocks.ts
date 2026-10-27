import { syntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import type { NodeHandlers } from './context';
import { CodeHeaderWidget } from './widgets/codeHeader';

export const codeBlockHandlers: NodeHandlers = {
  FencedCode(node, ctx) {
    const { doc } = ctx.state;
    const first = doc.lineAt(node.from);
    const last = doc.lineAt(node.to);
    for (let n = first.number; n <= last.number; n++) {
      const edge = n === first.number ? ' cm-om-codeblock-begin' : n === last.number ? ' cm-om-codeblock-end' : '';
      ctx.line(doc.line(n).from, `cm-om-codeblock${edge}`);
    }
    // Fences are only shown while the cursor is inside the block. Their lines stay so heights never change.
    if (ctx.touches(node.from, node.to)) return;
    const marks = node.getChildren('CodeMark');
    const info = node.getChild('CodeInfo');
    const language = info ? doc.sliceString(info.from, info.to) : '';
    if (marks[0]) ctx.widget(marks[0].from, first.to, new CodeHeaderWidget(language));
    if (marks.length > 1 && last.number > first.number) ctx.hide(marks[1].from, marks[1].to);
  },
};

/** Copy button: sends the code of the block (exactly as in the source) to `copy`. */
export function codeBlockCopy(copy: (text: string) => void) {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const button = (event.target as HTMLElement).closest('.cm-om-code-copy');
      if (event.button !== 0 || !button) return false;
      event.preventDefault();
      for (let node = syntaxTree(view.state).resolveInner(view.posAtDOM(button), 1); node; node = node.parent!) {
        if (node.name !== 'FencedCode') continue;
        const text = node.getChild('CodeText');
        copy(text ? view.state.sliceDoc(text.from, text.to) : '');
        break;
      }
      return true;
    },
  });
}

export const codeBlockTheme = EditorView.baseTheme({
  '.cm-line.cm-om-codeblock': {
    fontFamily: 'var(--vscode-editor-font-family)',
    fontSize: 'var(--vscode-editor-font-size)',
    fontWeight: 'var(--vscode-editor-font-weight)',
    backgroundColor: 'var(--vscode-textCodeBlock-background)',
    padding: '0 1em',
    borderLeft: '1px solid var(--vscode-contrastBorder, transparent)',
    borderRight: '1px solid var(--vscode-contrastBorder, transparent)',
  },
  '.cm-line.cm-om-codeblock-begin': {
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
    boxShadow: 'inset 0 1px 0 var(--vscode-contrastBorder, transparent)',
  },
  '.cm-line.cm-om-codeblock-end': {
    borderBottomLeftRadius: '4px',
    borderBottomRightRadius: '4px',
    boxShadow: 'inset 0 -1px 0 var(--vscode-contrastBorder, transparent)',
  },
  '.cm-om-code-header': {
    display: 'inline-flex',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    verticalAlign: 'top',
    color: 'var(--vscode-descriptionForeground)',
    fontFamily: 'var(--vscode-font-family)',
    fontSize: '0.85em',
  },
  '.cm-om-code-copy': {
    display: 'inline-flex',
    padding: '0 2px',
    border: 'none',
    borderRadius: '3px',
    background: 'none',
    color: 'var(--vscode-icon-foreground)',
    cursor: 'pointer',
  },
  '.cm-om-code-copy:hover': { backgroundColor: 'var(--vscode-toolbar-hoverBackground)' },
});
