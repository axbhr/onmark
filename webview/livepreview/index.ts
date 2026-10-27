import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { toggleBold, toggleItalic } from './commands';
import { formattingHandlers, formattingTheme } from './formatting';
import { headingHandlers, headingTheme } from './headings';
import { inlinePreview } from './inline';
import { linkClick, linkHandlers, linkTheme, type OpenLink } from './links';
import { checkboxClick, listHandlers, listTheme } from './lists';
import { quoteHandlers, quoteTheme } from './quotes';
import { ruleHandlers, ruleTheme } from './rules';

export { Highlight, highlightTag } from './extensions/highlight';

export function livePreview(options: { openLink: OpenLink }) {
  return [
    inlinePreview({
      ...headingHandlers,
      ...formattingHandlers,
      ...linkHandlers,
      ...quoteHandlers,
      ...listHandlers,
      ...ruleHandlers,
    }),
    linkClick(options.openLink),
    checkboxClick,
    // Prec.high: Mod-i would otherwise hit selectParentSyntax from the default keymap.
    Prec.high(
      keymap.of([
        { key: 'Mod-b', run: toggleBold },
        { key: 'Mod-i', run: toggleItalic },
      ]),
    ),
    [headingTheme, formattingTheme, linkTheme, quoteTheme, listTheme, ruleTheme],
  ];
}
