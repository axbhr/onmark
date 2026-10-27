import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t, type Tag } from '@lezer/highlight';
import type { TokenKey, TokenStyle, TokenTheme } from '../src/shared/tokens';

const TAGS: Record<TokenKey, Tag[]> = {
  comment: [t.comment],
  docComment: [t.docComment],
  keyword: [t.keyword],
  controlKeyword: [t.controlKeyword],
  moduleKeyword: [t.moduleKeyword],
  definitionKeyword: [t.definitionKeyword],
  modifier: [t.modifier],
  operatorKeyword: [t.operatorKeyword],
  operator: [t.operator],
  self: [t.self],
  string: [t.string, t.docString, t.character, t.attributeValue, t.special(t.string)],
  regexp: [t.regexp],
  escape: [t.escape],
  number: [t.number],
  bool: [t.bool],
  null: [t.null],
  atom: [t.atom],
  constant: [t.constant(t.variableName), t.constant(t.name)],
  variable: [t.variableName, t.definition(t.variableName)],
  property: [t.propertyName, t.definition(t.propertyName)],
  function: [
    t.function(t.variableName),
    t.function(t.definition(t.variableName)),
    t.function(t.propertyName),
    t.macroName,
  ],
  type: [t.typeName, t.standard(t.typeName)],
  class: [t.className, t.definition(t.className)],
  namespace: [t.namespace],
  tag: [t.tagName],
  attribute: [t.attributeName],
  annotation: [t.annotation],
  punctuation: [t.punctuation],
  invalid: [t.invalid],
};

const v = (name: string) => ({ color: `var(--vscode-${name})` });

/** Used when the theme file is not reachable (e.g. remote extension host): theme colors that webviews do get. */
const FALLBACK: TokenTheme = {
  comment: v('descriptionForeground'),
  keyword: v('symbolIcon-keywordForeground'),
  operatorKeyword: v('symbolIcon-operatorForeground'),
  string: v('debugTokenExpression-string'),
  regexp: v('debugTokenExpression-string'),
  escape: v('debugTokenExpression-value'),
  number: v('debugTokenExpression-number'),
  bool: v('debugTokenExpression-boolean'),
  null: v('debugTokenExpression-boolean'),
  atom: v('debugTokenExpression-boolean'),
  constant: v('symbolIcon-constantForeground'),
  property: v('debugTokenExpression-name'),
  function: v('symbolIcon-functionForeground'),
  type: v('symbolIcon-classForeground'),
  class: v('symbolIcon-classForeground'),
  namespace: v('symbolIcon-namespaceForeground'),
  tag: v('debugTokenExpression-name'),
  attribute: v('symbolIcon-propertyForeground'),
  invalid: v('errorForeground'),
};

function css({ color, fontStyle }: TokenStyle) {
  const style: Record<string, string> = {};
  if (color) style.color = color;
  if (fontStyle !== undefined) {
    style.fontStyle = fontStyle.includes('italic') ? 'italic' : 'normal';
    style.fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal';
    const decorations = ['underline', 'strikethrough'].filter((d) => fontStyle.includes(d));
    style.textDecoration = decorations.map((d) => (d === 'strikethrough' ? 'line-through' : d)).join(' ') || 'none';
  }
  return style;
}

function codeHighlight(tokens: TokenTheme): Extension {
  const theme = Object.keys(tokens).length > 0 ? tokens : FALLBACK;
  const specs = (Object.keys(TAGS) as TokenKey[])
    .filter((key) => theme[key])
    .map((key) => ({ tag: TAGS[key], ...css(theme[key]!) }));
  return syntaxHighlighting(HighlightStyle.define(specs));
}

const isDark = () =>
  document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast');

const tokenCompartment = new Compartment();
const darkCompartment = new Compartment();

/** Code token colors of the active VS Code theme plus CM6's light/dark flag, both swappable at runtime. */
export function vscodeTheme(tokens: TokenTheme): Extension {
  return [tokenCompartment.of(codeHighlight(tokens)), darkCompartment.of(EditorView.darkTheme.of(isDark()))];
}

export function setTokenTheme(view: EditorView, tokens: TokenTheme): void {
  view.dispatch({ effects: tokenCompartment.reconfigure(codeHighlight(tokens)) });
}

/** VS Code swaps the body's `vscode-light|dark|high-contrast` class on theme changes. */
export function followThemeKind(view: EditorView): void {
  new MutationObserver(() => {
    view.dispatch({ effects: darkCompartment.reconfigure(EditorView.darkTheme.of(isDark())) });
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
