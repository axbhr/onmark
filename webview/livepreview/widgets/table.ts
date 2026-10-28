import { redo, undo } from '@codemirror/commands';
import { EditorSelection } from '@codemirror/state';
import { WidgetType, type EditorView } from '@codemirror/view';
import { linkOpener } from '../links';
import { renderInline } from '../render';
import {
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  parseTable,
  rowAt,
  setAlign,
  setCell,
  unescapeCell,
  type Align,
  type Change,
  type TableModel,
} from '../tableModel';
import { icon } from './icon';

interface TableState {
  widget: TableWidget;
  /** Cell being edited; it shows its Markdown source instead of the rendered content. */
  editing: HTMLElement | null;
}

const states = new WeakMap<HTMLElement, TableState>();
/** Cell to focus after a structural change rebuilt the table DOM. */
let pendingFocus: { row: number; col: number; time: number } | undefined;

const cellPos = (cell: HTMLElement) => ({ row: Number(cell.dataset.row), col: Number(cell.dataset.col) });

/**
 * Rendered, editable GFM table. Click a cell to edit its Markdown in place; the toolbar and the `+`
 * handles change the structure. Every change goes straight into the document as a minimal edit.
 */
export class TableWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly base: string,
    readonly root: string,
  ) {
    super();
  }

  eq(other: TableWidget): boolean {
    return other.source === this.source && other.base === this.base && other.root === this.root;
  }

  get model(): TableModel {
    return parseTable(this.source, 0);
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-om-table-wrap';
    const scroller = document.createElement('div');
    scroller.className = 'cm-om-table-scroll';
    wrap.append(scroller, toolbar(), handle('row'), handle('column'));
    states.set(wrap, { widget: this, editing: null });
    this.build(wrap);
    listen(wrap, view);

    const focus = pendingFocus;
    if (focus && Date.now() - focus.time < 1000) {
      pendingFocus = undefined;
      // After the current update: CodeMirror attaches the new DOM synchronously.
      queueMicrotask(() => focusCell(wrap, focus.row, focus.col));
    }
    return wrap;
  }

  updateDOM(dom: HTMLElement): boolean {
    const state = states.get(dom);
    if (!state) return false;
    const model = this.model;
    const table = dom.querySelector('table')!;
    const sameShape =
      table.rows.length === model.body.length + 1 && [...table.rows].every((r) => r.cells.length === model.columns);
    if (!sameShape) {
      const pending = pendingFocus && Date.now() - pendingFocus.time < 1000;
      if (state.editing && !pending) pendingFocus = { ...cellPos(state.editing), time: Date.now() };
      return false;
    }
    state.widget = this;
    for (const row of table.rows) {
      for (const cell of row.cells) {
        const { row: r, col: c } = cellPos(cell);
        const text = rowAt(model, r)?.cells[c]?.text ?? '';
        if (model.align[c]) cell.style.textAlign = model.align[c]!;
        else cell.style.removeProperty('text-align');
        if (cell === state.editing) {
          // Only when the source changed elsewhere (e.g. undo); otherwise the caret would jump.
          if (unescapeCell(text) !== (cell.textContent ?? '').trim()) {
            cell.textContent = unescapeCell(text);
            placeCaret(cell, 'end');
          }
        } else {
          cell.replaceChildren(renderInline(text, this.base, this.root));
        }
      }
    }
    return true;
  }

  private build(wrap: HTMLElement) {
    const model = this.model;
    const table = document.createElement('table');
    table.className = 'cm-om-table';
    for (let r = 0; r <= model.body.length; r++) {
      const section = r === 0 ? table.createTHead() : (table.tBodies[0] ?? table.createTBody());
      const tr = section.insertRow();
      for (let c = 0; c < model.columns; c++) {
        const cell = document.createElement(r === 0 ? 'th' : 'td');
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.contentEditable = 'plaintext-only';
        cell.spellcheck = false;
        if (model.align[c]) cell.style.textAlign = model.align[c]!;
        cell.append(renderInline(rowAt(model, r)?.cells[c]?.text ?? '', this.base, this.root));
        tr.append(cell);
      }
    }
    wrap.querySelector('.cm-om-table-scroll')!.replaceChildren(table);
  }

  /** One line per row, two for the header; keeps CodeMirror's height map close before measuring. */
  get estimatedHeight(): number {
    return (this.model.body.length + 2) * 26;
  }

  /** The table handles all of its own events. */
  ignoreEvent(): boolean {
    return true;
  }
}

