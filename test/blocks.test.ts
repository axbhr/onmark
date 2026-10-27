import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTreeAvailable } from '@codemirror/language';
import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { blockPreview } from '../webview/livepreview/blocks';
import { calloutHandlers } from '../webview/livepreview/callouts';
import { codeBlockHandlers } from '../webview/livepreview/codeblocks';
import { Frontmatter } from '../webview/livepreview/extensions/frontmatter';
import { Highlight } from '../webview/livepreview/extensions/highlight';
import { flippedFolds, toggleFold } from '../webview/livepreview/folds';
import { frontmatterHandlers } from '../webview/livepreview/frontmatter';
import { resolveImageSrc } from '../webview/livepreview/images';
import { parseProperties } from '../webview/livepreview/properties';
import { tableHandlers } from '../webview/livepreview/tables';

const field = blockPreview({ ...frontmatterHandlers, ...codeBlockHandlers, ...tableHandlers, ...calloutHandlers });
const lang = markdown({ base: markdownLanguage, extensions: [Highlight, Frontmatter] });
const create = (doc: string, folds: Extension = flippedFolds, selection?: EditorSelection | { anchor: number }) =>
  EditorState.create({ doc, selection, extensions: [lang, folds, field] });

const nodeNames = (doc: string) => {
  const names: string[] = [];
  lang.language.parser.parse(doc).iterate({ enter: (n) => void names.push(n.name) });
  return names;
};

/** Comparable dump of a decoration set: positions plus class or widget contents. */
function dump(set: DecorationSet): string[] {
  const out: string[] = [];
  set.between(0, 1e9, (from, to, deco) => {
    const { spec } = deco;
    const what = spec.widget ? `${spec.widget.constructor.name}${JSON.stringify(spec.widget)}` : spec.class ?? 'hide';
    out.push(`${from}-${to} ${what}`);
  });
  return out;
}

describe('Frontmatter extension', () => {
  it('parses closed frontmatter only at the document start', () => {
    expect(nodeNames('---\na: 1\n---\n# H\n')).toContain('Frontmatter');
    expect(nodeNames('text\n\n---\na: 1\n---\n')).not.toContain('Frontmatter');
  });

  it('keeps a following heading out of an unclosed block', () => {
    const names = nodeNames('---\n# Heading\n');
    expect(names).not.toContain('Frontmatter');
    expect(names).toContain('ATXHeading1');
  });
});

describe('parseProperties', () => {
  it('reads scalars, inline lists, block lists and their source lines', () => {
    const yaml = 'title: "Hallo: Welt"\ntags: [a, \'b\']\naliases:\n  - x\n  - y\nempty:';
    expect(parseProperties(yaml)).toEqual([
      { key: 'title', value: 'Hallo: Welt', line: 0 },
      { key: 'tags', value: ['a', 'b'], line: 1 },
      { key: 'aliases', value: ['x', 'y'], line: 2 },
      { key: 'empty', value: '', line: 5 },
    ]);
  });
});

describe('resolveImageSrc', () => {
  const base = 'https://res.test/ws/notes/';
  const root = 'https://res.test/ws/';
  it('resolves relative, root-relative and encoded paths', () => {
    expect(resolveImageSrc('img/a b.png', base, root)).toBe('https://res.test/ws/notes/img/a%20b.png');
    expect(resolveImageSrc('<../x.svg>', base, root)).toBe('https://res.test/ws/x.svg');
    expect(resolveImageSrc('/assets/x.png', base, root)).toBe('https://res.test/ws/assets/x.png');
    expect(resolveImageSrc('sub\\win.png', base, root)).toBe('https://res.test/ws/notes/sub/win.png');
  });

  it('allows only https and data URLs from outside', () => {
    expect(resolveImageSrc('https://example.com/a.png', base, root)).toBe('https://example.com/a.png');
    expect(resolveImageSrc('data:image/png;base64,AAAA', base, root)).toMatch(/^data:/);
    expect(resolveImageSrc('http://example.com/a.png', base, root)).toBeUndefined();
    expect(resolveImageSrc('javascript:alert(1)', base, root)).toBeUndefined();
    expect(resolveImageSrc('', base, root)).toBeUndefined();
  });
});

describe('blockPreview', () => {
  it('renders blocks as widgets/decorations only while the cursor is outside', () => {
    const doc = '| a | b |\n| - | - |\n| 1 | 2 |\n\ntext';
    const outside = create(doc).update({ selection: { anchor: doc.length } }).state;
    expect(dump(outside.field(field).decorations).some((d) => d.includes('TableWidget'))).toBe(true);
    const inside = outside.update({ selection: { anchor: 3 } }).state;
    expect(dump(inside.field(field).decorations).some((d) => d.includes('TableWidget'))).toBe(false);
  });

  it.each([1, 7, 42, 99, 2024])('incremental updates always match a full rebuild (seed %i)', (initialSeed) => {
    // Small enough to be parsed completely on state creation, so a fresh state is a valid reference.
    const doc = [
      '---\ntitle: T\ntags: [a]\n---',
      '# H',
      '```ts\nconst a = 1;\n```',
      '| a | b |\n| :- | -: |\n| **1** | 2 |',
      '> [!note]\n> body',
      '> [!warning]- Folded\n> hidden\n> more',
      '> plain quote',
      '- item\n  ```\n  nested code\n  ```',
      'Paragraph | with pipe',
    ].join('\n\n');
    const snippets = ['|', ' | x |', '`', '```', '\n', '> ', '> [!tip] T\n> b\n', 'x', '---\n', '\n\n'];
    // Deterministic pseudo-random sequence.
    let seed = initialSeed;
    const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) % n);

    let state = create(doc);
    let compared = 0;
    for (let step = 0; step < 400; step++) {
      const len = state.doc.length;
      const kind = rand(4);
      if (kind === 0) {
        const pos = rand(len + 1);
        state = state.update({ changes: { from: pos, insert: snippets[rand(snippets.length)] } }).state;
      } else if (kind === 1 && len > 10) {
        const from = rand(len - 5);
        state = state.update({ changes: { from, to: from + 1 + rand(4) } }).state;
      } else if (kind === 2) {
        state = state.update({ selection: EditorSelection.single(rand(len + 1), rand(len + 1)) }).state;
      } else {
        state = state.update({ effects: toggleFold.of(state.doc.lineAt(rand(len + 1)).from) }).state;
      }
      const folds = state.field(flippedFolds);
      const fresh = create(state.doc.toString(), flippedFolds.init(() => folds), state.selection);
      // Parsing runs on a time budget; under load a tree can be incomplete, which makes the states incomparable.
      const end = state.doc.length;
      if (!syntaxTreeAvailable(state, end) || !syntaxTreeAvailable(fresh, end)) continue;
      compared++;
      expect(dump(state.field(field).decorations), `step ${step}`).toEqual(dump(fresh.field(field).decorations));
      expect(dump(state.field(field).atomic), `step ${step} atomic`).toEqual(dump(fresh.field(field).atomic));
    }
    expect(compared).toBeGreaterThan(300);
  });
});
