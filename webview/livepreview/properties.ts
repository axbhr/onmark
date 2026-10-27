export interface Property {
  key: string;
  value: string | string[];
  /** Zero-based line of the key within the YAML. */
  line: number;
}

const unquote = (v: string) => v.trim().replace(/^(["'])(.*)\1$/, '$2');

/**
 * Reads top-level `key: value`, `key: [a, b]` and `key:` + `- item` lines for display.
 * ponytail: not a YAML parser; nested maps and block scalars show as their raw first line.
 */
export function parseProperties(yaml: string): Property[] {
  const result: Property[] = [];
  for (const [index, line] of yaml.split('\n').entries()) {
    const item = /^\s*-\s+(.*)$/.exec(line);
    const last = result[result.length - 1];
    if (item && last) {
      last.value = [...(Array.isArray(last.value) ? last.value : last.value ? [last.value] : []), unquote(item[1])];
      continue;
    }
    const pair = /^([^\s:#][^:]*):(?:\s+(.*))?$/.exec(line);
    if (!pair) continue;
    const value = (pair[2] ?? '').trim();
    const list = /^\[(.*)\]$/.exec(value);
    result.push({
      key: pair[1].trim(),
      value: list ? list[1].split(',').map(unquote).filter(Boolean) : unquote(value),
      line: index,
    });
  }
  return result;
}
