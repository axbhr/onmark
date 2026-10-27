// Versioning and changelog from Conventional Commits and `v<semver>` release tags.
//
// Follows the VS Code Marketplace recommendation: releases use an EVEN minor (0.2.x, 0.4.x),
// pre-releases an ODD minor above the latest release (0.3.<run>), so pre-release users always
// stay ahead of the release channel. The version in package.json stays 0.0.0; CI sets the real one.
//
// CLI:
//   node scripts/release.mjs next-release            -> prints the next release version, or nothing
//   node scripts/release.mjs prerelease <run-number> -> prints the pre-release version
//   node scripts/release.mjs notes <version>         -> prints release notes for the commits since the last tag
//   node scripts/release.mjs changelog <version>     -> prints a full CHANGELOG.md including <version>

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** @typedef {{ major: number, minor: number, patch: number }} Version */
/** @typedef {{ type: string, scope?: string, subject: string, breaking: boolean, hash: string }} Commit */

const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;
const SECTIONS = /** @type {const} */ ([
  ['breaking', 'Breaking changes'],
  ['feat', 'Features'],
  ['fix', 'Bug fixes'],
  ['perf', 'Performance'],
  ['revert', 'Reverts'],
]);

/** @param {string} tag @returns {Version | undefined} */
export function parseTag(tag) {
  const m = RELEASE_TAG.exec(tag.trim());
  return m ? { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) } : undefined;
}

/** @param {Version} v */
export const format = (v) => `${v.major}.${v.minor}.${v.patch}`;

/**
 * Parses one commit in `git log --format=%H%x1f%s%x1f%b` form.
 * @param {string} hash @param {string} subject @param {string} body @returns {Commit}
 */
export function parseCommit(hash, subject, body = '') {
  const m = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/.exec(subject.trim());
  if (!m) return { type: 'other', subject: subject.trim(), breaking: false, hash };
  return {
    type: m[1].toLowerCase(),
    scope: m[2] || undefined,
    subject: m[4],
    breaking: Boolean(m[3]) || /^BREAKING[ -]CHANGE:/m.test(body),
    hash,
  };
}

const nextEven = (n) => n + (n % 2 === 0 ? 2 : 1);

/**
 * Next release version (even minor) after `last`, or undefined if no commit warrants a release.
 * @param {Version} last @param {Commit[]} commits @returns {Version | undefined}
 */
export function nextRelease(last, commits) {
  const breaking = commits.some((c) => c.breaking);
  const feature = commits.some((c) => c.type === 'feat');
  const fix = commits.some((c) => ['fix', 'perf', 'revert'].includes(c.type));
  // Releases always sit on an even minor, also when coming from 0.0.0.
  const minor = last.minor % 2 === 0 ? last.minor : last.minor + 1;
  if (breaking && last.major >= 1) return { major: last.major + 1, minor: 0, patch: 0 };
  if (breaking || feature) {
    return { major: last.major, minor: nextEven(minor), patch: 0 };
  }
  if (fix) return { major: last.major, minor, patch: last.patch + 1 };
  return undefined;
}

/**
 * Pre-release version: odd minor right above the latest release, patch = CI run number.
 * @param {Version} last @param {number} run @returns {Version}
 */
export function prerelease(last, run) {
  if (!Number.isInteger(run) || run < 0) throw new Error(`Invalid run number: ${run}`);
  const minor = last.minor % 2 === 0 ? last.minor + 1 : last.minor;
  return { major: last.major, minor, patch: run };
}

/**
 * Markdown section for one version.
 * @param {string} version @param {Commit[]} commits @param {string} date @param {string} [repo]
 */
export function notes(version, commits, date, repo) {
  const lines = [`## ${version} (${date})`, ''];
  const link = (c) => (repo ? ` ([${c.hash.slice(0, 7)}](${repo}/commit/${c.hash}))` : '');
  let any = false;
  for (const [key, title] of SECTIONS) {
    const list = commits.filter((c) => (key === 'breaking' ? c.breaking : c.type === key && !c.breaking));
    if (!list.length) continue;
    any = true;
    lines.push(`### ${title}`, '', ...list.map((c) => `- ${c.scope ? `**${c.scope}:** ` : ''}${c.subject}${link(c)}`), '');
  }
  if (!any) lines.push('Maintenance release.', '');
  return lines.join('\n');
}

// --- git access (CLI only) ---------------------------------------------------------------------

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** Release tags, newest first; only those reachable from HEAD unless `all`. */
function releaseTags(all = false) {
  const merged = all ? [] : ['--merged', 'HEAD'];
  return git('tag', ...merged, '--sort=-v:refname', '--list', 'v*').split('\n').filter((t) => parseTag(t));
}

function commitsBetween(from, to = 'HEAD') {
  const range = from ? `${from}..${to}` : to;
  const out = git('log', range, '--no-merges', '--format=%H%x1f%s%x1f%b%x1e');
  return out
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject, body] = entry.split('\x1f');
      return parseCommit(hash, subject, body);
    });
}

const today = () => new Date().toISOString().slice(0, 10);
const tagDate = (tag) => git('log', '-1', '--format=%cs', tag);
const repoUrl = () => (process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}` : undefined);

function main([command, arg]) {
  const tags = releaseTags();
  const last = parseTag(tags[0] ?? 'v0.0.0');
  switch (command) {
    case 'next-release': {
      const next = nextRelease(last, commitsBetween(tags[0]));
      if (next) process.stdout.write(format(next));
      return;
    }
    case 'prerelease':
      // Base on the newest release anywhere (its tag lives on main), so pre-releases stay above it.
      process.stdout.write(format(prerelease(parseTag(releaseTags(true)[0] ?? 'v0.0.0'), Number(arg))));
      return;
    case 'notes':
      process.stdout.write(notes(arg, commitsBetween(tags[0]), today(), repoUrl()));
      return;
    case 'changelog': {
      const sections = [notes(arg, commitsBetween(tags[0]), today(), repoUrl())];
      tags.forEach((tag, i) => {
        sections.push(notes(tag.slice(1), commitsBetween(tags[i + 1], tag), tagDate(tag), repoUrl()));
      });
      process.stdout.write(`# Changelog\n\nAll notable changes to Onmark. Generated from [Conventional Commits](https://www.conventionalcommits.org).\n\n${sections.join('\n')}`);
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
