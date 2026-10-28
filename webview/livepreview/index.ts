import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { backgroundLayer, backgroundTheme } from './backgrounds';
import { blockPreview } from './blocks';
import { calloutFoldClick, calloutHandlers, calloutTheme } from './callouts';
import { codeBlockCopy, codeBlockHandlers, codeBlockTheme } from './codeblocks';
import { toggleBold, toggleItalic } from './commands';
import { flippedFolds } from './folds';
import { formattingHandlers, formattingTheme } from './formatting';
import { frontmatterClick, frontmatterHandlers, frontmatterTheme } from './frontmatter';
import { headingHandlers, headingTheme } from './headings';
import { htmlBlockHandlers, htmlClick, htmlTheme, inlineHtmlHandlers, noteStyles } from './html';
import { imageHandlers, imageTheme, resourceBase } from './images';
import { combineHandlers } from './context';
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
    // Registered after drawSelection() in editor.ts, so it sits below the selection layer.
    backgroundLayer,
    flippedFolds,
    noteStyles,
    inlinePreview(
      combineHandlers(
        // First: inline HTML replaces whole ranges; other handlers then skip what it covers.
        inlineHtmlHandlers,
        headingHandlers,
        formattingHandlers,
        linkHandlers,
        imageHandlers,
        quoteHandlers,
        listHandlers,
        ruleHandlers,
      ),
    ),
    blockPreview(
      combineHandlers(frontmatterHandlers, codeBlockHandlers, tableHandlers, calloutHandlers, htmlBlockHandlers),
    ),
    // Before the widget click handlers, so links inside rendered tables and HTML open on click.
    linkClick(options.openLink),
    htmlClick,
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
      backgroundTheme,
      htmlTheme,
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
