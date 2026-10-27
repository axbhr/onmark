import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { blockPreview } from './blocks';
import { calloutFoldClick, calloutHandlers, calloutTheme } from './callouts';
import { codeBlockCopy, codeBlockHandlers, codeBlockTheme } from './codeblocks';
import { toggleBold, toggleItalic } from './commands';
import { flippedFolds } from './folds';
import { formattingHandlers, formattingTheme } from './formatting';
import { frontmatterClick, frontmatterHandlers, frontmatterTheme } from './frontmatter';
import { headingHandlers, headingTheme } from './headings';
import { imageHandlers, imageTheme, resourceBase } from './images';
import { inlinePreview } from './inline';
import { linkClick, linkHandlers, linkTheme, type OpenLink } from './links';
import { checkboxClick, listHandlers, listTheme } from './lists';
import { quoteHandlers, quoteTheme } from './quotes';
import { ruleHandlers, ruleTheme } from './rules';
import { tableClick, tableHandlers, tableTheme } from './tables';

export { Frontmatter } from './extensions/frontmatter';
export { Highlight, highlightTag } from './extensions/highlight';

export interface LivePreviewOptions {
  openLink: OpenLink;
  copy(text: string): void;
  /** Webview URIs (trailing slash) for resolving relative and root-relative image paths. */
  base: string;
  root: string;
}

export function livePreview(options: LivePreviewOptions) {
  return [
    resourceBase.of({ base: options.base, root: options.root }),
    flippedFolds,
    inlinePreview({
      ...headingHandlers,
      ...formattingHandlers,
      ...linkHandlers,
      ...imageHandlers,
      ...quoteHandlers,
      ...listHandlers,
      ...ruleHandlers,
    }),
    blockPreview({
      ...frontmatterHandlers,
      ...codeBlockHandlers,
      ...tableHandlers,
      ...calloutHandlers,
    }),
    // Before tableClick so Ctrl+click on a link inside a rendered table opens the link.
    linkClick(options.openLink),
    tableClick,
    codeBlockCopy(options.copy),
    checkboxClick,
    calloutFoldClick,
    frontmatterClick,
    // Prec.high: Mod-i would otherwise hit selectParentSyntax from the default keymap.
    Prec.high(
      keymap.of([
        { key: 'Mod-b', run: toggleBold },
        { key: 'Mod-i', run: toggleItalic },
      ]),
    ),
    [
      headingTheme,
      formattingTheme,
      linkTheme,
      imageTheme,
      quoteTheme,
      listTheme,
      ruleTheme,
      codeBlockTheme,
      tableTheme,
      calloutTheme,
      frontmatterTheme,
    ],
  ];
}
