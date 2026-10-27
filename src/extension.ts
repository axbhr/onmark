import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './editor/MarkdownEditorProvider';
import { EXTENSION_ID, VIEW_TYPE } from './shared/meta';

/** URI of the command target: menu argument, else the active tab (text or custom editor). */
function targetUri(arg: unknown): vscode.Uri | undefined {
  if (arg instanceof vscode.Uri) return arg;
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  return input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom ? input.uri : undefined;
}

export function activate(context: vscode.ExtensionContext): void {
  const openWith = (viewType: string) => (arg: unknown) => {
    const uri = targetUri(arg);
    if (uri) return vscode.commands.executeCommand('vscode.openWith', uri, viewType);
  };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VIEW_TYPE, new MarkdownEditorProvider(context.extensionUri), {
      webviewOptions: { retainContextWhenHidden: false },
      supportsMultipleEditorsPerDocument: true,
    }),
    vscode.commands.registerCommand(`${EXTENSION_ID}.openSource`, openWith('default')),
    vscode.commands.registerCommand(`${EXTENSION_ID}.openLivePreview`, openWith(VIEW_TYPE)),
  );
}

export function deactivate(): void {}
