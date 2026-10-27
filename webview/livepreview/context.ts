import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range } from '@codemirror/state';
import { Decoration, WidgetType } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

export interface DecorationContext {
  readonly state: EditorState;
  /** Inline/large-block rule: the selection touches [from, to] (inclusive). */
  touches(from: number, to: number): boolean;
  /** Block rule: a cursor or selection lies on the line containing `pos`. */
  lineActive(pos: number): boolean;
  /** Hides [from, to); hidden ranges are atomic. */
  hide(from: number, to: number): void;
  /** Replaces [from, to) with a widget (or inserts it before `from` if empty); replacements are atomic. */
  widget(from: number, to: number, widget: WidgetType, block?: boolean): void;
  mark(from: number, to: number, cls: string): void;
  line(pos: number, cls: string, attributes?: Record<string, string>): void;
}

/** Called for each syntax node of that name. Returning `false` skips the node's children. */
export type NodeHandlers = Record<string, (node: SyntaxNode, ctx: DecorationContext) => void | false>;

/** Unsorted decorations; `atomic` holds the replacements the cursor must skip over. */
export interface Decorations {
  decorations: Range<Decoration>[];
  atomic: Range<Decoration>[];
}

const hidden = Decoration.replace({});

/** Walks the syntax tree in `ranges`, never descending into `skip` nodes, and collects decorations. */
export function collect(
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  handlers: NodeHandlers,
  skip: ReadonlySet<string>,
): Decorations {
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
    widget(from, to, widget, block = false) {
      if (!once(`w${from}:${to}`)) return;
      const deco =
        from === to ? Decoration.widget({ widget, side: -1, block }) : Decoration.replace({ widget, block });
      decorations.push(deco.range(from, to));
      if (from < to) atomic.push(deco.range(from, to));
    },
    mark(from, to, cls) {
      if (from < to && once(`m${from}:${to}:${cls}`)) decorations.push(Decoration.mark({ class: cls }).range(from, to));
    },
    line(pos, cls, attributes) {
      const start = state.doc.lineAt(pos).from;
      if (once(`l${start}:${cls}`)) decorations.push(Decoration.line({ class: cls, attributes }).range(start));
    },
  };

  const tree = syntaxTree(state);
  for (const { from, to } of ranges) {
    tree.iterate({
      from,
      to,
      enter: (ref) => {
        if (handlers[ref.name]?.(ref.node, ctx) === false || skip.has(ref.name)) return false;
      },
    });
  }
  return { decorations, atomic };
}
