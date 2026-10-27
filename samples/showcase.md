---
title: Obsidianate Showcase
tags: [demo, markdown]
aliases:
  - Beispiele
  - Showcase
status: "in Arbeit"
---

# Obsidianate Showcase

Diese Datei enthält ein Beispiel für jedes unterstützte Element.
**Phase 3:** Blöcke – Codeblöcke, Bilder, Tabellen, Callouts und Frontmatter („Eigenschaften“ oben) werden gerendert. Steht der Cursor im Block, erscheint der Rohtext.

## Überschriften

# H1 mit schließenden Rauten ##
## H2
### H3
#### H4
##### H5
###### H6

## Formatierung

Text mit **fett**, *kursiv*, ***fett und kursiv***, ~~durchgestrichen~~, ==hervorgehoben== und `Inline-Code`.

Auch _Unterstriche_ und __doppelte Unterstriche__ sowie **fett mit `Code` und *kursiv* darin**.

Shortcuts: Text markieren und `Strg+B` bzw. `Strg+I` drücken.

## Links

`Strg+Klick` öffnet einen Link, `Strg+Alt+Klick` öffnet ihn daneben.

- Extern: [VS Code](https://code.visualstudio.com)
- Relative Notiz (Live Preview): [CRLF-Datei](./crlf.md)
- Andere Datei (Standard-Editor): [Paketdefinition](../package.json)
- Fehlende Datei (Warnung): [gibt es nicht](./fehlt.md)
- Autolink: <https://github.com> und nackte URL https://obsidian.md

## Zitate

> Ein Zitat mit **Formatierung**
> über zwei Zeilen.
>
> > Verschachteltes Zitat.

## Listen

- Punkt eins
- Punkt zwei mit einem sehr langen Text, der umbricht, damit man sieht, dass die Folgezeile sauber unter dem Text und nicht unter dem Aufzählungszeichen beginnt.
  - eingerückt
    - doppelt eingerückt
* Stern
+ Plus

1. Erstens
2. Zweitens
   1. Unterpunkt

- [ ] offene Aufgabe (Checkbox anklicken)
- [x] erledigte Aufgabe
  - [ ] verschachtelte Aufgabe
1. [ ] nummerierte Aufgabe

## Horizontale Linie

---

***

## Codeblöcke

Syntax-Highlighting in den Farben des aktiven VS-Code-Themes, Sprachlabel und Kopier-Button:

```ts
interface Note {
  title: string;
  tags?: string[];
}

export function slug(note: Note): string {
	// Tab-Einrückung muss erhalten bleiben
	return note.title.toLowerCase().replace(/\s+/g, '-');
}
```

```python
def fib(n: int) -> int:
    """Rekursiv, nur zur Demo."""
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

```json
{ "name": "obsidianate", "private": true, "version": 1 }
```

```
Ohne Sprache: kein Highlighting.
```

## Bilder

Lokal (relativ), mit Breite `|240`:

![Diagramm|240](assets/diagramm.svg)

Per https:

![VS Code Logo|64](https://code.visualstudio.com/assets/favicon.ico)

Fehlendes Bild: ![nicht da](assets/fehlt.png)

Unterordner-Beispiel: [notizen/unterordner.md](notizen/unterordner.md)

## Tabellen

| Element | Darstellung | Ausrichtung |
| :------ | :---------: | ----------: |
| **fett** | `Code` | rechts |
| [Link](https://obsidian.md) | ==markiert== | 42 |
| leer → | | 3,14 |

Ohne äußere Pipes:

Name | Wert
--- | ---
a | 1
b | 2

## Callouts

> [!note]
> Ein Hinweis ohne eigenen Titel.

> [!tip] Tipp mit Titel
> Inhalt mit **Formatierung** und einem [Link](https://code.visualstudio.com).

> [!info]+ Einklappbar, standardmäßig offen
> Pfeil anklicken zum Einklappen.

> [!warning]- Eingeklappt
> Dieser Text ist erst nach dem Aufklappen sichtbar.

> [!abstract] Zusammenfassung
> abstract, summary, tldr

> [!todo] Todo
> - [ ] Aufgabe im Callout

> [!success] Erfolg

> [!question] Frage?

> [!failure] Fehlschlag

> [!danger] Gefahr

> [!bug] Bug

> [!example] Beispiel

> [!quote] Zitat
> — Jemand Berühmtes

## Unicode

Umlaute äöü ß, Emoji 🎉 und 漢字 – Positionen müssen auch hier stimmen.
