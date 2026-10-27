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
