import { WidgetType } from '@codemirror/view';
import { icon } from './icon';

/** Chevron that flips the fold state of a callout or the properties block (handled by a click handler). */
export class FoldWidget extends WidgetType {
  constructor(readonly folded: boolean) {
    super();
  }

  eq(other: FoldWidget): boolean {
    return other.folded === this.folded;
  }

  toDOM(): HTMLElement {
    const fold = document.createElement('span');
    fold.className = 'cm-ob-fold';
    fold.setAttribute('role', 'button');
    fold.setAttribute('aria-expanded', String(!this.folded));
    fold.title = this.folded ? 'Aufklappen' : 'Zuklappen';
    fold.append(icon(this.folded ? 'chevron-right' : 'chevron-down'));
    return fold;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
