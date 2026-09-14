# Projektanweisung: training-app

App-artige Webseite (PWA auf GitHub Pages), die Trainingspläne anzeigt.
**Dieses Repository ist öffentlich.** Private Daten (Profile, Logs) und der
Coach-Skill liegen in einem separaten privaten Repository (`training-daten`,
lokal im Nachbarordner `../training-daten`).

## Datenschutz – gilt für jede Änderung
- Nur Trainingsinhalte. Keine echten Namen (nur Anzeigenamen), kein Gewicht,
  keine Ruhe-HF, keine Beschwerden, kein Feedback-Freitext.
- Keine Tracking-, Analyse- oder Drittanbieter-Dienste, die Besuchsdaten erheben.

## Aufbau

| Pfad | Zweck |
|---|---|
| `plaene/athleten.json` | Liste der Pläne (id, Anzeigename, `testdaten`) |
| `plaene/uebungen.json` | Übungsbibliothek, Pläne verweisen per ID |
| `plaene/<id>/aktuell.json` | laufende + nächste Woche, Block, Zonen |
| `plaene/<id>/index.json` | Kennzahlen aller Wochen |
| `plaene/<id>/wochen/` | abgeschlossene Wochen |
| `plaene/demo/` | Testdaten zum Entwickeln |
| `docs/datenformat.md` | **verbindliches Datenformat** – vor Arbeit an Daten oder Anzeige lesen |
| `tools/pruefen.py` | Prüfskript; Original im Coach-Skill, beide synchron halten |
| `.github/workflows/auto-merge-claude.yml` | übernimmt `claude/**`-Branches nach `main`, wenn nur `plaene/**` geändert und Prüfung ok |

Vor jedem Commit mit Änderungen in `plaene/`:
```bash
python3 tools/pruefen.py plaene
```

## Anforderungen an die Webseite (entschieden)
- PWA: über Safari „Zum Home-Bildschirm“ installierbar, Vollbild, eigenes Icon/Name.
- Oberfläche gecacht (sofortiger Start), **Plandaten immer frisch** laden;
  Cache nur als Offline-Fallback. Sichtbares „Zuletzt aktualisiert“ + Neu-Laden-Button.
- **Eine Adresse pro Person:** `/plan/<id>`; zusätzlich Umschalter für die
  Coach-Sicht, letzte Auswahl im Browser merken. Optional Paar-Ansicht (zwei Wochen nebeneinander).
- Wochen laufen Montag–Sonntag; erste/letzte Woche eines Blocks kann kürzer sein.
- Intensitäten werden mit Zone und absoluten Werten (bpm, Watt, Pace) angezeigt.
- Mobility & Core ist in jeder Woche enthalten; Übungen mit Bewegungsablauf aus der Bibliothek anzeigen.
- Nur statische Dateien (kein Build-Server nötig), Webseite im Wurzelverzeichnis.

Ideensammlung (nicht entschieden): „Heute“-Karte zuerst, Intervalle als
Blockdiagramm, Saison-Zeitstrahl, Form-Kurve, Mobility-Raster à la
GitHub-Contributions, Ernährungshinweis pro Tag. Später: Push-Benachrichtigungen.

## Stand
- Fundament fertig (Datenformat v1, Übungsbibliothek, Demo-Daten, Auto-Merge-Action).
- GitHub Pages ist noch **nicht** eingeschaltet.
- **Nächster Schritt:** zwei deutlich unterschiedliche, anklickbare Design-Entwürfe
  mit den Demo-Daten, auf dem Handy testen, dann auswählen oder kombinieren.
- Offen: prüfen, ob GitHub Pages neu baut, wenn die Action nach `main` pusht.

## Arbeitsweise
- Plan-Modus: Plan zeigen, Freigabe abwarten, unterwegs kurz erklären –
  der Projektinhaber will das Projekt verstehen, nicht nur fertig haben.
- Bei Widersprüchen oder fehlenden Informationen fragen statt annehmen.
- Sprache: Deutsch.
