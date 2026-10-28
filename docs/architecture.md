# Architecture

Onmark is a [custom text editor](https://code.visualstudio.com/api/extension-guides/custom-editors) for `*.md` files. The extension host owns the file; a webview runs [CodeMirror 6](https://codemirror.net) and draws the live preview on top of the Markdown syntax tree.

```
src/                         extension host (Node)
├─ extension.ts              registration: custom editor, commands, theme service
├─ editor/
│  ├─ MarkdownEditorProvider.ts  webview setup, CSP, message routing
│  ├─ sync.ts                document ⇄ webview sync with echo protection
│  └─ links.ts               link classification and opening (trust boundary)
├─ theme/                    reads token colors of the active color theme
└─ shared/                   code used by both bundles (protocol, text helpers)
webview/                     browser bundle
├─ main.ts, editor.ts        message handling, CodeMirror setup
├─ syntaxTheme.ts            code token colors, light/dark flag
└─ livepreview/              all rendering (see below)
```

## Single source of truth

`vscode.TextDocument` is the only source of truth. Saving, dirty state, undo across editors, Git diff and hot exit all go through VS Code; the webview never writes to disk.

- **Positions are sent as line/column, never as offsets.** CodeMirror counts a line break as one character, VS Code as two in CRLF files. The webview always gets LF text; the host writes edits with the file's own line ending.
- **Echo protection in the webview:** host updates are dispatched with a `remoteUpdate` annotation and never sent back.
- **Echo protection in the host:** `DocumentSync` mirrors the text the webview currently has. Document changes equal to that mirror came from the webview and do not produce an `externalUpdate`.
- **Stale edits:** every `edit` carries the version of the last `init`/`externalUpdate`. If the host has sent a newer update since, it drops the edit; the pending update overwrites the webview, so both sides converge.
- **`externalUpdate`** is applied as a minimal diff (common prefix/suffix) without an undo entry, so cursor, selection and scroll position survive.
- `retainContextWhenHidden` is off; cursor and scroll position are restored via `vscode.setState`.

## Messages

| Direction | Message | Purpose |
| --- | --- | --- |
| webview → host | `ready` | webview loaded, host answers with `init` |
| webview → host | `edit` | text changes as line/column ranges |
| webview → host | `openLink` | Ctrl/Cmd+click on a link |
| webview → host | `copy` | copy button of code blocks (`vscode.env.clipboard`) |
| host → webview | `init` | text, version, EOL, resource URIs, settings, token colors |
| host → webview | `externalUpdate` | the document changed outside the webview |
| host → webview | `tokenTheme` | the color theme or token customizations changed |

All types live in [`src/shared/protocol.ts`](../src/shared/protocol.ts).

## Live preview

Rendering is driven by the Lezer Markdown tree (GFM plus own extensions for `==highlight==` and YAML frontmatter), never by regular expressions on the text.

- **`context.ts`** walks the tree and calls one handler per node type. Handlers hide syntax, add marks, line classes or widgets. Hidden ranges and replacing widgets are atomic, so the cursor never lands inside invisible characters.
- **`inline.ts`** is a `ViewPlugin` for inline elements and only looks at the visible ranges.
- **`blocks.ts`** is a `StateField` for block elements; block widgets and replacements across line breaks must come from state. It covers the whole document but caches per top-level block: a block is rebuilt only if its text, position, selection overlap or fold state changed, everything else is mapped. A randomized test compares the incremental result with a full rebuild.
- One file per decoration group (`headings.ts`, `formatting.ts`, `links.ts`, `images.ts`, `quotes.ts`, `lists.ts`, `rules.ts`, `codeblocks.ts`, `tables.ts`, `callouts.ts`, `frontmatter.ts`) and one file per widget in `widgets/`.

**Visibility rules:** inline syntax shows while the selection touches the element, block syntax (headings, quotes, list markers) on the cursor line, and large blocks (tables, code fences, frontmatter) while the cursor is inside them.

**Backgrounds and the selection:** CodeMirror draws the selection in a layer *behind* the text. Backgrounds of code blocks, callouts, quotes, inline code and highlights are therefore not painted on the elements but by `backgrounds.ts`, a layer below the selection layer that copies the boxes of those elements.

**Editable tables:** `widgets/table.ts` renders tables as an editable grid. A focused cell shows its Markdown source (`contenteditable="plaintext-only"`); every keystroke becomes a minimal change of that cell in the document, so the undo history groups typing as usual. Structural operations (rows, columns, alignment) live in `tableModel.ts` as pure functions that only touch the affected cells or lines; a randomized test checks them against a reference model. While a cell is focused, CodeMirror ignores the table's DOM events and selection, and `updateDOM` keeps the focused cell untouched unless its source changed elsewhere (undo).

**HTML:** `html/sanitize.ts` parses HTML from notes into an inert document and rebuilds it from an allowlist, so scripts, event handlers, frames and unsafe URLs never reach the page. Inline styles are applied through CSSOM, which the CSP allows (unlike `style` attributes); `<style>` blocks become one constructed stylesheet scoped with `@scope (.cm-om-html)`, re-serialized rule by rule so the CSS cannot break out of the scope. Positioning that could cover the editor is removed.

**Tables without jumping:** a rendered table is a block widget whose rows are exactly one line high and whose header is two (it stands in for the `|---|` line). Borders are box shadows and take no space, so the content below stays put when switching between rendered and raw text.

## Theme

- The UI and rendered Markdown use only workbench color variables (`--vscode-*`), so they look like VS Code's own Markdown preview and follow theme switches instantly.
- Webviews do not get token colors. `ThemeService` therefore reads the theme file of the extension contributing the active theme, follows `include`, applies `editor.tokenColorCustomizations` and sends the result as `tokenTheme`.
- In remote windows (WSL, SSH, containers) theme extensions live on the UI side, hence `extensionKind: ["ui", "workspace"]`. If the theme file cannot be read, a fallback built from theme variables (`symbolIcon-*`, `debugTokenExpression-*`) is used.

## Security

- Strict CSP with a nonce, no inline scripts, no remote code. Images may come from the workspace, `https:` and `data:`.
- Links from file content are a trust boundary: only `http`, `https` and `mailto` open externally; `command:` and other schemes are ignored.
- `localResourceRoots` is limited to the extension's `dist/` folder, the note's folder and the workspace folders.

## Keyboard

VS Code forwards every key that reaches the webview's `window` to its own keybindings. Keys handled by CodeMirror (and undo/redo always) are stopped there, so nothing runs twice. `Ctrl+B`/`Ctrl+I` toggle bold/italic instead of the sidebar/inline chat while Onmark has focus; `Ctrl+F` opens CodeMirror's search, which also finds text outside the rendered viewport.
