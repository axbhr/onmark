import { TOKEN_SCOPES, type TokenKey, type TokenStyle, type TokenTheme } from '../shared/tokens';

export interface TokenRule {
  scope?: string | string[];
  settings?: { foreground?: string; fontStyle?: string };
}

/**
 * Specificity of `selector` for a single `scope` (number of matched segments), or -1 if it doesn't match.
 * Supports `a, b` lists and `a - b` exclusions.
 * ponytail: descendant selectors (`source.ts keyword`) are skipped because a code token here has no
 * parent scopes; that loses a few language-specific overrides. Upgrade path: pass the scope stack.
 */
function score(selector: string, scope: string): number {
  const [include, ...excludes] = selector.split(' - ').map((s) => s.trim());
  if (!include || include.includes(' ')) return -1;
  const matches = (sel: string) => scope === sel || scope.startsWith(`${sel}.`);
  if (!matches(include) || excludes.some(matches)) return -1;
  return include.split('.').length;
}

function selectors(rule: TokenRule): string[] {
  const { scope } = rule;
  if (!scope) return [];
  return (Array.isArray(scope) ? scope : scope.split(',')).map((s) => s.trim()).filter(Boolean);
}

/** Resolves foreground and fontStyle independently, like VS Code: most specific rule wins, later wins ties. */
export function resolveScope(rules: readonly TokenRule[], scope: string): TokenStyle {
  const best = { color: -1, fontStyle: -1 };
  const style: TokenStyle = {};
  for (const rule of rules) {
    const s = Math.max(-1, ...selectors(rule).map((sel) => score(sel, scope)));
    if (s < 0) continue;
    const { foreground, fontStyle } = rule.settings ?? {};
    if (foreground && s >= best.color) {
      best.color = s;
      style.color = foreground;
    }
    if (fontStyle !== undefined && s >= best.fontStyle) {
      best.fontStyle = s;
      style.fontStyle = fontStyle;
    }
  }
  return style;
}

export function resolveTokenTheme(rules: readonly TokenRule[]): TokenTheme {
  const theme: TokenTheme = {};
  for (const key of Object.keys(TOKEN_SCOPES) as TokenKey[]) {
    const style = resolveScope(rules, TOKEN_SCOPES[key]);
    if (style.color || style.fontStyle) theme[key] = style;
  }
  return theme;
}

/** Scopes behind the shorthand keys of `editor.tokenColorCustomizations` (taken from VS Code). */
const GROUP_SCOPES: Record<string, string[]> = {
  comments: ['comment', 'punctuation.definition.comment'],
  strings: ['string', 'meta.embedded.assembly'],
  keywords: ['keyword - keyword.operator', 'keyword.control', 'storage', 'storage.type'],
  numbers: ['constant.numeric'],
  types: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
  functions: ['entity.name.function', 'support.function'],
  variables: ['variable', 'entity.name.variable'],
};

type Customization = Record<string, unknown>;

function rulesFrom(custom: Customization): TokenRule[] {
  const rules: TokenRule[] = [];
  for (const [group, scope] of Object.entries(GROUP_SCOPES)) {
    const value = custom[group];
    if (typeof value === 'string') rules.push({ scope, settings: { foreground: value } });
    else if (value && typeof value === 'object') rules.push({ scope, settings: value as TokenRule['settings'] });
  }
  if (Array.isArray(custom.textMateRules)) rules.push(...(custom.textMateRules as TokenRule[]));
  return rules;
}

/**
 * Rules from `editor.tokenColorCustomizations`: global ones first, then `[Theme Name]` blocks.
 * ponytail: wildcard theme keys (`[*Dark*]`) are ignored.
 */
export function customizationRules(custom: unknown, themeNames: readonly string[]): TokenRule[] {
  if (!custom || typeof custom !== 'object') return [];
  const entries = Object.entries(custom as Customization);
  const scoped = entries
    .filter(([key, value]) => {
      const names = key.match(/\[[^\]]+\]/g)?.map((k) => k.slice(1, -1));
      return names?.some((n) => themeNames.includes(n)) && value && typeof value === 'object';
    })
    .flatMap(([, value]) => rulesFrom(value as Customization));
  return [...rulesFrom(custom as Customization), ...scoped];
}
