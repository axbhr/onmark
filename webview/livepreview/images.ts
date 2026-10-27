import { Facet } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { NodeHandlers } from './context';
import { ImageWidget } from './widgets/image';

/** Webview URIs (with trailing slash) of the note's folder and the workspace folder. */
export const resourceBase = Facet.define<{ base: string; root: string }, { base: string; root: string }>({
  combine: (values) => values[0] ?? { base: '', root: '' },
});

const SHOWABLE = new Set(['https:', 'data:']);

/** Resolves a Markdown image target to a URL the webview may load, or undefined. */
export function resolveImageSrc(raw: string, base: string, root: string): string | undefined {
  const target = raw.trim().replace(/^<(.*)>$/, '$1');
  if (!target) return undefined;
  try {
    if (/^[a-z][a-z0-9+.-]+:/i.test(target)) {
      const url = new URL(target);
      return SHOWABLE.has(url.protocol) ? url.href : undefined;
    }
    const path = target.replace(/\\/g, '/');
    return path.startsWith('/') ? new URL(path.slice(1), root).href : new URL(path, base).href;
  } catch {
    return undefined;
  }
}

/** Obsidian size suffix in the alt text: `![alt|300]` or `![alt|300x200]`. */
function parseAlt(alt: string): { alt: string; width?: number; height?: number } {
  const match = /^(.*?)\|(\d+)(?:x(\d+))?$/.exec(alt);
  if (!match) return { alt };
  return { alt: match[1].trim(), width: Number(match[2]), height: match[3] ? Number(match[3]) : undefined };
}

export const imageHandlers: NodeHandlers = {
  Image(node, ctx) {
    const marks = node.getChildren('LinkMark');
    const url = node.getChild('URL');
    if (!url || marks.length < 2) return;
    const { doc } = ctx.state;
    const raw = doc.sliceString(url.from, url.to);
    const { base, root } = ctx.state.facet(resourceBase);
    const alt = parseAlt(doc.sliceString(marks[0].to, marks[1].from));
    const widget = new ImageWidget(resolveImageSrc(raw, base, root), raw, alt.alt, alt.width, alt.height);
    // While editing, the image stays visible below the raw syntax so the content below barely moves.
    if (ctx.touches(node.from, node.to)) ctx.widget(node.to, node.to, widget.below());
    else ctx.widget(node.from, node.to, widget);
  },
};

export const imageTheme = EditorView.baseTheme({
  // inline-block: a block inside the line would add empty line boxes around CodeMirror's widget buffers.
  '.cm-ob-image': { display: 'inline-block', maxWidth: '100%', verticalAlign: 'bottom' },
  '.cm-ob-image-below': { display: 'block' },
  '.cm-ob-image img': { maxWidth: '100%', height: 'auto', verticalAlign: 'bottom' },
  '.cm-ob-image-broken': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3em',
    padding: '0 0.4em',
    borderRadius: '3px',
    color: 'var(--vscode-errorForeground)',
    backgroundColor: 'var(--vscode-inputValidation-errorBackground, transparent)',
  },
});
