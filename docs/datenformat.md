# Datenformat (format_version 1)

Verbindlich für alle Plandateien (öffentliche Testdaten und private Plan-Repos). Geprüft durch
`tools/pruefen.py` (Original im Coach-Skill: `scripts/pruefen.py`).
Gültige Beispiele: `plaene/demo/` und die Beispiele im Coach-Skill.

## Grundregeln

- Kodierung UTF-8, JSON mit 2 Leerzeichen Einrückung.
- Jede Datei hat `"format_version": 1` auf oberster Ebene.
- Datum: `JJJJ-MM-TT`. Zeitpunkt: ISO 8601 mit Zeitzone als `+hh:mm`, ohne
  Millisekunden, nicht `Z` (`2026-10-05T19:30:00+02:00`). Woche: ISO-Woche `JJJJ-Www` (`2026-W41`),
  **Montag–Sonntag**.
- IDs: Kleinbuchstaben, Ziffern, Bindestriche (`core-dead-bug`).
- Bereiche: zweielementige Liste `[von, bis]`; `null` für offene Enden.
  - `hf` (bpm) und `leistung_w` (Watt), `trittfrequenz` (U/min): Zahlen, von ≤ bis
  - `pace` (min/km bzw. min/100 m): Texte `m:ss`, **schneller Wert zuerst**
- **Datenschutz:** keine persönlichen Angaben (Name, Gewicht, Ruhe-HF,
  Beschwerden, Feedback-Text …). Das Prüfskript sperrt entsprechende Schlüssel.

## Verzeichnis

Pläne echter Personen liegen je in einem **privaten Plan-Repo**
`davidfuchs1/plan-<id>`; die App liest sie mit dem Schlüssel (Token) der
Person über die GitHub-API. Im öffentlichen Repo `training-app` liegen nur die
Übungsbibliothek und Testdaten.

```
training-app/plaene/          öffentlich
├── athleten.json             nur Testathleten (demo)
├── uebungen.json             Übungsbibliothek für alle Pläne
└── demo/                     gleicher Aufbau wie ein Plan-Repo, ohne athlet.json

plan-<id>/                    privat, ein Repo pro Person
├── athlet.json               id, Anzeigename, Sportarten
├── aktuell.json              laufende + nächste Woche      (schreibt der Coach)
├── index.json                Kennzahlen aller Wochen       (schreibt der Coach)
├── wochen/<JJJJ-Www>.json    abgeschlossene Wochen         (schreibt der Coach)
└── status.json               gemeldeter Status             (schreibt nur die App)
```

Eine Woche steht **entweder** in `aktuell.json` **oder** in `wochen/` –
nie in beiden.

Prüfen:
```bash
python3 tools/pruefen.py plaene                                          # Demo
python3 tools/pruefen.py --plan ../plan-<id> --uebungen plaene/uebungen.json  # Plan-Repo
```

---

## athleten.json

```json
{
  "format_version": 1,
  "athleten": [
    {"id": "demo", "anzeigename": "Demo", "sportarten": ["kraft", "rad", "laufen"], "testdaten": true}
  ]
}
```

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | ID | ja | = Ordnername = Adresse `/plan/<id>` |
| `anzeigename` | Text | ja | Spitzname, kein echter Name |
| `sportarten` | Liste Text | ja | für Filter/Anzeige |
| `testdaten` | bool | nein (false) | Testathlet, nicht coachen |

Jeder Athletenordner muss hier stehen und umgekehrt. Nur für `plaene/`
(Testdaten); echte Personen stehen nicht in dieser Liste.

---

## athlet.json (Plan-Repo)

```json
{
  "format_version": 1,
  "id": "david",
  "anzeigename": "david",
  "sportarten": ["kraft", "rad", "laufen"]
}
```

Felder wie ein Eintrag in `athleten.json` (`id`, `anzeigename`, `sportarten`,
optional `testdaten`). `athlet` in allen anderen Dateien des Repos muss `id`
entsprechen. Repo-Name: `plan-<id>`.

---

## uebungen.json

