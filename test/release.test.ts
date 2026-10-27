import { describe, expect, it } from 'vitest';
import { format, nextRelease, notes, parseCommit, parseTag, prerelease } from '../scripts/release.mjs';

const c = (subject: string, body = '') => parseCommit('a'.repeat(40), subject, body);
const v = (s: string) => parseTag(`v${s}`)!;
const next = (last: string, ...subjects: string[]) => {
  const result = nextRelease(v(last), subjects.map((s) => c(s)));
  return result && format(result);
};

describe('parseCommit', () => {
  it('reads type, scope, subject and breaking markers', () => {
    expect(c('feat(tables): render alignment')).toMatchObject({ type: 'feat', scope: 'tables', breaking: false });
    expect(c('fix!: drop old setting').breaking).toBe(true);
    expect(c('refactor: x', 'BREAKING CHANGE: removed y').breaking).toBe(true);
    expect(c('Merge branch develop').type).toBe('other');
  });
});

describe('nextRelease', () => {
  it('keeps releases on even minors', () => {
    expect(next('0.0.0', 'feat: a')).toBe('0.2.0');
    expect(next('0.2.0', 'fix: a')).toBe('0.2.1');
    expect(next('0.2.3', 'feat: a', 'fix: b')).toBe('0.4.0');
    expect(next('0.0.0', 'fix: a')).toBe('0.0.1');
  });

  it('bumps major for breaking changes from 1.0 on, minor before', () => {
    expect(next('0.4.1', 'feat!: a')).toBe('0.6.0');
    expect(next('1.2.0', 'fix!: a')).toBe('2.0.0');
  });

  it('skips releases without user-facing changes', () => {
    expect(next('0.2.0', 'docs: a', 'chore: b', 'ci: c', 'test: d')).toBeUndefined();
  });
});

describe('prerelease', () => {
  it('uses the odd minor above the latest release and the run number as patch', () => {
    expect(format(prerelease(v('0.0.0'), 7))).toBe('0.1.7');
    expect(format(prerelease(v('0.2.1'), 42))).toBe('0.3.42');
  });

  it('always sorts above the latest release and below the next feature release', () => {
    const pre = prerelease(v('0.2.5'), 99);
    expect(pre.minor).toBeGreaterThan(2);
    expect(pre.minor).toBeLessThan(nextRelease(v('0.2.5'), [c('feat: x')])!.minor);
  });

  it('rejects invalid run numbers', () => {
    expect(() => prerelease(v('0.2.0'), Number.NaN)).toThrow();
  });
});

describe('notes', () => {
  it('groups commits and links them', () => {
    const text = notes('0.2.0', [c('feat(ui): a'), c('fix: b'), c('chore: c'), c('feat!: d')], '2026-01-02', 'https://x');
    expect(text).toContain('## 0.2.0 (2026-01-02)');
    expect(text).toMatch(/### Breaking changes\n\n- d/);
    expect(text).toMatch(/### Features\n\n- \*\*ui:\*\* a \(\[aaaaaaa\]\(https:\/\/x\/commit\/a+\)\)/);
    expect(text).not.toContain('- c');
  });
});
