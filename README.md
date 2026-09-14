# training-app

Trainingspläne als App-artige Webseite (GitHub Pages, PWA).

Dieses Repository ist **öffentlich** und enthält ausschließlich Trainingsinhalte:
keine Gesundheitsdaten, keine echten Namen.

## Aufbau

| Pfad | Zweck |
|---|---|
| `plaene/athleten.json` | Liste der Pläne (Anzeigenamen) |
| `plaene/uebungen.json` | Übungsbibliothek mit IDs und Bewegungsablauf |
| `plaene/<athlet>/aktuell.json` | laufende und nächste Woche |
| `plaene/<athlet>/index.json` | Kennzahlen aller Wochen |
| `plaene/<athlet>/wochen/` | abgeschlossene Wochen |
| `tools/pruefen.py` | prüft alle Plandateien auf Format und Regeln |

Das Datenformat ist in [`docs/datenformat.md`](docs/datenformat.md) beschrieben.

## Prüfen

```bash
python3 tools/pruefen.py plaene
```

Die Webseite selbst folgt in einem späteren Schritt.
