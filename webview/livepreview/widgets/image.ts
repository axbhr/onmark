import { WidgetType, type EditorView } from '@codemirror/view';
import { icon } from './icon';

/** Sources that failed to load; re-rendered widgets show the placeholder right away instead of retrying. */
const failed = new Set<string>();

export class ImageWidget extends WidgetType {
  constructor(
    /** Resolved URL, or undefined if the source can't be shown in the webview. */
    readonly src: string | undefined,
    readonly raw: string,
    readonly alt: string,
    readonly width?: number,
    readonly height?: number,
    /** Shown on its own line below the raw syntax while the image is being edited. */
    readonly isBelow = false,
  ) {
    super();
  }

  below(): ImageWidget {
    return new ImageWidget(this.src, this.raw, this.alt, this.width, this.height, true);
  }

  eq(o: ImageWidget): boolean {
    return (
      o.src === this.src && o.alt === this.alt && o.width === this.width && o.height === this.height && o.isBelow === this.isBelow
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    const cls = this.isBelow ? 'cm-ob-image cm-ob-image-below' : 'cm-ob-image';
    wrap.className = cls;
    const broken = () => {
      wrap.replaceChildren(icon('file-media'), ` ${this.alt || this.raw}`);
      wrap.className = `${cls} cm-ob-image-broken`;
      wrap.title = `Bild nicht gefunden: ${this.raw}`;
    };
    if (!this.src || failed.has(this.src)) {
      broken();
      return wrap;
    }
    const src = this.src;
    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt;
    if (this.width) img.width = this.width;
    if (this.height) img.height = this.height;
    // Height changes once the image has loaded; let CodeMirror re-measure so scrolling stays correct.
    img.addEventListener('load', () => view.requestMeasure());
    img.addEventListener('error', () => {
      failed.add(src);
      broken();
      view.requestMeasure();
    });
    wrap.append(img);
    return wrap;
  }
}