function button(name: string, title: string, iconName: string | undefined, text?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'cm-om-table-button';
  b.dataset.action = name;
  b.title = title;
  b.tabIndex = -1;
  b.setAttribute('aria-label', title);
  if (iconName) b.append(icon(iconName));
  if (text) b.append(text);
  return b;
}

function toolbar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'cm-om-table-toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Table');
  const group = (...children: HTMLElement[]) => {
    const g = document.createElement('span');
    g.className = 'cm-om-table-group';
    g.append(...children);
    return g;
  };
  bar.append(
    group(
      button('row-above', 'Insert row above', 'arrow-up', '+'),
      button('row-below', 'Insert row below', 'arrow-down', '+'),
      button('row-delete', 'Delete row', 'trash', 'Row'),
    ),
    group(
      button('col-left', 'Insert column left', 'arrow-left', '+'),
      button('col-right', 'Insert column right', 'arrow-right', '+'),
      button('col-delete', 'Delete column', 'trash', 'Col'),
    ),
    group(
      button('align-left', 'Align column left', undefined, '⇤'),
      button('align-center', 'Center column', undefined, '↔'),
      button('align-right', 'Align column right', undefined, '⇥'),
    ),
    group(button('source', 'Edit as Markdown', 'code')),
  );
  return bar;
}

function handle(kind: 'row' | 'column'): HTMLElement {
  const b = button(kind === 'row' ? 'add-row' : 'add-column', kind === 'row' ? 'Add row' : 'Add column', 'add');
  b.classList.add(`cm-om-table-add-${kind}`);
  return b;
}

function focusCell(wrap: HTMLElement, row: number, col: number, caret: 'start' | 'end' = 'end') {
  const cell = wrap.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return;
  cell.focus();
  placeCaret(cell, caret);
}

