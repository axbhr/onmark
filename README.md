# Obsidianate

Obsidian-artige Live Preview für Markdown in VS Code. `.md`-Dateien öffnen sich in einem Editor, in dem Schreiben und Rendern auf derselben Fläche passieren. Die Datei auf der Platte bleibt reines Markdown.

> **Stand: Phase 2** – Inline Live Preview: Überschriften, Formatierung, Links, Zitate, Listen, Aufgaben und Linien werden direkt im Editor gerendert. Blöcke (Code, Tabellen, Bilder, Callouts, Frontmatter) folgen in Phase 3.

## Entwicklung

```bash
npm install
npm run build      # dist/extension.js, dist/webview.js, dist/webview.css
npm run watch      # Rebuild bei Änderungen
npm run typecheck
npm test
npm run sample:large   # erzeugt samples/large.md (5.000+ Zeilen) für Performance-Tests
```

**Debuggen:** `F5` („Run Extension“) baut und startet einen Extension Development Host mit dem Ordner `samples/`.

## Bedienung

- `.md`-Dateien öffnen sich standardmäßig in Obsidianate.
- Zum Rohtext wechseln: Button in der Titelleiste, Command **„Obsidianate: Als Quelltext öffnen“** oder „Reopen With… → Text Editor“.
- Zurück: Button in der Titelleiste des Text-Editors oder **„Obsidianate: In Live Preview öffnen“**.

### Live Preview

| Element | Darstellung | Syntax sichtbar, wenn … |
| --- | --- | --- |
| Überschriften `#`–`######` | Schriftgröße je Ebene | Cursor auf der Zeile |
| `**fett**`, `*kursiv*`, `~~durch~~`, `==markiert==`, `` `Code` `` | formatiert | Cursor/Selektion berührt das Element |
| `[Text](ziel)`, `<https://…>`, nackte URLs | Link | Cursor/Selektion berührt den Link |
| `>` Zitat | linker Balken | Cursor auf der Zeile |
| `-` / `*` / `+` Liste | „•“, hängende Einrückung | Cursor auf der Zeile |
| `- [ ]` / `- [x]` Aufgabe | klickbare Checkbox (ändert den Quelltext) | Cursor auf der Zeile |
| `---` Linie | Trennlinie | Cursor auf der Zeile |

Ausgeblendete Syntax ist atomar: Der Cursor landet nie in unsichtbaren Zeichen.

**Links öffnen:** `Strg+Klick` (macOS `Cmd+Klick`) öffnet einen Link, mit zusätzlich `Alt` öffnet er sich daneben.
- `http`, `https` und `mailto` öffnen sich extern. Andere Schemes wie `command:` werden aus Sicherheitsgründen ignoriert.
- Relative `.md`-Dateien öffnen sich in Obsidianate, andere Dateien im Standard-Editor.
- Pfade mit `/` am Anfang gelten relativ zum Workspace-Ordner.

### Einstellungen

| Setting | Default | Bedeutung |
| --- | --- | --- |
| `obsidianate.fontFamily` | `""` | Schrift für Fließtext; leer = VS-Code-Oberflächenschrift |
| `obsidianate.fontSize` | `16` | Schriftgröße in px |
| `obsidianate.readableLineLength` | `true` | Inhalt zentrieren und begrenzen |
| `obsidianate.maxWidth` | `750` | Maximale Breite in px |

Änderungen an den Einstellungen wirken beim nächsten Öffnen des Editors (Live-Aktualisierung kommt mit `settingsChanged` in Phase 4).

## Architektur

- **Custom Text Editor** (`obsidianate.editor`): `vscode.TextDocument` ist die einzige Quelle der Wahrheit. Speichern, Dirty-State, Git-Diff und Hot Exit übernimmt VS Code.
- **Webview mit CodeMirror 6.** Strikte CSP mit Nonce, `retainContextWhenHidden: false`. Cursor und Scrollposition werden per `setState` gesichert.
- **Protokoll** (`src/shared/protocol.ts`): Positionen werden als Zeile/Spalte übertragen, nie als Offsets (CRLF ≠ LF). Texte an das Webview sind immer LF-normalisiert, der Host schreibt mit dem EOL der Datei.
- **Echo-Schutz:** Im Webview tragen Host-Änderungen die Annotation `remoteUpdate` und werden nicht zurückgesendet. Im Host (`src/editor/sync.ts`) spiegelt ein Schatten-Text den Stand des Webviews. Dokumentänderungen, die diesem Stand entsprechen, lösen kein `externalUpdate` aus.
- **Veraltete Edits:** Jeder `edit` trägt die Version des letzten `init`/`externalUpdate`. Hat der Host seitdem ein neueres Update gesendet, verwirft er den Edit. Das Update überschreibt das Webview ohnehin, damit laufen beide Seiten wieder zusammen.
- **`externalUpdate`** wird im Webview als minimaler Diff (gemeinsames Präfix/Suffix) und ohne History-Eintrag angewendet. Cursor und Scrollposition bleiben erhalten.

### Theme

Obsidianate folgt immer dem aktiven VS-Code-Theme, auch beim Wechsel im laufenden Betrieb:

