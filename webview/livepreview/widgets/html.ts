import { WidgetType, type EditorView } from '@codemirror/view';
import { icon } from './icon';
import { renderHtml } from '../html/sanitize';
import { renderInline } from '../render';

/** Renders a sanitized HTML block (`<div>…</div>` on its own lines) or an inline HTML element. */
export class HtmlWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly inline: boolean,
    readonly base: string,
    readonly root: string,
  ) {
    super();
  }

  eq(other: HtmlWidget): boolean {
    return (
      other.source === this.source && other.inline === this.inline && other.base === this.base && other.root === this.root
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement(this.inline ? 'span' : 'div');
    wrap.className = this.inline ? 'cm-om-html cm-om-html-inline' : 'cm-om-html cm-om-html-block';
    const { base, root } = this;
    // Markdown inside inline HTML is rendered (CommonMark); the content of HTML blocks is not.
    const renderText = this.inline ? (text: string) => renderInline(text, base, root) : undefined;
    wrap.append(renderHtml(this.source, { base, root, renderText }));
    for (const img of wrap.querySelectorAll('img')) img.addEventListener('load', () => view.requestMeasure());
    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/** Placeholder for `<style>` and `<script>` blocks, which have no visible output. */
export class HtmlBadgeWidget extends WidgetType {
  constructor(readonly kind: 'style' | 'script') {
    super();
  }

  eq(other: HtmlBadgeWidget): boolean {
    return other.kind === this.kind;
  }

  toDOM(): HTMLElement {
    const badge = document.createElement('div');
    badge.className = 'cm-om-html-badge';
    const label = this.kind === 'style' ? 'Style (applies to HTML in this note)' : 'Script (never run)';
    badge.append(icon(this.kind === 'style' ? 'symbol-color' : 'code'), label);
    badge.title = 'Click to edit';
    return badge;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
