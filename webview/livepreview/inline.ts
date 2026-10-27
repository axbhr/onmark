import { syntaxTree } from '@codemirror/language';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { collect, type NodeHandlers } from './context';

/** Inline decorations never apply inside these; their content is code or handled by block decorations. */
const SKIP = new Set(['FencedCode', 'CodeBlock', 'Frontmatter', 'HTMLBlock', 'CommentBlock']);

/**
 * Inline live preview: decorations are computed from the Lezer tree for the visible ranges only and
 * rebuilt when the document, viewport, selection or parse tree changes.
 */
export function inlinePreview(handlers: NodeHandlers) {
  const build = (state: EditorState, ranges: readonly { from: number; to: number }[]) => {
    const { decorations, atomic } = collect(state, ranges, handlers, SKIP);
    return { decorations: Decoration.set(decorations, true), atomic: Decoration.set(atomic, true) };
  };
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      atomic: DecorationSet;
      constructor(view: EditorView) {
        ({ decorations: this.decorations, atomic: this.atomic } = build(view.state, view.visibleRanges));
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged || u.selectionSet || syntaxTree(u.startState) !== syntaxTree(u.state)) {
          ({ decorations: this.decorations, atomic: this.atomic } = build(u.state, u.view.visibleRanges));
        }
      }
    },
    { decorations: (p) => p.decorations },
  );
  return [plugin, EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none)];
}