- **Oberfläche und gerendertes Markdown** nutzen nur Workbench-Farbvariablen (`--vscode-*`): Hintergrund, Text, Links, Auswahl, Cursor, Suche, Zitate, Trennlinien, Inline-Code und High-Contrast-Rahmen. Das gerenderte Markdown sieht damit aus wie die eingebaute Markdown-Vorschau.
- **Syntax-Farben in Code** (Token-Farben) bekommt ein Webview von VS Code nicht. Der Host (`src/theme/`) liest deshalb die Theme-Datei der Extension, die das aktive Theme liefert. Er folgt dabei `include`, wendet `editor.tokenColorCustomizations` an und schickt die aufgelösten Farben als `tokenTheme` ans Webview. Die Nachricht kommt bei jedem Theme-Wechsel, bei Änderungen an `editor.tokenColorCustomizations` und wenn Extensions installiert oder entfernt werden.
- **Remote (WSL, SSH, Container):** Theme-Extensions laufen auf der UI-Seite und sind für einen Remote-Extension-Host unsichtbar. Deshalb steht in `package.json` `extensionKind: ["ui", "workspace"]`: Die installierte Extension läuft lokal und sieht alle Themes, Workspace-Dateien erreicht sie über die VS-Code-API. Ist die Theme-Datei trotzdem nicht lesbar, greift ein Fallback auf Theme-Variablen (`symbolIcon-*`, `debugTokenExpression-*`).
- **F5 aus einem WSL-Fenster:** Die Entwicklungs-Extension läuft im Remote-Host und nutzt daher den Fallback. Die exakten Token-Farben siehst du beim Debuggen aus einem lokalen Fenster oder mit der installierten `.vsix`.

### Tastenkürzel im Webview

VS Code leitet jeden Tastendruck, der im Webview bis zum `window` durchkommt, an seine eigenen Keybindings weiter. Damit nichts doppelt ausgelöst wird, gilt:

- Tasten, die CodeMirror selbst verarbeitet, werden nicht an VS Code weitergereicht. Daraus ergeben sich diese bewussten Abweichungen von den VS-Code-Keybindings, solange der Live-Preview-Editor den Fokus hat:

| Taste | In Obsidianate | In VS Code sonst |
| --- | --- | --- |
| `Strg+B` | fett ein/aus | Seitenleiste ein-/ausblenden |
| `Strg+I` | kursiv ein/aus | Inline Chat / Vorschläge auslösen |
| `Strg+F` | Suche von CodeMirror | Suchen-Widget |
| `Strg+D` | nächstes Vorkommen auswählen | gleich |
| `Strg+Shift+K` | Zeile löschen | gleich |
| `Alt+↑/↓` | Zeile verschieben | gleich |

- `Strg+Z` / `Strg+Y` / `Strg+Shift+Z` gehen immer nur an die Undo-History von CodeMirror. Undo in einem parallel geöffneten Text-Editor arbeitet auf dem Dokument und kommt per `externalUpdate` an.
- Alles andere (`Strg+S`, `Strg+P`, `Strg+Shift+P`, …) behandelt VS Code wie gewohnt.

### Umbenennen

Display-Name, Extension-ID und alle Command-, View- und Setting-IDs stehen ausschließlich in `package.json`. Der Code liest die ID daraus (`src/shared/meta.ts`).

### Abhängigkeiten

Zusätzlich zu den vorgegebenen CodeMirror-Paketen kommen zwei transitive Abhängigkeiten von `@codemirror/language` dazu. Sie werden direkt importiert und stehen deshalb explizit in `package.json`:
- `@lezer/highlight` liefert die `tags` für Highlight-Styles und die `==Highlight==`-Extension.
- `@lezer/common` liefert den Typ `SyntaxNode` für die Decoration-Handler.

Neu im Host:
- `jsonc-parser` (Microsoft) liest Theme-Dateien. Die sind JSONC, also mit Kommentaren und Trailing Commas, und `JSON.parse` scheitert daran. Alle Pakete werden gebündelt und stehen deshalb in den `devDependencies`.

### Code-Struktur der Live Preview

- `webview/livepreview/inline.ts` enthält das ViewPlugin. Es läuft über den Lezer-Baum der sichtbaren Bereiche und ruft pro Knotentyp einen Handler auf, außerdem liefert es die atomaren Bereiche.
- Pro Decoration-Gruppe gibt es eine Datei mit Handlern und Styles: `headings.ts`, `formatting.ts`, `links.ts`, `quotes.ts`, `lists.ts`, `rules.ts`.
- `widgets/` enthält ein Widget pro Datei, `extensions/highlight.ts` die Lezer-Extension für `==…==`.
- `commands.ts` enthält `Strg+B`/`Strg+I`.

## Testen von Phase 2

1. `F5` → `samples/showcase.md`: Außerhalb des Cursors sieht alles wie gerendertes Markdown aus.
2. Cursor in `**fett**` setzen → `**` erscheint, Cursor raus → verschwindet. Auf eine Überschriftenzeile wechseln → `## ` erscheint.
3. Mit den Pfeiltasten durch Listen und Links laufen: Der Cursor landet nie in unsichtbaren Zeichen.
4. Checkbox anklicken → `[ ]` ↔ `[x]` im Quelltext, im parallel geöffneten Text-Editor sichtbar.
5. `Strg+Klick` auf die Links im Abschnitt „Links“ (extern, `.md`, andere Datei, fehlende Datei).
6. Wort markieren, `Strg+B` / `Strg+I`.
7. `npm run sample:large`, dann `samples/large.md` öffnen → Tippen und Scrollen bleiben flüssig.

## Testen von Phase 1

1. `F5` → `samples/showcase.md` öffnen.
2. Tippen → Tab wird dirty, `Strg+S` speichert.
3. „Als Quelltext öffnen“ im Split (`Strg+\` und dann „Reopen With… → Text Editor“) → in beiden Editoren tippen, Änderungen erscheinen jeweils im anderen.
4. Datei extern ändern (z. B. `git checkout -- samples/showcase.md`) → Webview aktualisiert sich.
5. `samples/crlf.md` bearbeiten und speichern → `file samples/crlf.md` meldet weiterhin CRLF.
6. `Strg+Z`, `Strg+F` → genau eine Aktion.
7. Farbschema wechseln (`Strg+K Strg+T`) → Editor passt sich sofort an.
