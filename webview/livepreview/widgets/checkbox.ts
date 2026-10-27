import { WidgetType } from '@codemirror/view';

/**
 * Task checkbox. A span with role="checkbox" instead of <input> so the browser never toggles state on its
 * own; clicks are handled in lists.ts and only ever change the source text.
 */
export class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked;
  }

  toDOM(): HTMLElement {
    const box = document.createElement('span');
    box.className = 'cm-om-checkbox';
    box.setAttribute('role', 'checkbox');
    box.setAttribute('aria-checked', String(this.checked));
    box.setAttribute('aria-label', 'Task');
    return box;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
