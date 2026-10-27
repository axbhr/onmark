# Contributing to Onmark

Thanks for your interest in improving Onmark! Bug reports, ideas and pull requests are all welcome.

## Development setup

Requirements: Node.js 20 or newer and VS Code (or VSCodium).

```bash
git clone https://github.com/axbhr/onmark.git
cd onmark
npm ci
```

| Command | What it does |
| --- | --- |
| `npm run build` | Development build to `dist/` |
| `npm run watch` | Rebuild on every change |
| `npm run typecheck` | TypeScript in strict mode |
| `npm test` | Unit tests (Vitest) |
| `npm run package` | Minified production build |
| `npm run vsix` | Build an installable `.vsix` |
| `npm run notices` | Regenerate `THIRD_PARTY_NOTICES.md` after dependency changes (run `npm run package` first) |
| `npm run sample:large` | Generate `samples/large.md` (5,000+ lines) for performance checks |

Press **F5** to start an Extension Development Host with the `samples/` folder. `samples/showcase.md` contains every supported element.

The code is described in [docs/architecture.md](docs/architecture.md).

## Branches

Onmark uses [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/):

| Branch | Purpose |
| --- | --- |
| `feature/*` | New work, branched from and merged back into `develop` |
| `develop` | Integration branch; every push becomes a **pre-release** |
| `release/*`, `hotfix/*` | Preparing a release or fixing production; merged into `main` and `develop` |
| `main` | Released code; every merge may become a **release** |

Open pull requests against `develop`.

`main` is protected: it only changes through pull requests (merge commits, so the Conventional Commits stay in the history), all checks (tests on three platforms, packaging, CodeQL) must pass, and force pushes and deletion are blocked. `develop` and the `v*` release tags cannot be force-pushed or deleted either.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org). They decide the next version and become the changelog:

| Commit | Effect on the next release |
| --- | --- |
| `fix: …`, `perf: …`, `revert: …` | patch, e.g. `0.2.0 → 0.2.1` |
| `feat: …` | minor, e.g. `0.2.1 → 0.4.0` |
| `feat!: …` or `BREAKING CHANGE:` in the body | major once `1.0.0` is reached, minor before |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `style:`, `build:` | no release |

## Releases

Versioning is fully automated; `package.json` always says `0.0.0` and CI sets the real version. Following the [VS Code recommendation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions), releases use **even** minor versions and pre-releases **odd** ones, so pre-release users always stay ahead of the stable channel.

| Stage | Trigger | Workflow | Result |
| --- | --- | --- | --- |
| **dev** | pull request or push to a feature branch | `CI` | type check and tests on Linux, Windows and macOS; `.vsix` artifact |
| **test** | push to `develop` | `Pre-release` | pre-release `X.<odd>.<run>` on the VS Code Marketplace and Open VSX |
| **prod** | pull request `develop` → `main` merged, then approval | `Release` | release `X.<even>.Y` on the VS Code Marketplace and Open VSX, Git tag `vX.Y.Z`, GitHub release with changelog and `.vsix` |

The `test` and `production` GitHub environments hold the publishing tokens:

- `VSCE_PAT`: Azure DevOps personal access token with the **Marketplace → Manage** scope for the `axbhr` publisher
- `OVSX_PAT`: Open VSX access token for the `axbhr` namespace

Releases to `production` require an approval by a maintainer.
