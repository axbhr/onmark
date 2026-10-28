import { EditorView, RectangleMarker, layer } from '@codemirror/view';

/** Line classes whose background is painted by this layer instead of the line element itself. */
const LINE_SOURCES = ['cm-om-codeblock', 'cm-om-callout', 'cm-om-quote'];
/** Inline marks whose background is painted by this layer. */
const INLINE_SELECTOR = '.cm-line .cm-om-code, .cm-line .cm-om-highlight';
const LINE_SELECTOR = LINE_SOURCES.map((c) => `.cm-line.${c}`).join(', ');
const INLINE_SOURCES = ['cm-om-code', 'cm-om-highlight'];

/**
 * Paints backgrounds of code blocks, callouts, quotes, inline code and highlights in a layer *below*
 * the selection layer. Painted on the elements themselves, they would hide the selection, which
 * CodeMirror draws behind the text.
 */
export const backgroundLayer = layer({
  above: false,
  class: 'cm-om-bg-layer',
  update: (update) => update.docChanged || update.viewportChanged || update.selectionSet || update.transactions.length > 0,
  markers(view) {
    const scroller = view.scrollDOM.getBoundingClientRect();
    const baseLeft = scroller.left - view.scrollDOM.scrollLeft;
    const baseTop = scroller.top - view.scrollDOM.scrollTop;
    const markers: RectangleMarker[] = [];
    const add = (rect: DOMRect, classes: string[]) => {
      if (rect.width <= 0 || rect.height <= 0) return;
      const cls = ['cm-om-bg', ...classes].join(' ');
      markers.push(new RectangleMarker(cls, rect.left - baseLeft, rect.top - baseTop, rect.width, rect.height));
    };
    for (const line of view.contentDOM.querySelectorAll<HTMLElement>(LINE_SELECTOR)) {
      add(
        line.getBoundingClientRect(),
        [...line.classList].filter((c) => LINE_SOURCES.some((s) => c.startsWith(s))),
      );
    }
    for (const span of view.contentDOM.querySelectorAll<HTMLElement>(INLINE_SELECTOR)) {
      const classes = [...span.classList].filter((c) => INLINE_SOURCES.includes(c));
      for (const rect of span.getClientRects()) add(rect, classes);
    }
    return markers;
  },
});

export const backgroundTheme = EditorView.baseTheme({
  '.cm-om-bg-layer .cm-om-bg': { position: 'absolute' },
  // The elements themselves stay transparent so the selection layer below shows through.
  [INLINE_SELECTOR]: { backgroundColor: 'transparent' },
});
