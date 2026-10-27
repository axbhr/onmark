/** Creates `<span class="codicon codicon-{name}">`; the codicon font ships with the webview bundle. */
export function icon(name: string, extraClass = ''): HTMLElement {
  const span = document.createElement('span');
  span.className = `codicon codicon-${name} ${extraClass}`.trim();
  span.setAttribute('aria-hidden', 'true');
  return span;
}
