import type { Change } from './text';

export interface Settings {
  fontFamily: string;
  fontSize: number;
  readableLineLength: boolean;
  maxWidth: number;
}

/** Messages sent from the webview to the extension host. */
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'edit'; baseVersion: number; changes: Change[] }
  /** `side`: open in the editor group beside the current one. */
  | { type: 'openLink'; target: string; modifier: 'none' | 'side' };

/** Messages sent from the extension host to the webview. Texts are always LF-normalized. */
export type HostMessage =
  | {
      type: 'init';
      text: string;
      version: number;
      eol: '\n' | '\r\n';
      baseUri: string;
      settings: Settings;
    }
  | { type: 'externalUpdate'; text: string; version: number };
