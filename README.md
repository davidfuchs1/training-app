# training-app

Trainingspläne als App-artige Webseite (GitHub Pages, PWA).

Dieses Repository ist **öffentlich** und enthält die App, die Übungsbibliothek
und Testdaten – **keine Pläne echter Personen**. Diese liegen je in einem
privaten Repo `plan-<id>`; die App liest sie über die GitHub-API mit einem
persönlichen Schlüssel, der nur auf dem Gerät der Person gespeichert ist.

## Aufbau

| Pfad | Zweck |
|---|---|
| `index.html`, `app.js`, `quelle.js` | App: Ansichten sowie Daten und GitHub-Zugriff |
| `stil.css`, `farben.css` | Gestaltung, Farbwerte nur in `farben.css` |
| `sw.js`, `manifest.webmanifest` | PWA: Oberfläche gecacht, Vollbild, Icon |
| `plaene/uebungen.json` | Übungsbibliothek mit IDs und Bewegungsablauf |
| `plaene/demo/` | Testdaten (ohne Schlüssel ansehbar) |
| `tools/pruefen.py` | prüft Plandateien auf Format und Regeln |

Das Datenformat ist in [`docs/datenformat.md`](docs/datenformat.md) beschrieben.

## Prüfen

```bash
python3 tools/pruefen.py plaene                                              # Testdaten
python3 tools/pruefen.py --plan ../plan-<id> --uebungen plaene/uebungen.json  # Plan-Repo
```

## Lokal ansehen

```bash
python3 -m http.server 8000
```

Dann <http://127.0.0.1:8000/?demo=1> öffnen (Demo, ohne Schlüssel).
