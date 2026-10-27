import type { MarkdownConfig } from '@lezer/markdown';

const FENCE = /^---\s*$/;
const CLOSE = /^(---|\.\.\.)\s*$/;
/**
 * Blank, indented, list item or `key:` line. `#` comments are left out on purpose: they would swallow
 * a `# Heading` below a freshly typed `---`.
 */
const YAML_LINE = /^(\s*$|\s+\S|-(\s|$)|[^\s:#][^:]*:(\s|$))/;

/**
 * YAML frontmatter at the very start of the document: `Frontmatter` with two `FrontmatterMark`s.
 * Lezer can only peek one line ahead, so lines are consumed only while they look like YAML. A block
 * that never closes yields `Frontmatter` without a second mark; the renderer leaves those raw.
 */
export const Frontmatter: MarkdownConfig = {
  defineNodes: [{ name: 'Frontmatter', block: true }, { name: 'FrontmatterMark' }],
  parseBlock: [
    {
      name: 'Frontmatter',
      before: 'HorizontalRule',
      parse(cx, line) {
        if (cx.lineStart !== 0 || !FENCE.test(line.text)) return false;
        const first = cx.peekLine();
        if (!CLOSE.test(first) && !YAML_LINE.test(first)) return false;
        const marks = [cx.elt('FrontmatterMark', 0, line.text.trimEnd().length)];
        while (cx.nextLine()) {
          if (CLOSE.test(line.text)) {
            marks.push(cx.elt('FrontmatterMark', cx.lineStart, cx.lineStart + line.text.trimEnd().length));
            const end = cx.lineStart + line.text.length;
            cx.nextLine();
            cx.addElement(cx.elt('Frontmatter', 0, end, marks));
            return true;
          }
          const next = cx.peekLine();
          if (!CLOSE.test(next) && !YAML_LINE.test(next)) break;
        }
        cx.addElement(cx.elt('Frontmatter', 0, cx.lineStart + line.text.length, marks));
        cx.nextLine();
        return true;
      },
    },
  ],
};
