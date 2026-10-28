import type { SyntaxNode } from '@lezer/common';

/** Elements without content; they never have a closing tag. */
const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Parses an HTML tag like `<span class="x">`, `</span>` or `<br/>`. */
export function parseTag(source: string): { name: string; closing: boolean; single: boolean } | undefined {
  const match = /^<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>$/s.exec(source);
  if (!match) return undefined;
  const name = match[2].toLowerCase();
  return { name, closing: match[1] === '/', single: VOID.has(name) || match[3] === '/' };
}

/**
 * Pairs the inline `HTMLTag` children of a paragraph into renderable units: a void/self-closing tag on
 * its own, or an outermost opening tag together with its matching closing tag. Unmatched tags are
 * not part of any unit and stay raw.
 */
export function inlineHtmlUnits(parent: SyntaxNode, slice: (from: number, to: number) => string) {
  const units: { from: number; to: number }[] = [];
  let stack: { name: string; from: number }[] = [];
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (child.name !== 'HTMLTag') continue;
    const tag = parseTag(slice(child.from, child.to));
    if (!tag) continue;
    if (tag.single && !tag.closing) {
      if (!stack.length) units.push({ from: child.from, to: child.to });
    } else if (!tag.closing) {
      stack.push({ name: tag.name, from: child.from });
    } else {
      const open = stack.map((s) => s.name).lastIndexOf(tag.name);
      if (open === 0) {
        units.push({ from: stack[0].from, to: child.to });
        stack = [];
      } else if (open > 0) {
        stack = stack.slice(0, open);
      }
    }
  }
  return units;
}