```json
{
  "format_version": 1,
  "uebungen": {
    "core-dead-bug": {
      "name": "Dead Bug",
      "kategorie": "core",
      "sportarten": ["alle"],
      "equipment": ["matte"],
      "zielmuskeln": ["tiefe Bauchmuskulatur"],
      "ablauf": ["Rückenlage, Arme senkrecht …", "…"],
      "hinweise": ["…"],
      "fehler": ["Hohlkreuz"],
      "standard": {"saetze": 2, "wdh": 8, "seitig": true},
      "leichter": null,
      "schwerer": "core-dead-bug-band"
    }
  }
}
```

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| Schlüssel | ID | ja | Präfix nach Kategorie empfohlen (`mob-`, `faszien-`, `core-`, `kraft-`, `plyo-`) |
| `name` | Text | ja | Anzeigename der Übung |
| `kategorie` | `mobility` `faszien` `core` `kraft` `plyometrie` `lauf-abc` `aufwaermen` | ja | andere → Warnung, siehe [Feste Listen](#feste-listen-und-neue-einträge) |
| `sportarten` | Liste Text | ja | `alle` oder z. B. `ski`, `laufen` |
| `equipment` | Liste Text | ja | leer = nur Körpergewicht; z. B. `matte`, `blackroll`, `band`, `treppe`, `wand`, `stuhl` |
| `zielmuskeln` | Liste Text | nein | |
| `ablauf` | Liste Text, ≥ 2 | ja | Bewegungsablauf Schritt für Schritt |
| `hinweise` | Liste Text | nein | Atmung, Fokus, Tempo |
| `fehler` | Liste Text | nein | typische Fehler |
| `standard` | Objekt | nein | Vorschlag: `saetze`, `wdh` oder `dauer_s`, `tempo`, `seitig` (bool) |
| `leichter` / `schwerer` | ID oder null | nein | Regression/Progression, muss existieren |

---

## Wochenobjekt

Gleiche Struktur in `aktuell.json` → `wochen[]` und in `wochen/<JJJJ-Www>.json`.

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `iso_woche` | `JJJJ-Www` | ja | muss zu `start` passen |
| `nr` | Zahl ≥ 1 | ja | Wochennummer im Block |
| `start`, `ende` | Datum | ja | innerhalb der ISO-Woche, start ≤ ende (Kurzwochen erlaubt) |
| `phase` | Text | ja | Name der Phase aus `block.phasen` |
| `typ` | `eingewoehnung` `grundlage` `aufbau` `entlastung` `peak` `taper` `wettkampf` `pause` | ja | Phasentyp; andere → Warnung |
| `fokus` | Text | ja | Ein Satz: worum geht es diese Woche |
| `notiz_coach` | Text | nein | Hinweis an die Person (kein Feedback-Zitat) |
| `einheiten` | Liste Einheit | ja | mind. 1 mit `pflicht: true` (außer `typ` `pause`) |
| `mobility` | Objekt | ja | siehe unten |
| `ernaehrung_hinweise` | Liste `{tag, text}` | nein | `tag` Datum – **nie null**; siehe [Ernährungshinweise](#ernährungshinweise) |

Archivdatei zusätzlich: `format_version`, `athlet`.

### Einheit

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | ID | ja | eindeutig in der Woche, z. B. `e1` |
| `pflicht` | bool | ja | |
| `sportart` | Text | ja | bekannt: `kraft` `laufen` `rad` `schwimmen` `koppel` `mobility` `core` `ski` `wandern` `sonstiges` (anderes → Warnung, siehe [Feste Listen](#feste-listen-und-neue-einträge)) |
| `titel` | Text | ja | kurz, z. B. „Kraft A – Beine exzentrisch“ |
| `tag_vorschlag` | Datum | ja | geplanter Tag innerhalb der Woche – **nie null**, auch bei optionalen Einheiten |
| `dauer_min` | Zahl | ja | Gesamtdauer |
| `ziel` | Text | ja | Zweck der Einheit |
| `bloecke` | Liste Block | * | Ablauf (Ausdauer) |
| `uebungen` | Liste Übungsverweis | * | (Kraft: Pflicht) |
| `alternativen` | Liste `{titel, beschreibung}` | nein | z. B. Studio-Variante, draußen statt Rolle |
| `status` | `geplant` `erledigt` `teilweise` `ausgelassen` | ja | |

\* mindestens eines von `bloecke`/`uebungen` nicht leer.

### Block

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `typ` | `aufwaermen` `haupt` `intervall` `technik` `cooldown` | ja | |
| `dauer_min` | Zahl | ja | bei `intervall`: Dauer **einer** Wiederholung |
| `zone` | `Z1`–`Z5` | nein | |
| `hf` | Bereich | nein | |
| `leistung_w` | Bereich | nein | |
| `pace` | Bereich | nein | |
| `trittfrequenz` | Bereich | nein | |
| `wiederholungen` | Zahl ≥ 1 | bei `intervall` | |
| `pause` | `{dauer_min, zone?, beschreibung?}` | bei `intervall` | Pause zwischen Wiederholungen |
| `beschreibung` | Text | nein | |

### Übungsverweis

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | ID | ja | muss in `uebungen.json` existieren |
| `saetze` | Zahl | nein (1) | |
| `wdh` | Zahl oder Text | eines von beiden | z. B. `12` oder `"8–10"` |
| `dauer_s` | Zahl | eines von beiden | Haltezeit/Dauer |
| `seitig` | bool | nein | Angabe gilt je Seite |
| `tempo` | Text | nein | `exz-halt-konz`, z. B. `3-1-1` |
| `pause_s` | Zahl | nein | |
| `hinweis` | Text | nein | |

### mobility

```json
"mobility": {
  "soll_pro_woche": 3,
  "einheiten": [
    {"id": "m-a", "titel": "Mobility & Core A", "dauer_min": 12, "tag_vorschlag": "2026-10-09",
     "status": "geplant",
     "uebungen": [{"id": "mob-hueftbeuger-kniend", "dauer_s": 45, "seitig": true}]}
  ]
}
```

Regeln (Fehler, wenn verletzt):
- `soll_pro_woche` ≥ 1, Anzahl `einheiten` ≥ `soll_pro_woche`.
- Jede Einheit hat ≥ 1 Übungsverweis, davon mind. einer der Kategorie
  `mobility`, `faszien` oder `core`.
- Einheiten-`status` wie bei Einheit.
- `tag_vorschlag` Pflicht (Datum innerhalb der Woche), wie bei Einheit.

### Tagesverteilung (Warnungen, nicht blockierend)

Über alle Wochen eines Athleten (auch über Wochengrenzen) meldet das
Prüfskript als Warnung:
- zwei **intensive** Einheiten am selben Tag oder an Folgetagen – intensiv =
  `sportart` `kraft`, Übung der Kategorie `plyometrie`, Block `intervall` oder
  Block mit Zone `Z3`–`Z5`
- mehr als **3 Trainingstage am Stück** (Mobility zählt nicht)

Bewusste Abweichungen sind erlaubt und werden in `notiz_coach` begründet.

### Ernährungshinweise

- Jeder Hinweis hat einen `tag` (Datum innerhalb der Woche, **nie null**);
  die Webseite zeigt ihn direkt unter den Einheiten dieses Tages.
- Der Hinweis bezieht sich auf eine Einheit an diesem Tag (sonst Warnung) und
  sagt etwas Konkretes, nicht Selbstverständliches – z. B. Kohlenhydrate vor
  und während langer Einheiten. Keine allgemeinen Hinweise wie „nach Kraft
  proteinreich essen“.

### Feste Listen und neue Einträge

Übungskategorien (`kategorie`), Sportarten (`sportart`) und Phasentypen
(`typ`) sind feste Listen, weil die Webseite jedem Eintrag eine Farbe
zuordnet. Ein Wert außerhalb der Liste erzeugt eine **Warnung** und darf
erst nach Genehmigung durch den Projektinhaber verwendet werden. Mit der
Genehmigung wird die **Farbe festgelegt** und der Wert in Prüfskript,
Datenformat und Farbverzeichnis der Webseite ergänzt. Ohne Farbe zeigt die
Webseite den Eintrag grau.

---

## aktuell.json

```json
{
  "format_version": 1,
  "athlet": "demo",
  "aktualisiert": "2026-09-14T18:00:00+02:00",
  "block": {
    "name": "Skiblock",
    "ziel": "6 Skitage in Folge ohne limitierende Beine",
    "zieldatum": "2026-12-26",
    "start": "2026-10-07",
    "ende": "2026-12-25",
    "phasen": [{"name": "Eingewöhnung", "typ": "eingewoehnung", "wochen": [1, 2]}]
  },
  "zonen": {
    "stand": "2026-04",
    "hf": {"Z1": [null, 135], "Z2": [136, 147]},
    "leistung_w": {"Z2": [128, 171]},
    "pace": {"Z2": ["6:23", "6:50"]}
  },
  "wochen": [ { "…Wochenobjekt laufende Woche…" }, { "…nächste Woche…" } ]
}
```

- `wochen`: 1–2 Einträge, aufsteigend, `nr` fortlaufend, ISO-Wochen direkt
  aufeinanderfolgend.
- `block.phasen[].wochen`: Wochennummern; jede Woche in `aktuell.json` und
  im Archiv muss einer Phase zugeordnet sein.
- `zonen`: alle Unterobjekte optional; Schlüssel `Z1`–`Z5`.

---

## index.json

```json
{
  "format_version": 1,
  "athlet": "demo",
  "wochen": [
    {"iso_woche": "2026-W41", "nr": 1, "start": "2026-10-07", "ende": "2026-10-11",
     "phase": "Eingewöhnung", "typ": "eingewoehnung", "status": "abgeschlossen",
     "geplant_min": 150, "einheiten_pflicht": 2, "einheiten_optional": 1, "mobility_soll": 3,
     "erledigt": {"einheiten_pflicht": 2, "einheiten_optional": 0, "mobility": 3, "minuten": 110},
     "datei": "wochen/2026-W41.json"}
  ]
}
```

| Feld | Regel |
|---|---|
| `status` | `abgeschlossen` (Archiv), `laufend`/`geplant` (aktuell.json) |
| `geplant_min` | Summe `dauer_min` aller Einheiten (ohne Mobility) |
| `einheiten_pflicht` / `_optional` | Anzahl laut Woche |
| `mobility_soll` | = `mobility.soll_pro_woche` |
| `erledigt` | bei `abgeschlossen` Pflicht, sonst `null`; zählt Status `erledigt` (`teilweise` zählt als erledigt, Minuten = geplante Dauer der Einheit) |
| `datei` | `wochen/<iso_woche>.json` oder `aktuell.json` |

Jede Woche aus Archiv und `aktuell.json` steht genau einmal im Index, sortiert
nach `nr`; die Werte müssen zur Wochendatei passen.

`status.json` fließt **nicht** in den Index ein: `erledigt` gibt es erst für
abgeschlossene Wochen und wird aus der Archivdatei berechnet.

---

## status.json

Von der App geschriebener Status der Einheiten. Optional (fehlt, solange
nichts gemeldet wurde). **Einziger Schreiber ist die App**; der Coach ändert
die Datei nicht.

```json
{
  "format_version": 1,
  "athlet": "demo",
  "aktualisiert": "2026-09-16T19:42:00+02:00",
  "wochen": {
    "2026-W38": {"e1": "erledigt", "m-a": "erledigt", "e2": "teilweise"}
  }
}
```

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `athlet` | ID | ja | wie in allen Dateien |
| `aktualisiert` | Zeitpunkt | ja | letzte Meldung |
| `wochen` | Objekt | ja | Schlüssel ISO-Woche → Objekt `{einheit-id: status}` |

Regeln:
- **Nur diese Schlüssel, kein Freitext** – andere Schlüssel sind Fehler.
- Status: `erledigt`, `teilweise` oder `ausgelassen`. Zurücksetzen auf
  „geplant“ = Eintrag entfernen.
- Einheit-IDs aus `einheiten` **und** `mobility.einheiten` der Woche; sie
  müssen existieren (Fehler).
- Wochen nur aus `aktuell.json`. Steht die Woche schon im Archiv → Warnung;
  die App entfernt solche Wochen beim nächsten Speichern. Weicht der gemeldete
  vom archivierten Status ab → Warnung („bewusst korrigiert?“).
- Unbekannte Woche → Fehler.

**Anzeige:** Für Wochen aus `aktuell.json` gilt der Status aus `status.json`
vor `einheit.status`. Archivwochen zeigen den Status der Archivdatei.

**Wochen-Check:** Der Coach übernimmt den Status aus `status.json` (bei
Bedarf korrigiert nach Rückmeldung) beim Archivieren in
`wochen/<JJJJ-Www>.json` und berechnet `index.json`.

---

## Änderungen am Format

Nicht rückwärtskompatible Änderungen erhöhen `format_version` und die
MAJOR-Version des Skills; Prüfskript, Beispiele und Webseite werden
gemeinsam angepasst.
