# Projektanweisung: training-app

App-artige Webseite (PWA auf GitHub Pages), die Trainingspläne anzeigt.
**Dieses Repository ist öffentlich** und enthält nur App, Übungsbibliothek und
Testdaten. Die **Pläne echter Personen liegen je in einem privaten Repo**
`plan-<id>`; die App liest sie mit dem persönlichen Schlüssel (fine-grained
Token) über die GitHub-API. Private Daten (Profile, Logs) und der Coach-Skill
liegen in `training-daten` (lokal `../training-daten`).

## Datenschutz – gilt für jede Änderung
- Nur Trainingsinhalte. Keine echten Namen (nur Anzeigenamen), kein Gewicht,
  keine Ruhe-HF, keine Beschwerden, kein Feedback-Freitext.
- Keine Tracking-, Analyse- oder Drittanbieter-Dienste, die Besuchsdaten erheben.

## Aufbau

| Pfad | Zweck |
|---|---|
| `index.html`, `app.js`, `quelle.js` | die App: Ansichten bzw. Daten und GitHub-Zugriff |
| `stil.css`, `farben.css` | Gestaltung; **Farbwerte ausschließlich in `farben.css`** |
| `sw.js`, `manifest.webmanifest`, `icon*` | PWA: Oberfläche gecacht, Icon, Vollbild |
| `plaene/uebungen.json` | Übungsbibliothek, alle Pläne verweisen per ID |
| `plaene/athleten.json`, `plaene/demo/` | Testdaten zum Entwickeln (inkl. `status.json`) |
| `docs/datenformat.md` | **verbindliches Datenformat** – vor Arbeit an Daten oder Anzeige lesen |
| `tools/pruefen.py` | Prüfskript; Original im Coach-Skill, beide synchron halten |
| `entwuerfe/` | Archiv: Design-Entwurf A mit simulierten Zuständen (`?sim=…`); maßgeblich ist die App im Wurzelverzeichnis |
| `.github/workflows/auto-merge-claude.yml` | übernimmt `claude/**`-Branches nach `main`, wenn nur `plaene/**` geändert und Prüfung ok |

Plan-Repos (privat, aus der Vorlage `plan-vorlage`): `athlet.json`,
`aktuell.json`, `index.json`, `wochen/`, `status.json` (schreibt **nur die
App**) sowie die Actions „Plan prüfen“ und „Auto-Merge“.

Vor jedem Commit mit Änderungen an Plandaten:
```bash
python3 tools/pruefen.py plaene                                              # Testdaten
python3 tools/pruefen.py --plan ../plan-<id> --uebungen plaene/uebungen.json  # Plan-Repo
```

## Anforderungen an die Webseite (entschieden)
- PWA: über Safari „Zum Home-Bildschirm“ installierbar, Vollbild, eigenes Icon/Name.
- Oberfläche gecacht (sofortiger Start), **Plandaten immer frisch** laden;
  Cache nur als Offline-Fallback. Stand des Plans und letztes Laden im Tab
  „Block“; Aktualisieren durch **Herunterziehen** am oberen Rand.
- **Eine Adresse für alle.** Welcher Plan erscheint, bestimmt der Schlüssel auf
  dem Gerät, nicht die Adresse. Gilt ein Schlüssel für mehrere Pläne
  (Coach-Sicht), erscheint oben der Umschalter; letzte Auswahl wird gemerkt.
  Optional später Paar-Ansicht (zwei Wochen nebeneinander).
- **Status melden:** Einheiten in der App als erledigt / teilweise /
  ausgelassen markieren (nur in der Einheit-Ansicht, erst ab dem geplanten
  Tag). Meldungen laufen über eine Warteschlange und landen in `status.json`
  des Plan-Repos; ohne Verbindung werden sie vorgemerkt.
- **Zugang:** Schlüssel nur im Gerätespeicher, Einrichtung in der
  Home-Bildschirm-App (Safari und App speichern getrennt). Kein Freitext, keine
  Fremdskripte, Content-Security-Policy erlaubt nur eigene Dateien und
  `api.github.com`.
- Wochen laufen Montag–Sonntag; erste/letzte Woche eines Blocks kann kürzer sein.
- Intensitäten werden mit Zone und absoluten Werten (bpm, Watt, Pace) angezeigt.
- Mobility & Core ist in jeder Woche enthalten; Übungen mit Bewegungsablauf aus der Bibliothek anzeigen.
- Nur statische Dateien (kein Build-Server nötig), Webseite im Wurzelverzeichnis.

Ideensammlung (nicht entschieden): „Heute“-Karte zuerst, Intervalle als
Blockdiagramm, Saison-Zeitstrahl, Form-Kurve, Mobility-Raster à la
GitHub-Contributions, Ernährungshinweis pro Tag. Später: Push-Benachrichtigungen.

## Stand (2026-09-16)
- Fundament fertig (Datenformat v1 inkl. `athlet.json` und `status.json`,
  Übungsbibliothek, Demo-Daten, Prüfskript mit Plan-Repo-Modus).
- **Modell Profile getrennt:** privates Repo pro Person, Token pro Repo,
  eine Adresse für alle. Getestet: Lesen, Schreiben, Konflikt (409),
  fremdes Repo bleibt verborgen, iOS trennt Safari und Home-Bildschirm-App.
- `plan-vorlage` (Vorlage mit Wächter- und Auto-Merge-Action) und `plan-test`
  (Testperson) angelegt; beide Actions in `plan-test` erprobt.
- **Finale App liegt im Wurzelverzeichnis** (PWA, Zugang, Status melden,
  Herunterziehen zum Aktualisieren), Design aus Entwurf A.
- Coach-Skill 2.0.0: Abläufe Zugang, Wochen-Check, Onboarding, Handbetrieb.
- **GitHub Pages läuft auf `main`:** https://davidfuchs1.github.io/training-app/
  – auf dem iPhone (iOS 27) getestet: Einrichtung, Status melden, Symbol.
- **iOS-Erkenntnisse (nicht zurückbauen):** Statusleiste `default` statt
  `black-translucent` (sonst Liquid-Glass-Unschärfe über dem Inhalt; Änderung
  wirkt erst nach Neuinstallation); oben eine deckende, haftende `.oberkante`
  (ohne Transparenz/Weichzeichner), Verlauf darunter nur beim Scrollen;
  Tab-Leiste als schwebende Kapsel; keine `position: fixed; top: 0`-Flächen.
- Übungsbibliothek: 78 Übungen (inkl. Studio-Alternativen, Aufwärmen, Lauf-ABC).
- `plan-david` angelegt (Skiblock 2026, Woche 1–2 ausgearbeitet).
- **Offen:** Coach-Token neu erzeugen und um `plan-david` erweitern; eigener
  iPhone-Token nur für `plan-david` (Projektinhaber, vor 2026-10-07).
- Später: Tablet-Layout (Media Queries), Push-Benachrichtigungen.

## Arbeitsweise
- Plan-Modus: Plan zeigen, Freigabe abwarten, unterwegs kurz erklären –
  der Projektinhaber will das Projekt verstehen, nicht nur fertig haben.
- Bei Widersprüchen oder fehlenden Informationen fragen statt annehmen.
- Sprache: Deutsch.
