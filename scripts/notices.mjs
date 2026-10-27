// Writes THIRD_PARTY_NOTICES.md for every npm package that ends up in the bundles (dist/inputs.json,
// written by `npm run build`/`npm run package`). CI fails if the committed file is out of date.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const inputs = JSON.parse(readFileSync('dist/inputs.json', 'utf8'));
const packages = new Set();
for (const file of inputs) {
  const match = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(file);
  if (match) packages.add(match[1]);
}

const licenseFile = (dir) =>
  ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'LICENSE-MIT'].map((f) => `${dir}/${f}`).find(existsSync);

const sections = [...packages].sort().map((name) => {
  const dir = `node_modules/${name}`;
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
  const file = licenseFile(dir);
  if (!file) throw new Error(`No license file found for ${name}`);
  const text = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').trim();
  return `## ${name} ${pkg.version}\n\nLicense: ${pkg.license}\n\n\`\`\`\n${text}\n\`\`\`\n`;
});

writeFileSync(
  'THIRD_PARTY_NOTICES.md',
  `# Third-party notices\n\nOnmark bundles the following open source packages. Their licenses are reproduced below.\n\n${sections.join('\n')}`,
);
console.log(`THIRD_PARTY_NOTICES.md: ${packages.size} packages`);
