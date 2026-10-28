// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { renderHtml } from '../webview/livepreview/html/sanitize';

const opts = { base: 'https://res.test/notes/', root: 'https://res.test/' };
const html = (source: string) => {
  const div = document.createElement('div');
  div.append(renderHtml(source, opts));
  return div;
};

describe('renderHtml', () => {
  it('keeps allowed markup and attributes', () => {
    const out = html('<p align="center" title="t">a <b>b</b> <kbd>K</kbd></p><table><tr><td colspan="2">x</td></tr></table>');
    expect(out.querySelector('p')?.getAttribute('align')).toBe('center');
    expect(out.querySelector('kbd')?.textContent).toBe('K');
    expect(out.querySelector('td')?.getAttribute('colspan')).toBe('2');
  });

  it('drops scripts, frames, forms and their content', () => {
    const out = html('<script>alert(1)</script><iframe></iframe><form><input></form><style>p{}</style>ok');
    expect(out.innerHTML).toBe('ok');
  });

  it('removes event handlers and unknown attributes', () => {
    const out = html('<div onclick="alert(1)" onmouseover="x()" id="i" data-x="1">t</div><img src="a.png" onerror="alert(1)">');
    const div = out.querySelector('div')!;
    expect(div.getAttributeNames()).toEqual([]);
    expect(out.querySelector('img')?.getAttributeNames().sort()).toEqual(['src']);
  });

  it('never creates navigable links and keeps the target for Ctrl+click', () => {
    const a = html('<a href="javascript:alert(1)">x</a>').querySelector('a')!;
    expect(a.hasAttribute('href')).toBe(false);
    expect(a.dataset.href).toBe('javascript:alert(1)'); // opened only through the host's scheme allowlist
  });

  it('resolves image sources like Markdown images', () => {
    expect(html('<img src="img/a.png">').querySelector('img')?.getAttribute('src')).toBe('https://res.test/notes/img/a.png');
    expect(html('<img src="javascript:alert(1)">').querySelector('img')?.hasAttribute('src')).toBe(false);
    expect(html('<img src="file:///etc/passwd">').querySelector('img')?.hasAttribute('src')).toBe(false);
  });

  it('unwraps unknown elements and strips editor class names', () => {
    const out = html('<custom-el><span class="note cm-om-link codicon x">t</span></custom-el>');
    expect(out.querySelector('custom-el')).toBeNull();
    expect(out.querySelector('span')?.className).toBe('note x');
  });

  it('applies inline styles without escaping positioning', () => {
    const span = html('<span style="color: red; position: fixed; top: 0">t</span>').querySelector('span')!;
    expect(span.style.color).toBe('red');
    expect(span.style.position).toBe('');
  });

  it('renders text through the given Markdown renderer', () => {
    const div = document.createElement('div');
    div.append(renderHtml('<span>**x**</span>', { ...opts, renderText: (t) => document.createTextNode(t.toUpperCase()) }));
    expect(div.textContent).toBe('**X**');
  });
});
