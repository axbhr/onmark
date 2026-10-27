import { WidgetType } from '@codemirror/view';

export class BulletWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-ob-bullet';
    span.textContent = '•';
    return span;
  }
}
