import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({}));

import { parseLinkTarget } from '../src/editor/links';

describe('parseLinkTarget', () => {
  it('allows only safe external schemes', () => {
    expect(parseLinkTarget('https://example.com/a?b#c')).toEqual({ kind: 'external', url: 'https://example.com/a?b#c' });
    expect(parseLinkTarget('mailto:me@example.com')?.kind).toBe('external');
    expect(parseLinkTarget('command:workbench.action.terminal.new')).toBeUndefined();
    expect(parseLinkTarget('javascript:alert(1)')).toBeUndefined();
    expect(parseLinkTarget('vscode://foo')).toBeUndefined();
  });

  it('resolves relative and root paths, decoded, with fragment', () => {
    expect(parseLinkTarget('sub/My%20Note.md#Intro')).toEqual({
      kind: 'file',
      path: 'sub/My Note.md',
      fromRoot: false,
      fragment: 'Intro',
    });
    expect(parseLinkTarget('<../a b.png>')).toMatchObject({ path: '../a b.png', fromRoot: false });
    expect(parseLinkTarget('/notes/x.md')).toMatchObject({ path: '/notes/x.md', fromRoot: true });
    expect(parseLinkTarget('100%.md')).toMatchObject({ path: '100%.md' });
  });

  it('treats a drive letter as a path and ignores pure anchors', () => {
    expect(parseLinkTarget('C:\\notes\\a.md')).toMatchObject({ kind: 'file', path: 'C:/notes/a.md' });
    expect(parseLinkTarget('#heading')).toBeUndefined();
    expect(parseLinkTarget('  ')).toBeUndefined();
  });
});
