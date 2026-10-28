import { parser } from '@lezer/markdown';
import { describe, expect, it } from 'vitest';
import { inlineHtmlUnits, parseTag } from '../webview/livepreview/html/units';

const units = (text: string) => {
  const paragraph = parser.parse(text).topNode.firstChild!;
  return inlineHtmlUnits(paragraph, (from, to) => text.slice(from, to)).map((u) => text.slice(u.from, u.to));
};

describe('parseTag', () => {
  it('reads open, close, void and self-closing tags', () => {
    expect(parseTag('<span class="a">')).toEqual({ name: 'span', closing: false, single: false });
    expect(parseTag('</SPAN>')).toEqual({ name: 'span', closing: true, single: false });
    expect(parseTag('<br>')).toMatchObject({ single: true });
    expect(parseTag('<x-y/>')).toMatchObject({ name: 'x-y', single: true });
    expect(parseTag('<!-- c -->')).toBeUndefined();
  });
});

describe('inlineHtmlUnits', () => {
  it('pairs outermost elements and keeps void tags on their own', () => {
    expect(units('a <kbd>K</kbd> b <br> c <span><b>x</b></span>')).toEqual(['<kbd>K</kbd>', '<br>', '<span><b>x</b></span>']);
  });

  it('leaves unmatched tags raw', () => {
    expect(units('a <span>open only')).toEqual([]);
    expect(units('a </b> b')).toEqual([]);
  });
});
