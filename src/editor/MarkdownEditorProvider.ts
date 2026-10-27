import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import { EXTENSION_ID } from '../shared/meta';
import type { HostMessage, Settings, WebviewMessage } from '../shared/protocol';
import type { ThemeService } from '../theme/ThemeService';
import { openLink } from './links';
import { DocumentSync } from './sync';

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly theme: ThemeService,
  ) {}

  resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): void {
    const webview = panel.webview;
    const dist = vscode.Uri.joinPath(this.extensionUri, 'dist');
    const docDir = vscode.Uri.joinPath(document.uri, '..');
    webview.options = {
      enableScripts: true,
      localResourceRoots: [dist, docDir, ...(vscode.workspace.workspaceFolders ?? []).map((f) => f.uri)],
    };
    webview.html = this.html(webview, dist);

    const post = (message: HostMessage) => void webview.postMessage(message);
    const sync = new DocumentSync(document, post);

    const subscriptions = [
      this.theme.onDidChange((tokens) => post({ type: 'tokenTheme', tokens })),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === document && e.contentChanges.length > 0) sync.documentChanged();
      }),
      webview.onDidReceiveMessage(async (message: WebviewMessage) => {
        switch (message.type) {
          case 'ready': {
            const tokens = await this.theme.tokens;
            post({
              type: 'init',
              ...sync.snapshot(),
              tokens,
              eol: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n',
              baseUri: `${webview.asWebviewUri(docDir).toString()}/`,
              rootUri: `${webview.asWebviewUri(vscode.workspace.getWorkspaceFolder(document.uri)?.uri ?? docDir).toString()}/`,
              settings: readSettings(),
            });
            break;
          }
          case 'edit':
            sync.receiveEdit(message);
            break;
          case 'openLink':
            void openLink(message.target, message.modifier === 'side', document);
            break;
          case 'copy':
            void vscode.env.clipboard.writeText(message.text);
            break;
        }
      }),
    ];
    panel.onDidDispose(() => subscriptions.forEach((s) => s.dispose()));
  }

  private html(webview: vscode.Webview, dist: vscode.Uri): string {
    const nonce = randomBytes(16).toString('base64');
    const src = webview.cspSource;
    const script = webview.asWebviewUri(vscode.Uri.joinPath(dist, 'webview.js'));
    const style = webview.asWebviewUri(vscode.Uri.joinPath(dist, 'webview.css'));
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${src} https: data:; style-src ${src} 'nonce-${nonce}'; font-src ${src}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${style}" nonce="${nonce}">
</head>
<body>
<div id="editor"></div>
<script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }
}

function readSettings(): Settings {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  return {
    fontFamily: config.get('fontFamily', ''),
    fontSize: config.get('fontSize', 16),
    readableLineLength: config.get('readableLineLength', true),
    maxWidth: config.get('maxWidth', 750),
  };
}
