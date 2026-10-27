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
    header.className = 'cm-ob-code-header';
    const label = document.createElement('span');
    label.className = 'cm-ob-code-lang';
    label.textContent = this.language;
    const copy = document.createElement('button');
    copy.className = 'cm-ob-code-copy';
    copy.title = 'Kopieren';
    copy.setAttribute('aria-label', 'Code kopieren');
    copy.append(icon('copy'));
    header.append(label, copy);
    return header;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
