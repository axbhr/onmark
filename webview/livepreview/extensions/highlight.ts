import { Tag } from '@lezer/highlight';
import type { MarkdownConfig } from '@lezer/markdown';

export const highlightTag = Tag.define();

const HighlightDelim = { resolve: 'Highlight', mark: 'HighlightMark' };
const EQUALS = 61;
const punctuation = /[\p{S}\p{P}]/u;

/** Obsidian `==highlight==`, modeled on @lezer/markdown's GFM Strikethrough extension. */
export const Highlight: MarkdownConfig = {
  defineNodes: [
    { name: 'Highlight', style: { 'Highlight/...': highlightTag } },
    { name: 'HighlightMark', style: highlightTag },
  ],
  parseInline: [
    {
      name: 'Highlight',
      parse(cx, next, pos) {
        if (next !== EQUALS || cx.char(pos + 1) !== EQUALS || cx.char(pos + 2) === EQUALS) return -1;
        const before = cx.slice(pos - 1, pos);
        const after = cx.slice(pos + 2, pos + 3);
        const sBefore = /\s|^$/.test(before);
        const sAfter = /\s|^$/.test(after);
        const pBefore = punctuation.test(before);
        const pAfter = punctuation.test(after);
        return cx.addDelimiter(
          HighlightDelim,
          pos,
          pos + 2,
          !sAfter && (!pAfter || sBefore || pBefore),
          !sBefore && (!pBefore || sAfter || pAfter),
        );
      },
      after: 'Emphasis',
    },
  ],
};
