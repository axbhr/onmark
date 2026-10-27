import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import { Annotation, EditorSelection, EditorState, Transaction, type Text } from '@codemirror/state';
import { EditorView, drawSelection, keymap } from '@codemirror/view';
import { minimalDiff, type Change, type Pos } from '../src/shared/text';
import { editorTheme, markdownHighlight } from './theme';

/** Marks transactions that came from the host so they are not echoed back. */
const remoteUpdate = Annotation.define<boolean>();

export interface ViewState {
  anchor: number;
  head: number;
  scrollTop: number;
}

export interface EditorOptions {
  parent: HTMLElement;
  text: string;
  nonce: string;
  restore?: ViewState;
  onEdit(changes: Change[]): void;
  onViewState(state: ViewState): void;
}

export interface Editor {
  applyRemote(text: string): void;
}

const toPos = (doc: Text, offset: number): Pos => {
  const line = doc.lineAt(offset);
  return { line: line.number - 1, ch: offset - line.from };
};

const isUndoRedo = (e: KeyboardEvent) =>
  (e.ctrlKey || e.metaKey) && !e.altKey && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y');

export function createEditor(options: EditorOptions): Editor {
  const { restore } = options;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const saveViewState = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { anchor, head } = view.state.selection.main;
      options.onViewState({ anchor, head, scrollTop: view.scrollDOM.scrollTop });
    }, 200);
  };

  const length = options.text.length;
  const view = new EditorView({
    parent: options.parent,
    state: EditorState.create({
      doc: options.text,
      selection: restore
        ? EditorSelection.single(Math.min(restore.anchor, length), Math.min(restore.head, length))
        : undefined,
      extensions: [
        history(),
        drawSelection(),
        search({ top: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(markdownHighlight),
        editorTheme,
        EditorView.lineWrapping,
        EditorView.cspNonce.of(options.nonce),
        EditorView.updateListener.of((update) => {
          for (const tr of update.transactions) {
            if (!tr.docChanged || tr.annotation(remoteUpdate)) continue;
            const changes: Change[] = [];
            tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
              const doc = tr.startState.doc;
              changes.push({ from: toPos(doc, fromA), to: toPos(doc, toA), insert: inserted.toString() });
            });
            options.onEdit(changes);
          }
          if (update.selectionSet || update.docChanged) saveViewState();
        }),
      ],
    }),
  });

  // VS Code forwards every keydown that bubbles up to the webview window to its own keybindings.
  // Swallow keys CM6 already handled (and undo/redo always) so undo, find etc. never run twice.
  view.dom.addEventListener('keydown', (e) => {
    if (!e.defaultPrevented && !isUndoRedo(e)) return;
    e.preventDefault();
    e.stopPropagation();
  });
  view.scrollDOM.addEventListener('scroll', saveViewState, { passive: true });

  if (restore) requestAnimationFrame(() => (view.scrollDOM.scrollTop = restore.scrollTop));
  view.focus();

  return {
    applyRemote(text) {
      const diff = minimalDiff(view.state.doc.toString(), text);
      if (diff.from === diff.to && !diff.insert) return;
      view.dispatch({
        changes: diff,
        annotations: [remoteUpdate.of(true), Transaction.addToHistory.of(false)],
      });
    },
  };
}
