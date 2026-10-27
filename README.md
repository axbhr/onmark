# Obsidianate

Obsidian-artige Live Preview für Markdown in VS Code. `.md`-Dateien öffnen sich in einem Editor, in dem Schreiben und Rendern auf derselben Fläche passieren. Die Datei auf der Platte bleibt reines Markdown.

> **Stand: Phase 1** – Grundgerüst und bidirektionaler Sync. Der Editor zeigt Markdown mit Syntax-Highlighting, die Live Preview folgt in Phase 2.

## Entwicklung

```bash
npm install
npm run build      # dist/extension.js, dist/webview.js, dist/webview.css
npm run watch      # Rebuild bei Änderungen
npm run typecheck
npm test
```

**Debuggen:** `F5` („Run Extension“) baut und startet einen Extension Development Host mit dem Ordner `samples/`.

## Bedienung

- `.md`-Dateien öffnen sich standardmäßig in Obsidianate.
- Zum Rohtext wechseln: Button in der Titelleiste, Command **„Obsidianate: Als Quelltext öffnen“** oder „Reopen With… → Text Editor“.
- Zurück: Button in der Titelleiste des Text-Editors oder **„Obsidianate: In Live Preview öffnen“**.

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

### Tastenkürzel im Webview

VS Code leitet jeden Tastendruck, der im Webview bis zum `window` durchkommt, an seine eigenen Keybindings weiter. Damit nichts doppelt ausgelöst wird, gilt:

- Tasten, die CodeMirror selbst verarbeitet (z. B. `Strg+F` Suche, `Strg+D`, Pfeiltasten), werden nicht an VS Code weitergereicht.
- `Strg+Z` / `Strg+Y` / `Strg+Shift+Z` gehen immer nur an die Undo-History von CodeMirror. Undo in einem parallel geöffneten Text-Editor arbeitet auf dem Dokument und kommt per `externalUpdate` an.
- Alles andere (`Strg+S`, `Strg+P`, `Strg+Shift+P`, …) behandelt VS Code wie gewohnt.

### Umbenennen

Display-Name, Extension-ID und alle Command-, View- und Setting-IDs stehen ausschließlich in `package.json`. Der Code liest die ID daraus (`src/shared/meta.ts`).

### Abhängigkeiten

Neben den vorgegebenen CodeMirror-Paketen wird `@lezer/highlight` genutzt, weil es die `tags` für die Highlight-Styles bereitstellt (transitive Abhängigkeit von `@codemirror/language`, wird aber direkt importiert). Alle Pakete werden gebündelt und stehen deshalb in den `devDependencies`.

## Testen von Phase 1

1. `F5` → `samples/showcase.md` öffnen.
2. Tippen → Tab wird dirty, `Strg+S` speichert.
3. „Als Quelltext öffnen“ im Split (`Strg+\` und dann „Reopen With… → Text Editor“) → in beiden Editoren tippen, Änderungen erscheinen jeweils im anderen.
4. Datei extern ändern (z. B. `git checkout -- samples/showcase.md`) → Webview aktualisiert sich.
5. `samples/crlf.md` bearbeiten und speichern → `file samples/crlf.md` meldet weiterhin CRLF.
6. `Strg+Z`, `Strg+F` → genau eine Aktion.
7. Farbschema wechseln (`Strg+K Strg+T`) → Editor passt sich sofort an.
