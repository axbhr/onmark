import { syntaxTree } from '@codemirror/language';
import { EditorSelection, type EditorState } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { DecorationContext, NodeHandlers } from './context';
import { scopedCss } from './html/sanitize';
import { inlineHtmlUnits } from './html/units';
import { resourceBase } from './images';
import { HtmlBadgeWidget, HtmlWidget } from './widgets/html';

const STYLE = /^\s*<style\b[^>]*>([\s\S]*?)(?:<\/style>|$)/i;
const SCRIPT = /^\s*<script\b/i;

/** Inline HTML (`<kbd>`, `<span style>`, `<br>` …) within one line, rendered unless the cursor touches it. */
function inlineHtml(node: SyntaxNode, ctx: DecorationContext) {
  const { doc } = ctx.state;
  const { base, root } = ctx.state.facet(resourceBase);
  for (const unit of inlineHtmlUnits(node, (from, to) => doc.sliceString(from, to))) {
    // Replacements across line breaks need block decorations; multi-line inline HTML stays raw.
    if (doc.lineAt(unit.from).number !== doc.lineAt(unit.to).number || ctx.touches(unit.from, unit.to)) continue;
    ctx.widget(unit.from, unit.to, new HtmlWidget(doc.sliceString(unit.from, unit.to), true, base, root));
  }
}

export const inlineHtmlHandlers: NodeHandlers = Object.fromEntries(
  ['Paragraph', 'ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6'].map(
    (name) => [name, inlineHtml],
  ),
);

/** HTML blocks render as a block widget unless the cursor is inside; `<style>`/`<script>` show a badge. */
export const htmlBlockHandlers: NodeHandlers = {
  HTMLBlock(node, ctx) {
    const { doc } = ctx.state;
    const from = doc.lineAt(node.from).from;
    const to = doc.lineAt(node.to).to;
    // Only blocks on lines of their own (not nested in lists or quotes).
    if (from !== node.from || ctx.touches(from, to)) return false;
    const source = doc.sliceString(from, to);
    const { base, root } = ctx.state.facet(resourceBase);
    const widget = STYLE.test(source)
      ? new HtmlBadgeWidget('style')
      : SCRIPT.test(source)
        ? new HtmlBadgeWidget('script')
        : new HtmlWidget(source, false, base, root);
    ctx.widget(from, to, widget, true);
    return false;
  },
};

function collectCss(state: EditorState): string {
  const parts: string[] = [];
  for (let node = syntaxTree(state).topNode.firstChild; node; node = node.nextSibling) {
    if (node.name !== 'HTMLBlock') continue;
    const match = STYLE.exec(state.doc.sliceString(node.from, node.to));
    if (match) parts.push(match[1]);
  }
  return parts.join('\n');
}

/** Applies the note's `<style>` blocks as one scoped, constructed stylesheet (allowed by the CSP). */
export const noteStyles = ViewPlugin.fromClass(
  class {
    sheet = new CSSStyleSheet();
    css = '';
    constructor(view: EditorView) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.sheet];
      this.apply(view.state);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) this.apply(u.state);
    }
    apply(state: EditorState) {
      const css = collectCss(state);
      if (css === this.css) return;
      this.css = css;
      this.sheet.replaceSync(scopedCss(css));
    }
    destroy() {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== this.sheet);
    }
  },
);

/**
 * A click on rendered HTML puts the cursor at its start, which reveals the raw text. `<summary>`
 * keeps its native toggle; Ctrl/Cmd+click on links is handled by the link handler before this.
 */
export const htmlClick = EditorView.domEventHandlers({
  mousedown(event, view) {
    const target = event.target as HTMLElement;
    if (target.closest('.cm-om-html summary')) return true;
    const widget = target.closest<HTMLElement>('.cm-om-html, .cm-om-html-badge');
    if (event.button !== 0 || !widget) return false;
    event.preventDefault();
    view.dispatch({ selection: EditorSelection.cursor(view.posAtDOM(widget)) });
    view.focus();
    return true;
  },
});

export const htmlTheme = EditorView.baseTheme({
  '.cm-om-html': { cursor: 'text' },
  // Containing block and paint clip: rendered HTML cannot draw outside its own box.
  // The editor content uses `white-space: pre-wrap`; rendered HTML collapses whitespace like a browser.
  '.cm-om-html-block': { contain: 'paint', position: 'relative', overflowX: 'auto', padding: '0.1em 0', whiteSpace: 'normal' },
  '.cm-om-html-inline': { position: 'relative' },
  '.cm-om-html img': { maxWidth: '100%', height: 'auto' },
  '.cm-om-html summary': { cursor: 'pointer' },
  '.cm-om-html kbd': {
    fontFamily: 'var(--vscode-editor-font-family)',
    fontSize: '0.85em',
    padding: '0.1em 0.4em',
    borderRadius: '3px',
    border: '1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border, currentColor))',
    boxShadow: 'inset 0 -1px 0 var(--vscode-widget-border, var(--vscode-editorWidget-border, transparent))',
    backgroundColor: 'var(--vscode-textCodeBlock-background)',
  },
  '.cm-om-html table': { borderCollapse: 'collapse' },
  '.cm-om-html th, .cm-om-html td': {
    border: '1px solid var(--vscode-editorGroup-border, var(--vscode-textSeparator-foreground))',
    padding: '0.2em 0.6em',
  },
  '.cm-om-html mark': { color: 'inherit', backgroundColor: 'var(--vscode-editor-findMatchHighlightBackground)' },
  '.cm-om-html-badge': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4em',
    padding: '0 0.6em',
    borderRadius: '3px',
    fontSize: '0.85em',
    color: 'var(--vscode-descriptionForeground)',
    backgroundColor: 'var(--vscode-textCodeBlock-background)',
    cursor: 'text',
  },
});
