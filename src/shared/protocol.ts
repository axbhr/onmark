import type { Change } from './text';
import type { TokenTheme } from './tokens';

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
  | { type: 'openLink'; target: string; modifier: 'none' | 'side' }
  | { type: 'copy'; text: string };

/** Messages sent from the extension host to the webview. Texts are always LF-normalized. */
export type HostMessage =
  | {
      type: 'init';
      text: string;
      version: number;
      eol: '\n' | '\r\n';
      /** Webview URI of the note's folder, with trailing slash. */
      baseUri: string;
      /** Webview URI of the workspace folder (or the note's folder), with trailing slash. */
      rootUri: string;
      settings: Settings;
      tokens: TokenTheme;
    }
  | { type: 'externalUpdate'; text: string; version: number }
  /** Code token colors of the active color theme; sent on every theme change. */
  | { type: 'tokenTheme'; tokens: TokenTheme };
