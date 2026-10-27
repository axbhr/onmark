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
  style.setProperty('--ob-font-family', settings.fontFamily || 'var(--vscode-font-family)');
  style.setProperty('--ob-font-size', `${settings.fontSize}px`);
  style.setProperty('--ob-max-width', settings.readableLineLength ? `${settings.maxWidth}px` : 'none');
}

window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'init':
      version = message.version;
      applySettings(message.settings);
      if (editor) {
        editor.applyRemote(message.text);
        break;
      }
      editor = createEditor({
        parent: document.getElementById('editor')!,
        text: message.text,
        nonce,
        restore: vscode.getState(),
        onEdit: (changes) => vscode.postMessage({ type: 'edit', baseVersion: version, changes }),
        onViewState: (state) => vscode.setState(state),
      });
      break;
    case 'externalUpdate':
      version = message.version;
      editor?.applyRemote(message.text);
      break;
  }
});

vscode.postMessage({ type: 'ready' });
