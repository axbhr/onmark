import { resolveImageSrc } from '../images';

/**
 * Turns untrusted HTML from a note into safe DOM. The HTML is parsed into an inert document and
 * rebuilt element by element from an allowlist, so scripts, event handlers, frames, forms and
 * dangerous URLs never reach the page. Inline styles are applied through CSSOM (allowed by the
 * webview's strict CSP, unlike `style` attributes) without positioning that could escape the note.
 */

const ALLOWED = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'big', 'blockquote', 'br', 'caption', 'center', 'cite', 'code', 'col',
  'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'font', 'h1',
  'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 'rp', 'rt',
  'ruby', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'time', 'tr', 'tt', 'u', 'ul', 'var', 'wbr',
]);

/** Removed together with their content. Anything else that is not allowed is unwrapped. */
const DROPPED = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'form', 'input', 'button',
  'textarea', 'select', 'option', 'link', 'meta', 'base', 'title', 'head', 'noscript', 'template', 'svg',
  'math', 'canvas', 'video', 'audio', 'source', 'track', 'dialog', 'portal', 'slot',
]);

const GLOBAL_ATTRIBUTES = ['title', 'lang', 'dir', 'align', 'width', 'height'];
const TAG_ATTRIBUTES: Record<string, string[]> = {
  img: ['alt'],
  td: ['colspan', 'rowspan', 'valign'],
  th: ['colspan', 'rowspan', 'valign', 'scope'],
  col: ['span'],
  colgroup: ['span'],
  ol: ['start', 'type', 'reversed'],
  li: ['value'],
  details: ['open'],
  font: ['color', 'size', 'face'],
  time: ['datetime'],
  abbr: ['title'],
};

const SAFE_POSITION = new Set(['', 'static', 'relative']);

/** Removes positioning that would let content leave the note's own area (e.g. fake UI overlays). */
export function neutralizePosition(style: CSSStyleDeclaration): void {
  if (!SAFE_POSITION.has(style.position)) style.removeProperty('position');
}

export interface RenderHtmlOptions {
  /** Webview URIs (trailing slash) for resolving image paths. */
  base: string;
  root: string;
  /** Renders text inside the HTML as inline Markdown (inline HTML in paragraphs). */
  renderText?: (text: string) => Node;
}

export function renderHtml(source: string, options: RenderHtmlOptions): DocumentFragment {
  // DOMParser documents are inert: no scripts run and no resources load while parsing.
  const parsed = new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
  const fragment = document.createDocumentFragment();
  copyChildren(parsed.body, fragment, options);
  return fragment;
}

function copyChildren(from: Node, to: Node, options: RenderHtmlOptions): void {
  for (const child of from.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      to.appendChild(options.renderText ? options.renderText(text) : document.createTextNode(text));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      copyElement(child as Element, to, options);
    }
  }
}

function copyElement(source: Element, to: Node, options: RenderHtmlOptions): void {
  const tag = source.localName;
  if (DROPPED.has(tag)) return;
  if (!ALLOWED.has(tag)) {
    copyChildren(source, to, options);
    return;
  }
  const element = document.createElement(tag);
  for (const name of [...GLOBAL_ATTRIBUTES, ...(TAG_ATTRIBUTES[tag] ?? [])]) {
    const value = source.getAttribute(name);
    if (value !== null) element.setAttribute(name, value);
  }

  const classes = (source.getAttribute('class') ?? '').split(/\s+/).filter((c) => c && !/^(cm-|codicon)/.test(c));
  if (classes.length) element.className = classes.join(' ');

  const style = source.getAttribute('style');
  if (style) {
    element.style.cssText = style;
    neutralizePosition(element.style);
  }

  if (tag === 'a') {
    // No real href: clicks must not navigate the webview. Ctrl/Cmd+click opens `data-href` via the host.
    const href = source.getAttribute('href');
    if (href) element.dataset.href = href;
    element.classList.add('cm-om-link');
  } else if (tag === 'img') {
    const src = resolveImageSrc(source.getAttribute('src') ?? '', options.base, options.root);
    if (src) element.setAttribute('src', src);
  }

  copyChildren(source, element, options);
  to.appendChild(element);
}

/**
 * Builds CSS for `<style>` blocks of a note, scoped to rendered HTML (`.cm-om-html`) so it cannot
 * restyle the editor itself. The CSS is parsed first and re-serialized rule by rule, so it cannot
 * break out of the scope.
 */
export function scopedCss(css: string): string {
  const sheet = new CSSStyleSheet();
  try {
    sheet.replaceSync(css);
  } catch {
    return '';
  }
  const visit = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) neutralizePosition(rule.style);
      if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
    }
  };
  visit(sheet.cssRules);
  const rules = [...sheet.cssRules].filter((r) => !(r instanceof CSSImportRule)).map((r) => r.cssText);
  return rules.length ? `@scope (.cm-om-html) {\n${rules.join('\n')}\n}` : '';
}
