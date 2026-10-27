import { WidgetType } from '@codemirror/view';
import { renderInline } from '../render';

export type Align = 'left' | 'center' | 'right' | undefined;

export interface TableCell {
  text: string;
  /** Offset of the cell text from the start of the table, used to place the cursor on click. */
  offset: number;
}

/** Rendered GFM table. Row heights mirror the raw lines (see tables.ts) so toggling never shifts content. */
export class TableWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly rows: TableCell[][],
    readonly align: Align[],
    readonly base: string,
    readonly root: string,
  ) {
    super();
  }

  eq(other: TableWidget): boolean {
    return other.source === this.source && other.base === this.base && other.root === this.root;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-om-table-wrap';
    const table = document.createElement('table');
    table.className = 'cm-om-table';
    const columns = Math.max(...this.rows.map((r) => r.length));
    this.rows.forEach((cells, r) => {
      const section = r === 0 ? table.createTHead() : (table.tBodies[0] ?? table.createTBody());
      const tr = section.insertRow();
      for (let c = 0; c < columns; c++) {
        const cell = document.createElement(r === 0 ? 'th' : 'td');
        if (this.align[c]) cell.style.textAlign = this.align[c]!;
        if (cells[c]) {
          cell.dataset.offset = String(cells[c].offset);
          cell.append(renderInline(cells[c].text, this.base, this.root));
        }
        tr.append(cell);
      }
    });
    wrap.append(table);
    return wrap;
  }

  /** One line per row, two for the header; keeps CodeMirror's height map close before measuring. */
  get estimatedHeight(): number {
    return (this.rows.length + 1) * 26;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
