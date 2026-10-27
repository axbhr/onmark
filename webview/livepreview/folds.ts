import { StateEffect, StateField } from '@codemirror/state';

/** Toggles the fold state of the collapsible block (callout, frontmatter) starting at `pos`. */
export const toggleFold = StateEffect.define<number>({ map: (pos, mapping) => mapping.mapPos(pos) });

/**
 * Start positions of blocks whose fold state the user flipped from its default. View state only:
 * folding never edits the file.
 */
export const flippedFolds = StateField.define<ReadonlySet<number>>({
  create: () => new Set(),
  update(value, tr) {
    const toggles = tr.effects.filter((e) => e.is(toggleFold));
    if (!tr.docChanged && toggles.length === 0) return value;
    const next = new Set([...value].map((pos) => tr.changes.mapPos(pos)));
    for (const { value: pos } of toggles) if (!next.delete(pos)) next.add(pos);
    return next;
  },
});
