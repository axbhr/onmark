import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

const common = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
};

const configs = [
  {
    ...common,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode'],
  },
  {
    // Also emits dist/webview.css from the CSS imported in main.ts.
    ...common,
    entryPoints: ['webview/main.ts'],
    outfile: 'dist/webview.js',
    platform: 'browser',
    format: 'iife',
    target: 'chrome120',
    // Codicon font referenced from codicon.css; CSP allows fonts from the webview's own origin.
    loader: { '.ttf': 'file' },
    assetNames: '[name]',
  },
];

if (watch) {
  for (const config of configs) await (await esbuild.context(config)).watch();
} else {
  await Promise.all(configs.map((config) => esbuild.build(config)));
}
