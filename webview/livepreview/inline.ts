import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

export interface DecorationContext {
  readonly state: EditorState;
  /** Inline rule: the selection touches [from, to] (inclusive). */
  touches(from: number, to: number): boolean;
  /** Block rule: a cursor or selection lies on the line containing `pos`. */
  lineActive(pos: number): boolean;
  /** Hides [from, to); hidden ranges are atomic. */
  hide(from: number, to: number): void;
  /** Replaces [from, to) with a widget; atomic. */
  widget(from: number, to: number, widget: WidgetType): void;
  mark(from: number, to: number, cls: string): void;
  line(pos: number, cls: string): void;
}

/** Called for each syntax node of that name in the visible ranges. */
export type NodeHandlers = Record<string, (node: SyntaxNode, ctx: DecorationContext) => void>;

const hidden = Decoration.replace({});

function build(view: EditorView, handlers: NodeHandlers) {
  const { state } = view;
  const decorations: Range<Decoration>[] = [];
  const atomic: Range<Decoration>[] = [];
  // Nodes spanning several visible ranges are visited more than once.
  const seen = new Set<string>();
  const once = (key: string) => !seen.has(key) && !!seen.add(key);

  const activeLines = new Set<number>();
  for (const r of state.selection.ranges) {
    const last = state.doc.lineAt(r.to).number;
    for (let n = state.doc.lineAt(r.from).number; n <= last; n++) activeLines.add(n);
  }

  const ctx: DecorationContext = {
    state,
    touches: (from, to) => state.selection.ranges.some((r) => r.from <= to && r.to >= from),
    lineActive: (pos) => activeLines.has(state.doc.lineAt(pos).number),
    hide(from, to) {
      if (from >= to || !once(`h${from}:${to}`)) return;
      decorations.push(hidden.range(from, to));
      atomic.push(hidden.range(from, to));
    },
    widget(from, to, widget) {
      if (!once(`w${from}:${to}`)) return;
      const deco = Decoration.replace({ widget }).range(from, to);
      decorations.push(deco);
      atomic.push(deco);
    },
    mark(from, to, cls) {
      if (from < to && once(`m${from}:${to}:${cls}`)) decorations.push(Decoration.mark({ class: cls }).range(from, to));
    },
    line(pos, cls) {
      const start = state.doc.lineAt(pos).from;
      if (once(`l${start}:${cls}`)) decorations.push(Decoration.line({ class: cls }).range(start));
    },
  };

  const tree = syntaxTree(state);
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (ref) => {
        handlers[ref.name]?.(ref.node, ctx);
      },
    });
  }
  return { decorations: Decoration.set(decorations, true), atomic: Decoration.set(atomic, true) };
}

/**
 * Inline live preview: decorations are computed from the Lezer tree for the visible ranges only and
 * rebuilt when the document, viewport, selection or parse tree changes.
 */
export function inlinePreview(handlers: NodeHandlers) {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      atomic: DecorationSet;
      constructor(view: EditorView) {
        ({ decorations: this.decorations, atomic: this.atomic } = build(view, handlers));
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged || u.selectionSet || syntaxTree(u.startState) !== syntaxTree(u.state)) {
          ({ decorations: this.decorations, atomic: this.atomic } = build(u.view, handlers));
        }
      }
    },
    { decorations: (p) => p.decorations },
  );
  return [plugin, EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none)];
}
