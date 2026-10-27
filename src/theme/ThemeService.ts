import { parse } from 'jsonc-parser';
import * as vscode from 'vscode';
import type { TokenTheme } from '../shared/tokens';
import { customizationRules, resolveTokenTheme, type TokenRule } from './tokenTheme';

interface ThemeContribution {
  id?: string;
  label?: string;
  uiTheme?: string;
  path: string;
}

const UI_THEME_KIND: Record<string, vscode.ColorThemeKind> = {
  vs: vscode.ColorThemeKind.Light,
  'vs-dark': vscode.ColorThemeKind.Dark,
  'hc-black': vscode.ColorThemeKind.HighContrast,
  'hc-light': vscode.ColorThemeKind.HighContrastLight,
};

const PREFERRED_SETTING: Record<vscode.ColorThemeKind, string> = {
  [vscode.ColorThemeKind.Light]: 'preferredLightColorTheme',
  [vscode.ColorThemeKind.Dark]: 'preferredDarkColorTheme',
  [vscode.ColorThemeKind.HighContrast]: 'preferredHighContrastColorTheme',
  [vscode.ColorThemeKind.HighContrastLight]: 'preferredHighContrastLightColorTheme',
};

/**
 * Token colors are not exposed to webviews, so they are read from the theme file of the extension that
 * contributes the active theme, merged with `editor.tokenColorCustomizations`, and pushed on every change.
 */
export class ThemeService implements vscode.Disposable {
  private current: Promise<TokenTheme> = this.load();
  private readonly emitter = new vscode.EventEmitter<TokenTheme>();
  readonly onDidChange = this.emitter.event;
  private readonly subscriptions: vscode.Disposable[];

  constructor() {
    const reload = () => {
      this.current = this.load();
      void this.current.then((theme) => this.emitter.fire(theme));
    };
    this.subscriptions = [
      this.emitter,
      vscode.window.onDidChangeActiveColorTheme(reload),
      vscode.extensions.onDidChange(reload),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('editor.tokenColorCustomizations')) reload();
      }),
    ];
  }

  get tokens(): Promise<TokenTheme> {
    return this.current;
  }

  dispose(): void {
    this.subscriptions.forEach((s) => s.dispose());
  }

  private async load(): Promise<TokenTheme> {
    try {
      const found = await findActiveTheme();
      if (!found) return {};
      const rules = await readTokenColors(vscode.Uri.joinPath(found.extension.extensionUri, found.theme.path));
      const names = [found.theme.id, found.label].filter((n): n is string => !!n);
      const custom = vscode.workspace.getConfiguration('editor').get('tokenColorCustomizations');
      return resolveTokenTheme([...rules, ...customizationRules(custom, names)]);
    } catch (error) {
      console.warn('[obsidianate] Could not read color theme', error);
      return {};
    }
  }
}

/** Setting names that may hold the active theme, most likely first. */
function themeCandidates(): string[] {
  const workbench = vscode.workspace.getConfiguration('workbench');
  const kind = vscode.window.activeColorTheme.kind;
  return [workbench.get<string>('colorTheme'), workbench.get<string>(PREFERRED_SETTING[kind])].filter(
    (n): n is string => !!n,
  );
}

/**
 * Only sees themes of extensions in the same extension host. In remote windows (WSL, SSH) theme
 * extensions live on the UI side, hence `extensionKind: ["ui", "workspace"]` in package.json.
 */
async function findActiveTheme() {
  const kind = vscode.window.activeColorTheme.kind;
  const all = (
    await Promise.all(
      vscode.extensions.all.map(async (extension) => {
        const themes: ThemeContribution[] = extension.packageJSON?.contributes?.themes ?? [];
        return Promise.all(
          themes.map(async (theme) => ({ extension, theme, label: await localize(extension, theme.label) })),
        );
      }),
    )
  ).flat();
  // Built-in themes have ids like "Dark Modern" while older settings say "Default Dark Modern".
  const matches = (name: string) =>
    all.filter(({ theme, label }) =>
      [theme.id, label].some((n) => n && (n === name || `Default ${n}` === name)),
    );
  const candidates = themeCandidates().flatMap(matches);
  return candidates.find(({ theme }) => UI_THEME_KIND[theme.uiTheme ?? 'vs-dark'] === kind) ?? candidates[0];
}

/** Resolves `%key%` labels via the extension's package.nls.json. */
async function localize(extension: vscode.Extension<unknown>, label?: string): Promise<string | undefined> {
  const key = /^%(.+)%$/.exec(label ?? '')?.[1];
  if (!key) return label;
  try {
    const nls = await readJson(vscode.Uri.joinPath(extension.extensionUri, 'package.nls.json'));
    return typeof nls[key] === 'string' ? nls[key] : label;
  } catch {
    return label;
  }
}

async function readJson(uri: vscode.Uri) {
  return parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))) ?? {};
}

async function readTokenColors(uri: vscode.Uri, depth = 0): Promise<TokenRule[]> {
  if (depth > 5) return [];
  const json = await readJson(uri);
  const included =
    typeof json.include === 'string' ? await readTokenColors(vscode.Uri.joinPath(uri, '..', json.include), depth + 1) : [];
  // ponytail: tokenColors given as a path to a .tmTheme (plist) file are not supported; such themes fall back.
  const own = Array.isArray(json.tokenColors) ? (json.tokenColors as TokenRule[]) : [];
  return [...included, ...own];
}
