import { WidgetType } from '@codemirror/view';
import { icon } from './icon';

/** Replaces `> [!type]+ ` on the title line of an inactive callout with its icon (and default title). */
export class CalloutTitleWidget extends WidgetType {
  constructor(
    readonly iconName: string,
    /** Shown when the callout has no title of its own. */
    readonly fallbackTitle: string | undefined,
  ) {
    super();
  }

  eq(other: CalloutTitleWidget): boolean {
    return other.iconName === this.iconName && other.fallbackTitle === this.fallbackTitle;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-om-callout-head';
    wrap.append(icon(this.iconName));
    if (this.fallbackTitle) {
      const title = document.createElement('span');
      title.textContent = this.fallbackTitle;
      wrap.append(title);
    }
    return wrap;
  }
}
