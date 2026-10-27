import * as vscode from 'vscode';
import { VIEW_TYPE } from '../shared/meta';

export type LinkTarget =
  | { kind: 'external'; url: string }
  /** `path` is decoded and relative to the note's folder, or to the vault root if `fromRoot`. */
  | { kind: 'file'; path: string; fromRoot: boolean; fragment?: string };

// Trust boundary: link targets come from file content. Never hand e.g. `command:` URIs to the opener.
const EXTERNAL_SCHEMES = new Set(['http', 'https', 'mailto']);

/** Classifies a raw Markdown link target. Returns undefined for anything we must not or cannot open. */
export function parseLinkTarget(raw: string): LinkTarget | undefined {
  const target = raw.trim().replace(/^<(.*)>$/, '$1');
  // A single letter before ':' is a Windows drive, not a scheme.
  const scheme = /^([a-z][a-z0-9+.-]+):/i.exec(target)?.[1].toLowerCase();
  if (scheme) return EXTERNAL_SCHEMES.has(scheme) ? { kind: 'external', url: target } : undefined;

  const hash = target.indexOf('#');
  const rawPath = hash < 0 ? target : target.slice(0, hash);
  if (!rawPath) return undefined; // same-document anchors are not supported yet
  let path = rawPath;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    // keep undecoded, e.g. a literal `%` in the file name
  }
  return {
    kind: 'file',
    path: path.replace(/\\/g, '/'),
    fromRoot: path.startsWith('/'),
    fragment: hash < 0 ? undefined : target.slice(hash + 1),
  };
}

export async function openLink(raw: string, toSide: boolean, document: vscode.TextDocument): Promise<void> {
  const target = parseLinkTarget(raw);
  if (!target) {
    void vscode.window.showWarningMessage(`Link kann nicht geöffnet werden: ${raw}`);
    return;
  }
  if (target.kind === 'external') {
    await vscode.env.openExternal(vscode.Uri.parse(target.url, true));
    return;
  }

  const root = vscode.workspace.getWorkspaceFolder(document.uri)?.uri;
  const base = target.fromRoot && root ? root : vscode.Uri.joinPath(document.uri, '..');
  const uri = vscode.Uri.joinPath(base, target.path);
  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    void vscode.window.showWarningMessage(`Datei nicht gefunden: ${vscode.workspace.asRelativePath(uri)}`);
    return;
  }
  const column = toSide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;
  if (uri.path.toLowerCase().endsWith('.md')) {
    await vscode.commands.executeCommand('vscode.openWith', uri, VIEW_TYPE, column);
  } else {
    await vscode.commands.executeCommand('vscode.open', uri, column);
  }
}
