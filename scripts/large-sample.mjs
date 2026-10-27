// Generates samples/large.md (5,000+ lines) from the showcase for performance testing.
import { readFileSync, writeFileSync } from 'node:fs';

const body = readFileSync('samples/showcase.md', 'utf8').replace(/^---[\s\S]*?---\n/, '');
const lines = body.split('\n').length;
const copies = Math.ceil(5200 / lines);
const text = Array.from({ length: copies }, (_, i) => body.replace(/^# /m, `# ${i + 1}. `)).join('\n');
writeFileSync('samples/large.md', text);
console.log(`samples/large.md: ${text.split('\n').length} lines`);
