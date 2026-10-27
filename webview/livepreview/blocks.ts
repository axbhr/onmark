import { syntaxTree } from '@codemirror/language';
import { StateField, type EditorState, type Range, type Transaction } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { collect, type NodeHandlers } from './context';
import { flippedFolds } from './folds';

/** Leaf blocks whose children are inline content; block handlers never need to look inside. */
const SKIP = new Set([
  'Paragraph',
  'ATXHeading1',
  'ATXHeading2',
  'ATXHeading3',
  'ATXHeading4',
  'ATXHeading5',
  'ATXHeading6',
  'SetextHeading1',
  'SetextHeading2',
  'FencedCode',
  'CodeBlock',
  'Frontmatter',
  'HTMLBlock',
  'CommentBlock',
]);

/**
 * A top-level block and what its decorations depend on besides its own text. `from`/`to` cover whole
 * lines: blocks may start after indentation while their line decorations sit at the line start.
 */
interface Entry {
  name: string;
  from: number;
  to: number;
  key: string;
}

interface BlockState {
  entries: Entry[];
  decorations: DecorationSet;
  atomic: DecorationSet;
}

/** Above this many changed blocks a full rebuild is cheaper than incremental updates. */
const MAX_INCREMENTAL = 40;

/** Per block: selection ranges on its lines and flipped folds inside it. */
function dependencies(state: EditorState) {
  const selection = state.selection.ranges.map((r) => ({
    key: `${r.from}:${r.to};`,
    from: state.doc.lineAt(r.from).from,
    to: state.doc.lineAt(r.to).to,
  }));
  const folds = [...state.field(flippedFolds)];
  return (from: number, to: number) => {
    let key = '';
    for (const r of selection) if (r.from <= to && r.to >= from) key += r.key;
    for (const pos of folds) if (pos >= from && pos <= to) key += `f${pos};`;
    return key;
  };
}

/**
 * Block live preview. Block widgets and replacements spanning line breaks must come from a StateField,
 * which has no viewport, so it covers the whole document. To stay fast on large files, one decoration
 * set is updated in place: only top-level blocks whose text, position, selection overlap or fold state
 * changed are rebuilt; everything else is mapped, which keeps unchanged chunks shared so CodeMirror's
 * diffing can skip them.
 */
export function blockPreview(handlers: NodeHandlers) {
  const decorate = (state: EditorState, node: { from: number; to: number }) =>
    collect(state, [node], handlers, SKIP);

  function build(state: EditorState, previous?: BlockState, tr?: Transaction): BlockState {
    const mapped = new Map<number, Entry>();
    const clear: { from: number; to: number }[] = [];
    for (const e of previous?.entries ?? []) {
      if (tr?.docChanged && tr.changes.touchesRange(e.from, e.to)) {
        clear.push({ from: tr.changes.mapPos(e.from, -1), to: tr.changes.mapPos(e.to, 1) });
      } else if (tr?.docChanged) {
        const from = tr.changes.mapPos(e.from);
        mapped.set(from, { ...e, from, to: tr.changes.mapPos(e.to, -1) });
      } else {
        mapped.set(e.from, e);
      }
    }

    const entries: Entry[] = [];
    const dirty: { from: number; to: number }[] = [];
    const keyOf = dependencies(state);
    for (let node = syntaxTree(state).topNode.firstChild; node; node = node.nextSibling) {
      if (SKIP.has(node.name) && !handlers[node.name]) continue;
      const from = state.doc.lineAt(node.from).from;
      const to = state.doc.lineAt(node.to).to;
      const entry = { name: node.name, from, to, key: keyOf(from, to) };
      const old = mapped.get(from);
      if (old && old.name === entry.name && old.to === entry.to && old.key === entry.key) {
        mapped.delete(from);
      } else {
        dirty.push(entry);
      }
      entries.push(entry);
    }
    // Blocks that vanished or changed shape.
    for (const old of mapped.values()) clear.push(old);

    if (!previous || !tr || dirty.length + clear.length > MAX_INCREMENTAL) {
      const all = entries.map((e) => decorate(state, e));
      return {
        entries,
        decorations: Decoration.set(all.flatMap((d) => d.decorations), true),
        atomic: Decoration.set(all.flatMap((d) => d.atomic), true),
      };
    }

    let decorations = previous.decorations.map(tr.changes);
    let atomic = previous.atomic.map(tr.changes);
    const remove = (set: DecorationSet, r: { from: number; to: number }) =>
      set.update({ filterFrom: r.from, filterTo: r.to, filter: (from, to) => from < r.from || to > r.to });
    for (const r of [...clear, ...dirty]) {
      decorations = remove(decorations, r);
      atomic = remove(atomic, r);
    }
    const added = dirty.map((e) => decorate(state, e));
    const add = (pick: (d: ReturnType<typeof decorate>) => Range<Decoration>[]) =>
      added.flatMap(pick);
    decorations = decorations.update({ add: add((d) => d.decorations), sort: true });
    atomic = atomic.update({ add: add((d) => d.atomic), sort: true });
    return { entries, decorations, atomic };
  }

  const changed = (tr: Transaction) =>
    tr.docChanged || tr.selection || tr.effects.length > 0 || syntaxTree(tr.startState) !== syntaxTree(tr.state);

  return StateField.define<BlockState>({
    create: (state) => build(state),
    update: (value, tr) => (changed(tr) ? build(tr.state, value, tr) : value),
    provide: (f) => [
      EditorView.decorations.from(f, (v) => v.decorations),
      EditorView.atomicRanges.of((view) => view.state.field(f, false)?.atomic ?? Decoration.none),
    ],
  });
}
