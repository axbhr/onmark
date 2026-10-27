import { WidgetType } from '@codemirror/view';
import { parseProperties } from '../properties';
import { icon } from './icon';

/** Compact, collapsible view of the YAML frontmatter. Clicking a row reveals the raw YAML. */
export class PropertiesWidget extends WidgetType {
  constructor(
    readonly yaml: string,
    readonly folded: boolean,
  ) {
    super();
  }

  eq(other: PropertiesWidget): boolean {
    return other.yaml === this.yaml && other.folded === this.folded;
  }

  toDOM(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'cm-om-properties';

    const head = document.createElement('div');
    head.className = 'cm-om-properties-head';
    head.setAttribute('role', 'button');
    head.setAttribute('aria-expanded', String(!this.folded));
    head.append(icon(this.folded ? 'chevron-right' : 'chevron-down'), 'Properties');
    box.append(head);
    if (this.folded) return box;

    for (const { key, value, line } of parseProperties(this.yaml)) {
      const row = document.createElement('div');
      row.className = 'cm-om-property';
      row.dataset.line = String(line);
      const k = document.createElement('span');
      k.className = 'cm-om-property-key';
      k.textContent = key;
      const v = document.createElement('span');
      v.className = 'cm-om-property-value';
      if (Array.isArray(value)) {
        for (const item of value) {
          const chip = document.createElement('span');
          chip.className = 'cm-om-chip';
          chip.textContent = item;
          v.append(chip);
        }
      } else {
        v.textContent = value;
      }
      row.append(k, v);
      box.append(row);
    }
    return box;
  }

  get estimatedHeight(): number {
    return this.folded ? 32 : 32 + parseProperties(this.yaml).length * 25;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
