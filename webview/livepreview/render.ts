import type { SyntaxNode } from '@lezer/common';
import { parser as baseParser, GFM } from '@lezer/markdown';
import { Highlight } from './extensions/highlight';
import { resolveImageSrc } from './images';

const parser = baseParser.configure([GFM, Highlight]);

const ELEMENTS: Record<string, [tag: string, cls?: string]> = {
  Emphasis: ['em'],
  StrongEmphasis: ['strong'],
  Strikethrough: ['s'],
  Highlight: ['mark', 'cm-om-highlight'],
  InlineCode: ['code', 'cm-om-code'],
};
/** Syntax that is never shown in rendered output. */
const HIDDEN = new Set(['EmphasisMark', 'CodeMark', 'StrikethroughMark', 'HighlightMark', 'LinkMark', 'LinkTitle']);

/**
 * Renders inline Markdown (one line, e.g. a table cell) to DOM for non-editable widgets.
 * Links get `data-href` so the link click handler can open them.
 */
export function renderInline(text: string, base: string, root: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const paragraph = parser.parse(text).topNode.firstChild;
  if (!paragraph) {
    fragment.append(text);
    return fragment;
  }
  appendChildren(fragment, paragraph, text, base, root);
  return fragment;
}

function appendChildren(parent: Node, node: SyntaxNode, text: string, base: string, root: string) {
  let pos = node.from;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.from > pos) parent.appendChild(document.createTextNode(text.slice(pos, child.from)));
    appendNode(parent, child, text, base, root);
    pos = child.to;
  }
  if (node.to > pos) parent.appendChild(document.createTextNode(text.slice(pos, node.to)));
}

function appendNode(parent: Node, node: SyntaxNode, text: string, base: string, root: string) {
  const element = ELEMENTS[node.name];
  if (HIDDEN.has(node.name) || (node.name === 'URL' && node.parent?.name === 'Link')) return;
  if (element) {
    const el = document.createElement(element[0]);
    if (element[1]) el.className = element[1];
    appendChildren(el, node, text, base, root);
    parent.appendChild(el);
  } else if (node.name === 'Link' || node.name === 'Autolink' || node.name === 'URL') {
    const url = node.name === 'URL' ? node : node.getChild('URL');
    const el = document.createElement('span');
    el.className = 'cm-om-link';
    if (url) el.dataset.href = text.slice(url.from, url.to).replace(/^<(.*)>$/, '$1');
    if (node.name === 'Link') appendChildren(el, node, text, base, root);
    else el.textContent = el.dataset.href ?? '';
    parent.appendChild(el);
  } else if (node.name === 'Image') {
    const url = node.getChild('URL');
    const marks = node.getChildren('LinkMark');
    const img = document.createElement('img');
    img.className = 'cm-om-inline-image';
    img.alt = marks.length > 1 ? text.slice(marks[0].to, marks[1].from) : '';
    const src = url && resolveImageSrc(text.slice(url.from, url.to), base, root);
    if (src) img.src = src;
    parent.appendChild(img);
  } else if (node.name === 'Escape') {
    parent.appendChild(document.createTextNode(text.slice(node.from + 1, node.to)));
  } else {
    appendChildren(parent, node, text, base, root);
  }
}
