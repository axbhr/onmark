import * as vscode from 'vscode';
import type { HostMessage, WebviewMessage } from '../shared/protocol';
import { applyChanges, toLf } from '../shared/text';

type EditMessage = Extract<WebviewMessage, { type: 'edit' }>;

/**
 * Keeps one webview in sync with a TextDocument.
 *
 * Echo protection: `shadow` mirrors the (LF) text the webview currently has. A document change whose
 * text equals the shadow originated from the webview and is not sent back.
 * Staleness: edits carry the version of the last init/externalUpdate the webview received. If the host
 * has sent a newer update since, the edit is based on outdated text and is dropped; the pending update
 * will overwrite the webview anyway, so both sides converge.
 */
export class DocumentSync {
  private shadow = '';
  private sentVersion = -1;
  private queue = Promise.resolve();

  constructor(
    private readonly document: vscode.TextDocument,
    private readonly post: (message: HostMessage) => void,
  ) {}

  /** Call on `ready`; returns the snapshot for the init message. */
  snapshot(): { text: string; version: number } {
    this.shadow = toLf(this.document.getText());
    this.sentVersion = this.document.version;
    return { text: this.shadow, version: this.sentVersion };
  }

  documentChanged(): void {
    if (this.sentVersion < 0) return; // webview not initialized yet; init will carry the text
    const text = toLf(this.document.getText());
    if (text === this.shadow) return;
    this.sendUpdate(text);
  }

  receiveEdit(message: EditMessage): void {
    // Serialize so the shadow is never ahead of the document by more than the edit being applied.
    this.queue = this.queue.then(() => this.applyEdit(message)).catch(() => this.resync());
  }

  private async applyEdit({ baseVersion, changes }: EditMessage): Promise<void> {
    if (baseVersion !== this.sentVersion) return;
    const eol = this.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    const edit = new vscode.WorkspaceEdit();
    for (const { from, to, insert } of changes) {
      edit.replace(
        this.document.uri,
        new vscode.Range(from.line, from.ch, to.line, to.ch),
        insert.replace(/\n/g, eol),
      );
    }
    this.shadow = applyChanges(this.shadow, changes);
    if (!(await vscode.workspace.applyEdit(edit))) this.resync();
  }

  private resync(): void {
    this.sendUpdate(toLf(this.document.getText()));
  }

  private sendUpdate(text: string): void {
    this.shadow = text;
    this.sentVersion = this.document.version;
    this.post({ type: 'externalUpdate', text, version: this.sentVersion });
  }
}
