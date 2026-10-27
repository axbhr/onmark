// Loads and activates the bundled extension (dist/extension.js) with a minimal `vscode` stub.
// Catches bundling problems such as unresolved runtime requires that unit tests cannot see.
const Module = require('module');
const path = require('path');

const disposable = { dispose() {} };
const event = () => disposable;
const vscode = {
  ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
  EndOfLine: { LF: 1, CRLF: 2 },
  ViewColumn: { Active: -1, Beside: -2 },
  EventEmitter: class { event = event; fire() {} dispose() {} },
  Disposable: class { constructor(f) { this.dispose = f; } },
  Uri: { joinPath: () => ({}), parse: () => ({}) },
  TabInputText: class {},
  TabInputCustom: class {},
  workspace: { getConfiguration: () => ({ get: () => undefined }), onDidChangeConfiguration: event, fs: { readFile: async () => new Uint8Array() } },
  window: { activeColorTheme: { kind: 2 }, onDidChangeActiveColorTheme: event, registerCustomEditorProvider: () => disposable },
  commands: { registerCommand: () => disposable },
  extensions: { all: [], onDidChange: event },
  env: {},
};

const load = Module._load;
Module._load = function (request, ...rest) {
  return request === 'vscode' ? vscode : load.call(this, request, ...rest);
};

const extension = require(path.resolve(__dirname, '../dist/extension.js'));
const context = { subscriptions: [], extensionUri: {} };
extension.activate(context);
if (context.subscriptions.length < 3) throw new Error(`Expected registrations, got ${context.subscriptions.length}`);
console.log(`Extension activated (${context.subscriptions.length} registrations).`);
