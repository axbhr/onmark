/**
 * Code token kinds and the TextMate scope VS Code's grammars typically assign to them. The host resolves
 * each scope against the active color theme; the webview maps the same keys to Lezer highlight tags.
 */
export const TOKEN_SCOPES = {
  comment: 'comment',
  docComment: 'comment.block.documentation',
  keyword: 'keyword',
  controlKeyword: 'keyword.control',
  moduleKeyword: 'keyword.control.import',
  definitionKeyword: 'storage.type',
  modifier: 'storage.modifier',
  operatorKeyword: 'keyword.operator.expression',
  operator: 'keyword.operator',
  self: 'variable.language',
  string: 'string',
  regexp: 'string.regexp',
  escape: 'constant.character.escape',
  number: 'constant.numeric',
  bool: 'constant.language.boolean',
  null: 'constant.language.null',
  atom: 'constant.language',
  constant: 'variable.other.constant',
  variable: 'variable',
  property: 'variable.other.property',
  function: 'entity.name.function',
  type: 'entity.name.type',
  class: 'entity.name.type.class',
  namespace: 'entity.name.namespace',
  tag: 'entity.name.tag',
  attribute: 'entity.other.attribute-name',
  annotation: 'entity.name.function.decorator',
  punctuation: 'punctuation',
  invalid: 'invalid',
} as const;

export type TokenKey = keyof typeof TOKEN_SCOPES;

export interface TokenStyle {
  color?: string;
  /** TextMate fontStyle: space-separated `italic`, `bold`, `underline`, `strikethrough`. */
  fontStyle?: string;
}

/** Resolved token styles of the active theme. Empty if the theme could not be read (webview falls back). */
export type TokenTheme = Partial<Record<TokenKey, TokenStyle>>;
