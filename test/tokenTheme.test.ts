import { describe, expect, it } from 'vitest';
import { customizationRules, resolveScope, resolveTokenTheme, type TokenRule } from '../src/theme/tokenTheme';

const rules: TokenRule[] = [
  { settings: { foreground: '#default' } },
  { scope: 'comment', settings: { foreground: '#comment', fontStyle: 'italic' } },
  { scope: ['keyword', 'storage'], settings: { foreground: '#keyword' } },
  { scope: 'keyword.control, keyword.other.using', settings: { foreground: '#control' } },
  { scope: 'keyword.operator', settings: { foreground: '#operator' } },
  { scope: 'source.ts keyword.control', settings: { foreground: '#ts-only' } },
  { scope: 'entity', settings: { foreground: '#entity' } },
  { scope: 'entity.name.function', settings: { fontStyle: 'bold' } },
];

describe('resolveScope', () => {
  it('picks the most specific selector', () => {
    expect(resolveScope(rules, 'keyword.control.import')).toEqual({ color: '#control' });
    expect(resolveScope(rules, 'keyword')).toEqual({ color: '#keyword' });
    expect(resolveScope(rules, 'storage.type')).toEqual({ color: '#keyword' });
  });

  it('resolves color and font style independently', () => {
    expect(resolveScope(rules, 'entity.name.function')).toEqual({ color: '#entity', fontStyle: 'bold' });
    expect(resolveScope(rules, 'comment.block.documentation')).toEqual({ color: '#comment', fontStyle: 'italic' });
  });

  it('ignores scope-less defaults, descendant selectors and partial segment matches', () => {
    expect(resolveScope(rules, 'string')).toEqual({});
    expect(resolveScope([{ scope: 'key', settings: { foreground: '#x' } }], 'keyword')).toEqual({});
  });

  it('lets later rules win ties and honors exclusions', () => {
    const r: TokenRule[] = [
      { scope: 'string', settings: { foreground: '#a' } },
      { scope: 'string', settings: { foreground: '#b' } },
      { scope: 'keyword - keyword.operator', settings: { foreground: '#kw' } },
    ];
    expect(resolveScope(r, 'string.quoted')).toEqual({ color: '#b' });
    expect(resolveScope(r, 'keyword.control')).toEqual({ color: '#kw' });
    expect(resolveScope(r, 'keyword.operator.new')).toEqual({});
  });
});

describe('resolveTokenTheme', () => {
  it('maps token kinds through their scopes', () => {
    const theme = resolveTokenTheme(rules);
    expect(theme.controlKeyword).toEqual({ color: '#control' });
    expect(theme.operator).toEqual({ color: '#operator' });
    expect(theme.string).toBeUndefined();
  });
});

describe('customizationRules', () => {
  it('applies global and theme-scoped customizations after the theme', () => {
    const custom = {
      comments: '#c1',
      textMateRules: [{ scope: 'string', settings: { foreground: '#s1' } }],
      '[GitHub Dark][Other]': { keywords: { foreground: '#k1', fontStyle: 'bold' } },
      '[Unrelated]': { comments: '#nope' },
    };
    const theme = resolveTokenTheme([...rules, ...customizationRules(custom, ['GitHub Dark'])]);
    expect(theme.comment).toEqual({ color: '#c1', fontStyle: 'italic' });
    expect(theme.string).toEqual({ color: '#s1' });
    expect(theme.controlKeyword).toEqual({ color: '#k1', fontStyle: 'bold' });
    expect(theme.operator).toEqual({ color: '#operator' });
  });

  it('tolerates missing or malformed settings', () => {
    expect(customizationRules(undefined, ['x'])).toEqual([]);
    expect(customizationRules('nope', ['x'])).toEqual([]);
  });
});
