import { WidgetType } from '@codemirror/view';
import { icon } from './icon';

/** Replaces the opening fence of an inactive code block: language label plus copy button. */
export class CodeHeaderWidget extends WidgetType {
  constructor(readonly language: string) {
    super();
  }

  eq(other: CodeHeaderWidget): boolean {
    return other.language === this.language;
  }

  toDOM(): HTMLElement {
    const header = document.createElement('span');
    header.className = 'cm-om-code-header';
    const label = document.createElement('span');
    label.className = 'cm-om-code-lang';
    label.textContent = this.language;
    const copy = document.createElement('button');
    copy.className = 'cm-om-code-copy';
    copy.title = 'Copy';
    copy.setAttribute('aria-label', 'Copy code');
    copy.append(icon('copy'));
    header.append(label, copy);
    return header;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