function placeCaret(cell: HTMLElement, caret: 'start' | 'end') {
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(caret === 'start');
  const selection = getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function listen(wrap: HTMLElement, view: EditorView) {
  const state = () => states.get(wrap)!;
  /** Current table model in document coordinates. */
  const current = () => {
    const from = view.posAtDOM(wrap);
    const line = view.state.doc.lineAt(from);
    const source = state().widget.source;
    return view.state.doc.sliceString(from, from + source.length) === source && line.from === from
      ? parseTable(source, from)
      : undefined;
  };
  const slice = (from: number, to: number) => view.state.doc.sliceString(from, to);
  const dispatch = (changes: Change[], focus?: { row: number; col: number }) => {
    if (!changes.length) return;
    if (focus) pendingFocus = { ...focus, time: Date.now() };
    // Typing is `input.type`, so the undo history groups it like typing in the editor.
    view.dispatch({ changes, userEvent: focus ? 'input.table' : 'input.type' });
  };

  wrap.addEventListener('focusin', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row]');
    if (!cell || state().editing === cell) return;
    const model = current();
    if (!model) return;
    const { row, col } = cellPos(cell);
    state().editing = cell;
    cell.textContent = unescapeCell(rowAt(model, row)?.cells[col]?.text ?? '');
    wrap.classList.add('cm-om-table-editing');
    focusCell(wrap, row, col);
  });

  wrap.addEventListener('focusout', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row]');
    if (!cell || state().editing !== cell) return;
    state().editing = null;
    const { row, col } = cellPos(cell);
    const { base, root, model } = state().widget;
    cell.replaceChildren(renderInline(rowAt(model, row)?.cells[col]?.text ?? '', base, root));
    if (!wrap.contains(event.relatedTarget as Node)) wrap.classList.remove('cm-om-table-editing');
  });

  wrap.addEventListener('input', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row]');
    const model = current();
    if (!cell || !model) return;
    const { row, col } = cellPos(cell);
    dispatch(setCell(model, row, col, cell.textContent ?? '', slice));
  });

  wrap.addEventListener('mousedown', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLElement>('[data-href]');
    // Links are only rendered in cells that are not being edited.
    if (link && event.button === 0) {
      event.preventDefault();
      view.state.facet(linkOpener)(link.dataset.href!, event.altKey);
      return;
    }
    // Buttons must not take the focus away from the cell being edited.
    if (target.closest('button')) event.preventDefault();
  });

  wrap.addEventListener('click', (event) => {
    const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    const model = current();
    if (!action || !model) return;
    const editing = state().editing;
    const { row, col } = editing ? cellPos(editing) : { row: model.body.length, col: model.columns - 1 };
    const body = row - 1;
    const align = (a: Align) => dispatch(setAlign(model, col, a, slice));
    switch (action) {
      case 'row-above':
        return dispatch(insertRow(model, Math.max(body, 0)), { row: Math.max(row, 1), col });
      case 'row-below':
        return dispatch(insertRow(model, body + 1), { row: row + 1, col });
      case 'row-delete':
        return row > 0 && dispatch(deleteRow(model, body), { row: Math.min(row, model.body.length - 1), col });
      case 'col-left':
        return dispatch(insertColumn(model, col), { row, col });
      case 'col-right':
        return dispatch(insertColumn(model, col + 1), { row, col: col + 1 });
      case 'col-delete':
        return dispatch(deleteColumn(model, col, slice), { row, col: Math.max(0, col - 1) });
      case 'align-left':
        return align(model.align[col] === 'left' ? undefined : 'left');
      case 'align-center':
        return align(model.align[col] === 'center' ? undefined : 'center');
      case 'align-right':
        return align(model.align[col] === 'right' ? undefined : 'right');
      case 'add-row':
        return dispatch(insertRow(model, model.body.length), { row: model.body.length + 1, col: 0 });
      case 'add-column':
        return dispatch(insertColumn(model, model.columns), { row: editing ? row : 0, col: model.columns });
      case 'source':
        view.dispatch({ selection: EditorSelection.cursor(model.from) });
        view.focus();
    }
  });

  wrap.addEventListener('keydown', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row]');
    const model = current();
    if (!cell || !model) return;
    const { row, col } = cellPos(cell);
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    const leave = (pos: number) => {
      handled();
      view.dispatch({ selection: EditorSelection.cursor(Math.max(0, Math.min(pos, view.state.doc.length))) });
      view.focus();
    };
    if (mod && !event.altKey && (key === 'z' || key === 'y')) {
      handled();
      (key === 'y' || event.shiftKey ? redo : undo)(view);
    } else if (event.key === 'Tab') {
      handled();
      const next = event.shiftKey ? row * model.columns + col - 1 : row * model.columns + col + 1;
      if (next < 0) return;
      if (next >= (model.body.length + 1) * model.columns) {
        dispatch(insertRow(model, model.body.length), { row: model.body.length + 1, col: 0 });
      } else {
        focusCell(wrap, Math.floor(next / model.columns), next % model.columns);
      }
    } else if (event.key === 'Enter' && !mod) {
      handled();
      if (row >= model.body.length) dispatch(insertRow(model, model.body.length), { row: row + 1, col });
      else focusCell(wrap, row + 1, col);
    } else if (event.key === 'ArrowUp' && !event.shiftKey) {
      if (row > 0) {
        handled();
        focusCell(wrap, row - 1, col);
      } else if (model.from > 0) leave(model.from - 1);
    } else if (event.key === 'ArrowDown' && !event.shiftKey) {
      if (row < model.body.length) {
        handled();
        focusCell(wrap, row + 1, col);
      } else if (model.to < view.state.doc.length) leave(model.to + 1);
    } else if (event.key === 'Escape') {
      leave(model.to < view.state.doc.length ? model.to + 1 : model.from > 0 ? model.from - 1 : model.to);
    }
  });
}
