import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

const muted = 'var(--vscode-descriptionForeground)';
const link = 'var(--vscode-textLink-foreground)';

/** CM6 overrides; all colors come from VS Code theme variables so theme switches apply instantly. */
export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--vscode-editor-foreground)',
    backgroundColor: 'var(--vscode-editor-background)',
    fontFamily: 'var(--ob-font-family)',
    fontSize: 'var(--ob-font-size)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.6' },
  '.cm-content': {
    maxWidth: 'var(--ob-max-width)',
    margin: '0 auto',
    padding: '24px 32px',
    boxSizing: 'border-box',
    caretColor: 'var(--vscode-editorCursor-foreground)',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--vscode-editorCursor-foreground)' },
  '.cm-selectionBackground': { backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--vscode-editor-selectionBackground)',
  },
  '.cm-searchMatch': { backgroundColor: 'var(--vscode-editor-findMatchHighlightBackground)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--vscode-editor-findMatchBackground)' },
  '.cm-panels': {
    backgroundColor: 'var(--vscode-editorWidget-background)',
    color: 'var(--vscode-editorWidget-foreground)',
    fontFamily: 'var(--vscode-font-family)',
    fontSize: 'var(--vscode-font-size)',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--vscode-editorWidget-border, transparent)' },
  '.cm-textfield': {
    backgroundColor: 'var(--vscode-input-background)',
    color: 'var(--vscode-input-foreground)',
    border: '1px solid var(--vscode-input-border, transparent)',
  },
  '.cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'var(--vscode-button-secondaryBackground)',
    color: 'var(--vscode-button-secondaryForeground)',
    border: 'none',
  },
  '.cm-panel.cm-search label': { color: 'var(--vscode-editorWidget-foreground)' },
});

/** Plain Markdown highlighting (phase 1); live preview decorations come later. */
export const markdownHighlight = HighlightStyle.define([
  { tag: t.heading, fontWeight: 'bold' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: link },
  {
    tag: t.monospace,
    fontFamily: 'var(--vscode-editor-font-family)',
    color: 'var(--vscode-textPreformat-foreground)',
  },
  { tag: t.quote, color: muted },
  { tag: [t.processingInstruction, t.meta, t.contentSeparator, t.labelName], color: muted },
]);
