# Security policy

## Supported versions

Only the latest release (and the latest pre-release) of Onmark receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.
Report them privately through [GitHub Security Advisories](https://github.com/axbhr/onmark/security/advisories/new).

You can expect a first response within a week. Once a fix is released, the advisory will be published with credit to you, unless you prefer to stay anonymous.

## Scope

Onmark renders Markdown from files you open. Relevant issues include, for example:

- Script execution or CSP bypasses in the editor webview
- Links or images in a Markdown file that trigger commands, open local resources outside the workspace or leak data
- Anything that writes to files other than the one being edited

## Verifying a release

Every `.vsix` attached to a [GitHub release](https://github.com/axbhr/onmark/releases) comes with a SHA-256 checksum and a signed [build provenance attestation](https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations). It proves that the file was built from this repository by the release workflow:

```bash
gh attestation verify onmark-<version>.vsix --repo axbhr/onmark
```

## How the project is protected

- `main` only changes through pull requests that pass tests on three platforms and CodeQL; release tags cannot be moved or deleted.
- Publishing to the VS Code Marketplace and Open VSX needs a manual approval in the protected `production` environment.
- Workflows run with read-only tokens by default, only GitHub-owned actions pinned to commit SHAs are allowed, and dependency install scripts are disabled in CI.
- Secret scanning with push protection, Dependabot alerts and security updates are enabled.
