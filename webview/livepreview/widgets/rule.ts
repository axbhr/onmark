import { WidgetType } from '@codemirror/view';

export class RuleWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const hr = document.createElement('span');
    hr.className = 'cm-om-hr';
    hr.setAttribute('role', 'separator');
    return hr;
  }
}
