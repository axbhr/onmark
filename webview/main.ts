import '@vscode/codicons/dist/codicon.css';
import './theme.css';
import type { HostMessage, Settings, WebviewMessage } from '../src/shared/protocol';
import { createEditor, type Editor, type ViewState } from './editor';

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): ViewState | undefined;
  setState(state: ViewState): void;
};

const vscode = acquireVsCodeApi();
const nonce = (document.currentScript as HTMLScriptElement | null)?.nonce ?? '';

let editor: Editor | undefined;
/** Version of the last init/externalUpdate; sent with every edit so the host can drop stale ones. */
let version = -1;

function applySettings(settings: Settings): void {
  const style = document.documentElement.style;
  style.setProperty('--om-font-family', settings.fontFamily || 'var(--vscode-font-family)');
  style.setProperty('--om-font-size', `${settings.fontSize}px`);
  style.setProperty('--om-max-width', settings.readableLineLength ? `${settings.maxWidth}px` : 'none');
}

window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'init':
      version = message.version;
      applySettings(message.settings);
      if (editor) {
        editor.applyRemote(message.text);
        editor.setTokenTheme(message.tokens);
        break;
      }
      editor = createEditor({
        parent: document.getElementById('editor')!,
        text: message.text,
        tokens: message.tokens,
        nonce,
        restore: vscode.getState(),
        onEdit: (changes) => vscode.postMessage({ type: 'edit', baseVersion: version, changes }),
        onCopy: (text) => vscode.postMessage({ type: 'copy', text }),
        baseUri: message.baseUri,
        rootUri: message.rootUri,
        onOpenLink: (target, toSide) =>
          vscode.postMessage({ type: 'openLink', target, modifier: toSide ? 'side' : 'none' }),
        onViewState: (state) => vscode.setState(state),
      });
      break;
    case 'externalUpdate':
      version = message.version;
      editor?.applyRemote(message.text);
      break;
    case 'tokenTheme':
      editor?.setTokenTheme(message.tokens);
      break;
  }
});

vscode.postMessage({ type: 'ready' });
