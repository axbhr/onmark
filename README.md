<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/axbhr/onmark/main/.github/assets/onmark-lockup-dark.png">
  <img alt="Onmark" src="https://raw.githubusercontent.com/axbhr/onmark/main/.github/assets/onmark-lockup-light.png" width="360">
</picture>

### Markdown that renders as you write.

Live preview editing for Markdown in VS Code and VSCodium.<br>
No split view, no toggling. Syntax only appears where your cursor is.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/axbhr.onmark?label=VS%20Code%20Marketplace&logo=visualstudiocode&color=E2572B)](https://marketplace.visualstudio.com/items?itemName=axbhr.onmark)
[![Open VSX](https://img.shields.io/open-vsx/v/axbhr/onmark?label=Open%20VSX&logo=vscodium&color=1C1B19)](https://open-vsx.org/extension/axbhr/onmark)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/axbhr.onmark?color=E2572B)](https://marketplace.visualstudio.com/items?itemName=axbhr.onmark)
[![Release](https://img.shields.io/github/actions/workflow/status/axbhr/onmark/release.yml?branch=main&label=release)](https://github.com/axbhr/onmark/actions/workflows/release.yml)
[![License: GPL v3](https://img.shields.io/badge/license-GPL--3.0-1C1B19)](LICENSE)

[**Install**](#-install) · [**Features**](#-features) · [**Settings**](#-settings) · [**FAQ**](#-faq) · [**Contributing**](CONTRIBUTING.md)

<br>

<img alt="Typing in Onmark: Markdown renders while you write" src="https://raw.githubusercontent.com/axbhr/onmark/main/.github/assets/demo.gif" width="760">

</div>

<br>

## ✨ Why Onmark

Markdown is great to write and tiring to read while you write it. The usual answer is a preview pane next to your editor, which halves your screen and makes your eyes jump back and forth.

Onmark renders the Markdown **in the editor itself**. Headings are big, bold text is bold, tables are tables. Move the cursor into an element and its raw syntax appears so you can edit it; move away and it renders again.

- 🪶 **Plain Markdown on disk.** Onmark never rewrites or reformats anything you did not change. Your files stay portable and diff cleanly in Git.
- 🎨 **Looks like your VS Code.** Colors, fonts and code highlighting come from your active theme, including dark, light and high contrast, and follow theme switches instantly.
- ⚡ **Fast on big files.** Built on [CodeMirror 6](https://codemirror.net) with a real Markdown parser. Documents with thousands of lines stay smooth while typing and scrolling.
- 🔒 **Local and private.** No telemetry, no accounts, no network access except images your notes link to.

## 🧩 Features

| | |
| --- | --- |
| **Text** | Headings, **bold**, *italic*, ~~strikethrough~~, ==highlight==, `inline code`, links and autolinks |
| **Lists** | Bullets, numbered lists and clickable task checkboxes that edit the source |
| **Code blocks** | Syntax highlighting for 100+ languages in your theme's colors, language label, copy button |
| **Tables** | GitHub tables you edit in place: click a cell to type, add or remove rows and columns and set alignment from a toolbar, `Tab`/`Enter` to move between cells |
| **HTML & CSS** | Inline HTML (`<kbd>`, `<sub>`, `<span style>` …), HTML blocks, `<details>` and `<style>` blocks; sanitized, scripts never run |
| **Callouts** | `> [!note]`, `[!tip]`, `[!warning]` and 10 more types with icons and colors; foldable with `+`/`-` |
| **Images** | Local images (relative to the note or the workspace) and `https` images, with optional width `![alt\|300](…)` |
| **Frontmatter** | YAML frontmatter as a compact, foldable **Properties** block |
| **Quotes & rules** | Block quotes with a side bar, horizontal rules |
| **Editing** | Search and replace (`Ctrl+F`), multiple cursors, undo that stays in sync with the text editor |

<details>
<summary><b>Screenshots in a light and a dark theme</b></summary>
<br>

| Dark Modern | Light Modern |
| --- | --- |
| <img alt="Onmark in the Dark Modern theme" src="https://raw.githubusercontent.com/axbhr/onmark/main/.github/assets/screenshot-dark.png"> | <img alt="Onmark in the Light Modern theme" src="https://raw.githubusercontent.com/axbhr/onmark/main/.github/assets/screenshot-light.png"> |

</details>

## 📦 Install

**VS Code:** search for **Onmark** in the Extensions view, or install it from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=axbhr.onmark).

```bash
code --install-extension axbhr.onmark
```

**VSCodium and other Open VSX editors:** install it from [Open VSX](https://open-vsx.org/extension/axbhr/onmark).

```bash
codium --install-extension axbhr.onmark
```

**Offline:** download the `.vsix` from the [latest release](https://github.com/axbhr/onmark/releases/latest) and run **Extensions: Install from VSIX…**.

Onmark requires VS Code 1.90 or newer (or a VSCodium release based on it).

## 🚀 Usage

Open any `.md` file. It opens in Onmark automatically.

- **See the raw text:** click **Open as Source Text** in the editor title bar or run **Onmark: Open as Source Text** from the Command Palette.
- **Back to the live preview:** click the Onmark button in the title bar of the text editor or run **Onmark: Open in Live Preview**.
- **Open links:** click a rendered link. Add `Alt` to open it to the side. While the cursor is inside a link (its syntax is visible), a click edits it and `Ctrl+Click` (`Cmd+Click` on macOS) opens it. Relative `.md` links open in Onmark, other files in their default editor.
- **Edit tables:** click a cell and type. The toolbar above the table inserts or deletes rows and columns and aligns the column; the `+` handles add a row or column at the end. **Edit as Markdown** in the toolbar shows the raw table.

Both editors can be open side by side on the same file; changes appear in both instantly.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+B` / `Cmd+B` | Toggle **bold** |
| `Ctrl+I` / `Cmd+I` | Toggle *italic* |
| `Ctrl+F` / `Cmd+F` | Find and replace inside the note |
| Click / `Ctrl+Click` | Open link (`+Alt`: to the side) |
| `Tab` / `Shift+Tab` | Next / previous table cell (`Tab` in the last cell adds a row) |
| `Enter` | Table cell below (adds a row in the last row) |
| `Esc` | Leave the table |

While Onmark has focus, `Ctrl+B` and `Ctrl+I` format text instead of toggling the sidebar or opening inline chat.

## 🔧 Settings

| Setting | Default | Description |
| --- | --- | --- |
| `onmark.fontFamily` | `""` | Font for body text. Empty uses the VS Code UI font. Code always uses your editor font. |
| `onmark.fontSize` | `16` | Font size of body text in pixels. |
| `onmark.readableLineLength` | `true` | Center the text and limit its width, like a document. |
| `onmark.maxWidth` | `750` | Maximum text width in pixels when `readableLineLength` is on. |

## ❓ FAQ

<details>
<summary><b>How do I make the normal text editor the default again?</b></summary>
<br>

Add this to your `settings.json`. Onmark stays available via **Reopen Editor With…** and the title bar button.

```json
"workbench.editorAssociations": {
  "*.md": "default"
}
```

</details>

<details>
<summary><b>Does Onmark change my files?</b></summary>
<br>

Only where you type. Onmark edits the same document as the built-in text editor, keeps your line endings (LF or CRLF), never reformats and never adds metadata. Saving, undo, Git and hot exit work as usual.

</details>

<details>
<summary><b>Code blocks use slightly different colors than my theme in WSL, SSH or containers</b></summary>
<br>

VS Code does not give webviews access to syntax colors, so Onmark reads them from the theme's extension. Onmark prefers to run on your local machine (where your themes live). If it runs remotely and cannot reach the theme, it falls back to similar colors derived from your theme.

</details>

<details>
<summary><b>Is Onmark related to Obsidian?</b></summary>
<br>

No. Onmark is an independent project inspired by the live preview idea popularized by Obsidian and supports its callout and highlight syntax, but it is not affiliated with or endorsed by Obsidian.

</details>

<details>
<summary><b>Which HTML and CSS does Onmark render?</b></summary>
<br>

HTML in notes is rendered like in a browser, but rebuilt from an allowlist of safe elements and attributes: scripts, event handlers, frames, forms and unsafe URLs are removed, and scripts never run. Inline `style` attributes work. CSS from `<style>` blocks applies to the HTML in the same note only, so it cannot change the editor itself; positioning that would let content cover the editor (`position: fixed` and friends) is removed.

</details>

## 🔀 Release channels

| Channel | Versions | How to get it |
| --- | --- | --- |
| **Stable** | `0.2.x`, `0.4.x`, … (even minor) | Default |
| **Pre-release** | `0.3.x`, `0.5.x`, … (odd minor) | Extensions view → Onmark → **Switch to Pre-Release Version** |

Every change on `develop` ships as a pre-release first. See the [releases](https://github.com/axbhr/onmark/releases) for the changelog.

## 🤝 Contributing

Bug reports, ideas and pull requests are welcome! Read the [contributing guide](CONTRIBUTING.md) to get started and the [architecture notes](docs/architecture.md) for how Onmark works inside. Please report security issues privately as described in [SECURITY.md](SECURITY.md).

## 📄 License

Onmark is free software, licensed under the [GNU General Public License v3.0 or later](LICENSE). You may use, study, share and improve it; distributed modifications must stay open source under the same license.

Third-party components are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## 💛 Acknowledgements

- [CodeMirror](https://codemirror.net) and [Lezer](https://lezer.codemirror.net) by Marijn Haverbeke, the editor and parser underneath
- [Codicons](https://github.com/microsoft/vscode-codicons) by Microsoft, the icons
- [Obsidian](https://obsidian.md), for showing how pleasant live preview editing can be
