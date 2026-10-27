---
title: Onmark Showcase
tags: [demo, markdown]
aliases:
  - Examples
  - Showcase
status: "work in progress"
---

# Onmark Showcase

This file contains an example of every supported element.
Markdown syntax only appears where your cursor is: inline syntax when the cursor touches the element, block syntax on the cursor line, large blocks while the cursor is inside them.

## Headings

# H1 with closing hashes ##
## H2
### H3
#### H4
##### H5
###### H6

## Formatting

Text with **bold**, *italic*, ***bold italic***, ~~strikethrough~~, ==highlight== and `inline code`.

Also _underscores_ and __double underscores__, and **bold with `code` and *italic* inside**.

Shortcuts: select text and press `Ctrl+B` or `Ctrl+I`.

## Links

`Ctrl+Click` opens a link, `Ctrl+Alt+Click` opens it to the side.

- External: [VS Code](https://code.visualstudio.com)
- Relative note (opens in Onmark): [CRLF file](./crlf.md)
- Other file (opens in the default editor): [package manifest](../package.json)
- Missing file (shows a warning): [does not exist](./missing.md)
- Autolink: <https://github.com> and a bare URL https://code.visualstudio.com

## Quotes

> A quote with **formatting**
> over two lines.
>
> > A nested quote.

## Lists

- Item one
- Item two with a very long text that wraps, so you can see that the continuation line starts under the text and not under the bullet.
  - indented
    - indented twice
* Star
+ Plus

1. First
2. Second
   1. Sub item

- [ ] open task (click the checkbox)
- [x] done task
  - [ ] nested task
1. [ ] numbered task

## Horizontal rule

---

***

## Code blocks

Syntax highlighting in the colors of the active VS Code theme, language label and copy button:

```ts
interface Note {
  title: string;
  tags?: string[];
}

export function slug(note: Note): string {
	// tab indentation must be preserved
	return note.title.toLowerCase().replace(/\s+/g, '-');
}
```

```python
def fib(n: int) -> int:
    """Recursive, just for the demo."""
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

```json
{ "name": "onmark", "private": true, "version": 1 }
```

```
No language: no highlighting.
```

## Images

Local (relative), with width `|240`:

![Diagram|240](assets/diagram.svg)

Over https:

![VS Code logo|64](https://code.visualstudio.com/assets/favicon.ico)

Missing image: ![not there](assets/missing.png)

Subfolder example: [notes/subfolder.md](notes/subfolder.md)

## Tables

| Element | Rendering | Alignment |
| :------ | :-------: | --------: |
| **bold** | `code` | right |
| [link](https://code.visualstudio.com) | ==highlight== | 42 |
| empty → | | 3.14 |

Without outer pipes:

Name | Value
--- | ---
a | 1
b | 2

## Callouts

> [!note]
> A note without its own title.

> [!tip] Tip with a title
> Content with **formatting** and a [link](https://code.visualstudio.com).

> [!info]+ Foldable, open by default
> Click the arrow to fold.

> [!warning]- Folded
> This text only shows after unfolding.

> [!abstract] Summary
> abstract, summary, tldr

> [!todo] Todo
> - [ ] a task inside a callout

> [!success] Success

> [!question] Question?

> [!failure] Failure

> [!danger] Danger

> [!bug] Bug

> [!example] Example

> [!quote] Quote
> — Someone famous

## Unicode

Umlauts äöü ß, emoji 🎉 and 漢字. Positions must be correct here too.
