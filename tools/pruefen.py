#!/usr/bin/env python3
"""Prüft Plandateien gegen das Datenformat (format_version 1).

Aufruf:  python3 pruefen.py <pfad-zum-plaene-ordner>
Exit-Code 0 = keine Fehler (Warnungen möglich), 1 = Fehler.
Nur Python-Standardbibliothek (ab 3.8).

Hinweis: Kopie liegt in training-app/tools/pruefen.py – beide synchron halten.
"""
import json
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

FORMAT_VERSION = 1

ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DATUM_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ISO_WOCHE_RE = re.compile(r"^(\d{4})-W(\d{2})$")
PACE_RE = re.compile(r"^\d{1,2}:[0-5]\d$")
ZONEN = {"Z1", "Z2", "Z3", "Z4", "Z5"}

KATEGORIEN = {"mobility", "faszien", "core", "kraft", "plyometrie", "lauf-abc", "aufwaermen"}
MOBILITY_KATEGORIEN = {"mobility", "faszien", "core"}
WOCHEN_TYPEN = {"eingewoehnung", "aufbau", "entlastung", "taper", "wettkampf", "pause"}
SPORTARTEN = {"kraft", "laufen", "rad", "schwimmen", "koppel", "mobility", "core", "ski", "wandern", "sonstiges"}
BLOCK_TYPEN = {"aufwaermen", "haupt", "intervall", "technik", "cooldown"}
EINHEIT_STATUS = {"geplant", "erledigt", "teilweise", "ausgelassen"}
INDEX_STATUS = {"abgeschlossen", "laufend", "geplant"}

# Schlüssel, die in öffentlichen Dateien nicht vorkommen dürfen (Datenschutz).
GESPERRTE_SCHLUESSEL = {
    "vorname", "nachname", "echter_name", "geburtsdatum", "alter", "email", "telefon", "adresse",
    "gewicht", "koerpergewicht", "groesse", "ruhe_hf", "ruhepuls", "hrv", "schlaf",
    "gesundheit", "beschwerden", "schmerz", "schmerzen", "verletzung", "verletzungen",
    "krankheit", "medikamente", "feedback", "kommentar_athlet",
}


class Pruefer:
    def __init__(self):
        self.fehler = []
        self.warnungen = []

    def f(self, ort, text):
        self.fehler.append(f"{ort}: {text}")

    def w(self, ort, text):
        self.warnungen.append(f"{ort}: {text}")

    # ---------- Hilfsfunktionen ----------

    def lade(self, pfad, basis):
        ort = str(pfad.relative_to(basis))
        try:
            with open(pfad, encoding="utf-8") as datei:
                daten = json.load(datei)
        except json.JSONDecodeError as e:
            self.f(ort, f"ungültiges JSON (Zeile {e.lineno}, Spalte {e.colno}): {e.msg}")
            return None
        except OSError as e:
            self.f(ort, f"nicht lesbar: {e}")
            return None
        if not isinstance(daten, dict):
            self.f(ort, "oberste Ebene muss ein Objekt sein")
            return None
        if daten.get("format_version") != FORMAT_VERSION:
            self.f(ort, f"format_version muss {FORMAT_VERSION} sein")
        self.datenschutz(daten, ort)
        return daten

    def datenschutz(self, wert, ort, pfad="$"):
        if isinstance(wert, dict):
            for schluessel, inhalt in wert.items():
                if schluessel.lower() in GESPERRTE_SCHLUESSEL:
                    self.f(ort, f"gesperrter Schlüssel '{schluessel}' bei {pfad} (Datenschutz)")
                self.datenschutz(inhalt, ort, f"{pfad}.{schluessel}")
        elif isinstance(wert, list):
            for i, inhalt in enumerate(wert):
                self.datenschutz(inhalt, ort, f"{pfad}[{i}]")

    def pflicht(self, obj, feld, typ, ort, erlaubt_leer=True):
        """Prüft Vorhandensein und Typ; gibt den Wert oder None zurück."""
        if not isinstance(obj, dict) or feld not in obj:
            self.f(ort, f"Pflichtfeld '{feld}' fehlt")
            return None
        wert = obj[feld]
        if not self.typ_ok(wert, typ):
            self.f(ort, f"'{feld}' hat falschen Typ (erwartet {self.typ_name(typ)})")
            return None
        if not erlaubt_leer and wert in ("", [], {}):
            self.f(ort, f"'{feld}' darf nicht leer sein")
        return wert

    def optional(self, obj, feld, typ, ort):
        if not isinstance(obj, dict) or feld not in obj or obj[feld] is None:
            return None
        wert = obj[feld]
        if not self.typ_ok(wert, typ):
            self.f(ort, f"'{feld}' hat falschen Typ (erwartet {self.typ_name(typ)})")
            return None
        return wert

    @staticmethod
    def typ_ok(wert, typ):
        typen = typ if isinstance(typ, tuple) else (typ,)
        if isinstance(wert, bool) and bool not in typen:
            return False  # bool ist in Python ein int – hier nicht als Zahl zulassen
        return isinstance(wert, typen)

    @staticmethod
    def typ_name(typ):
        namen = {str: "Text", int: "Ganzzahl", float: "Zahl", bool: "true/false", list: "Liste", dict: "Objekt"}
        typen = typ if isinstance(typ, tuple) else (typ,)
        return " oder ".join(namen.get(t, t.__name__) for t in typen)

    def datum(self, obj, feld, ort, pflicht=True):
        wert = obj.get(feld) if isinstance(obj, dict) else None
        if wert is None:
            if pflicht:
                self.f(ort, f"Pflichtfeld '{feld}' fehlt")
            return None
        if not isinstance(wert, str) or not DATUM_RE.match(wert):
            self.f(ort, f"'{feld}' muss Datum JJJJ-MM-TT sein")
            return None
        try:
            return date.fromisoformat(wert)
        except ValueError:
            self.f(ort, f"'{feld}' ist kein gültiges Datum: {wert}")
            return None

    def bereich(self, obj, feld, ort):
        if feld not in obj or obj[feld] is None:
            return
        wert = obj[feld]
        if not isinstance(wert, list) or len(wert) != 2:
            self.f(ort, f"'{feld}' muss Liste [von, bis] sein")
            return
        if feld == "pace":
            if any(v is not None and (not isinstance(v, str) or not PACE_RE.match(v)) for v in wert):
                self.f(ort, "'pace' erwartet Texte im Format m:ss")
                return
            if None not in wert and self.sekunden(wert[0]) > self.sekunden(wert[1]):
                self.f(ort, "'pace': schnellerer (kleinerer) Wert zuerst")
        else:
            if any(v is not None and not self.typ_ok(v, (int, float)) for v in wert):
                self.f(ort, f"'{feld}' erwartet Zahlen oder null")
                return
            if None not in wert and wert[0] > wert[1]:
                self.f(ort, f"'{feld}': von > bis")

    @staticmethod
    def sekunden(pace):
        minuten, sek = pace.split(":")
        return int(minuten) * 60 + int(sek)

    def id_format(self, wert, ort, bezeichnung="id"):
        if not isinstance(wert, str) or not ID_RE.match(wert):
            self.f(ort, f"{bezeichnung} '{wert}' ungültig (nur a-z, 0-9, Bindestriche)")
            return False
        return True

    # ---------- athleten.json ----------

    def athleten(self, basis):
        pfad = basis / "athleten.json"
        if not pfad.exists():
            self.f("athleten.json", "Datei fehlt")
            return {}
        daten = self.lade(pfad, basis)
        if daten is None:
            return {}
        liste = self.pflicht(daten, "athleten", list, "athleten.json")
        ergebnis = {}
        for i, a in enumerate(liste or []):
            ort = f"athleten.json athleten[{i}]"
            if not isinstance(a, dict):
                self.f(ort, "muss Objekt sein")
                continue
            aid = self.pflicht(a, "id", str, ort)
            self.pflicht(a, "anzeigename", str, ort, erlaubt_leer=False)
            self.pflicht(a, "sportarten", list, ort)
            self.optional(a, "testdaten", bool, ort)
            if aid is not None and self.id_format(aid, ort):
                if aid in ergebnis:
                    self.f(ort, f"id '{aid}' doppelt")
                ergebnis[aid] = a
        return ergebnis

    # ---------- uebungen.json ----------

    def uebungen(self, basis):
        pfad = basis / "uebungen.json"
        if not pfad.exists():
            self.f("uebungen.json", "Datei fehlt")
            return {}
        daten = self.lade(pfad, basis)
        if daten is None:
            return {}
        katalog = self.pflicht(daten, "uebungen", dict, "uebungen.json") or {}
        for uid, u in katalog.items():
            ort = f"uebungen.json [{uid}]"
            self.id_format(uid, ort)
            if not isinstance(u, dict):
                self.f(ort, "muss Objekt sein")
                continue
            self.pflicht(u, "name", str, ort, erlaubt_leer=False)
            kat = self.pflicht(u, "kategorie", str, ort)
            if kat is not None and kat not in KATEGORIEN:
                self.f(ort, f"kategorie '{kat}' unbekannt ({', '.join(sorted(KATEGORIEN))})")
            self.pflicht(u, "sportarten", list, ort, erlaubt_leer=False)
            self.pflicht(u, "equipment", list, ort)
            ablauf = self.pflicht(u, "ablauf", list, ort)
            if ablauf is not None:
                if len(ablauf) < 2 or not all(isinstance(s, str) and s.strip() for s in ablauf):
                    self.f(ort, "'ablauf' braucht mindestens 2 nicht-leere Schritte")
            for feld in ("zielmuskeln", "hinweise", "fehler"):
                self.optional(u, feld, list, ort)
            standard = self.optional(u, "standard", dict, ort)
            if standard is not None:
                self.mengenangabe(standard, ort + " standard", pflicht=False)
            for feld in ("leichter", "schwerer"):
                ziel = self.optional(u, feld, str, ort)
                if ziel is not None and ziel not in katalog:
                    self.f(ort, f"'{feld}' verweist auf unbekannte Übung '{ziel}'")
        return katalog

    def mengenangabe(self, obj, ort, pflicht=True):
        self.optional(obj, "saetze", int, ort)
        hat_wdh = obj.get("wdh") is not None
        hat_dauer = obj.get("dauer_s") is not None
        if hat_wdh and hat_dauer:
            self.f(ort, "nur eines von 'wdh' oder 'dauer_s' angeben")
        elif pflicht and not (hat_wdh or hat_dauer):
            self.f(ort, "'wdh' oder 'dauer_s' fehlt")
        self.optional(obj, "wdh", (int, str), ort)
        self.optional(obj, "dauer_s", (int, float), ort)
        self.optional(obj, "seitig", bool, ort)
        self.optional(obj, "tempo", str, ort)
        self.optional(obj, "pause_s", (int, float), ort)

    # ---------- Wochen ----------

    def woche(self, w, ort, katalog):
        """Prüft ein Wochenobjekt. Gibt Kennzahlen für den Indexabgleich zurück."""
        if not isinstance(w, dict):
            self.f(ort, "Woche muss Objekt sein")
            return None
        iso = self.pflicht(w, "iso_woche", str, ort)
        nr = self.pflicht(w, "nr", int, ort)
        if nr is not None and nr < 1:
            self.f(ort, "'nr' muss ≥ 1 sein")
        start = self.datum(w, "start", ort)
        ende = self.datum(w, "ende", ort)
        self.pflicht(w, "phase", str, ort, erlaubt_leer=False)
        typ = self.pflicht(w, "typ", str, ort)
        if typ is not None and typ not in WOCHEN_TYPEN:
            self.f(ort, f"typ '{typ}' unbekannt ({', '.join(sorted(WOCHEN_TYPEN))})")
        self.pflicht(w, "fokus", str, ort, erlaubt_leer=False)
        self.optional(w, "notiz_coach", str, ort)

        if iso is not None:
            m = ISO_WOCHE_RE.match(iso)
            if not m:
                self.f(ort, f"iso_woche '{iso}' muss Format JJJJ-Www haben")
            elif start is not None:
                jahr, kw, _ = start.isocalendar()
                if (jahr, kw) != (int(m.group(1)), int(m.group(2))):
                    self.f(ort, f"start {start} liegt nicht in {iso}")
        if start and ende:
            if start > ende:
                self.f(ort, "start liegt nach ende")
            montag = start - timedelta(days=start.weekday())
            if ende > montag + timedelta(days=6):
                self.f(ort, "ende liegt nicht in derselben Woche (Mo–So) wie start")

        einheiten = self.pflicht(w, "einheiten", list, ort) or []
        ids = set()
        kennzahlen = {"geplant_min": 0, "pflicht": 0, "optional": 0,
                      "erl_pflicht": 0, "erl_optional": 0, "erl_minuten": 0,
                      "trainingstage": []}  # (Datum, intensiv, id) je Einheit, für die Verteilungs-Hinweise
        for i, e in enumerate(einheiten):
            eort = f"{ort} einheiten[{i}]"
            if not isinstance(e, dict):
                self.f(eort, "muss Objekt sein")
                continue
            eid = self.pflicht(e, "id", str, eort)
            if eid is not None:
                self.id_format(eid, eort)
                if eid in ids:
                    self.f(eort, f"id '{eid}' doppelt in der Woche")
                ids.add(eid)
            ist_pflicht = self.pflicht(e, "pflicht", bool, eort)
            sportart = self.pflicht(e, "sportart", str, eort)
            if sportart is not None and sportart not in SPORTARTEN:
                self.w(eort, f"sportart '{sportart}' nicht in bekannter Liste")
            self.pflicht(e, "titel", str, eort, erlaubt_leer=False)
            tag = self.tag_pflicht(e, eort, start, ende)
            dauer = self.pflicht(e, "dauer_min", (int, float), eort)
            self.pflicht(e, "ziel", str, eort, erlaubt_leer=False)
            status = self.pflicht(e, "status", str, eort)
            if status is not None and status not in EINHEIT_STATUS:
                self.f(eort, f"status '{status}' unbekannt")

            bloecke = self.optional(e, "bloecke", list, eort) or []
            uebungen = self.optional(e, "uebungen", list, eort) or []
            if not bloecke and not uebungen:
                self.f(eort, "braucht 'bloecke' oder 'uebungen'")
            if sportart == "kraft" and not uebungen:
                self.f(eort, "Krafteinheit ohne Übungen")
            for j, b in enumerate(bloecke):
                self.block(b, f"{eort} bloecke[{j}]")
            for j, u in enumerate(uebungen):
                self.uebungsverweis(u, f"{eort} uebungen[{j}]", katalog)
            for j, alt in enumerate(self.optional(e, "alternativen", list, eort) or []):
                aort = f"{eort} alternativen[{j}]"
                self.pflicht(alt, "titel", str, aort)
                self.pflicht(alt, "beschreibung", str, aort)

            if tag is not None:
                kennzahlen["trainingstage"].append((tag, self.ist_intensiv(e, katalog), eid))
            if dauer is not None:
                kennzahlen["geplant_min"] += dauer
            if ist_pflicht is not None:
                kennzahlen["pflicht" if ist_pflicht else "optional"] += 1
                if status in ("erledigt", "teilweise"):
                    kennzahlen["erl_pflicht" if ist_pflicht else "erl_optional"] += 1
                    kennzahlen["erl_minuten"] += dauer or 0

        if typ != "pause" and kennzahlen["pflicht"] == 0:
            self.f(ort, "Woche ohne Pflichteinheit")

        kennzahlen.update(self.mobility(w, ort, katalog, ids, start, ende))

        for j, h in enumerate(self.optional(w, "ernaehrung_hinweise", list, ort) or []):
            hort = f"{ort} ernaehrung_hinweise[{j}]"
            if not isinstance(h, dict):
                self.f(hort, "muss Objekt sein")
                continue
            self.pflicht(h, "text", str, hort, erlaubt_leer=False)
            if "tag" not in h:
                self.f(hort, "Pflichtfeld 'tag' fehlt (null = ganze Woche)")
            else:
                self.tag_in_woche(h, hort, start, ende, feld="tag")

        kennzahlen.update({"iso_woche": iso, "nr": nr, "start": w.get("start"), "ende": w.get("ende"),
                           "phase": w.get("phase"), "typ": typ})
        return kennzahlen

    def tag_pflicht(self, obj, ort, start, ende):
        """Jede Einheit (auch optionale und Mobility) braucht einen konkreten Tag."""
        if obj.get("tag_vorschlag") is None:
            self.f(ort, "'tag_vorschlag' fehlt – jede Einheit braucht einen Tag, auch optionale und Mobility")
            return None
        tag = self.datum(obj, "tag_vorschlag", ort)
        if tag and start and ende and not (start <= tag <= ende):
            self.f(ort, f"'tag_vorschlag' {tag} liegt außerhalb der Woche {start}–{ende}")
        return tag

    @staticmethod
    def ist_intensiv(einheit, katalog):
        """Intensiv = Kraft, Plyometrie-Übung, Intervallblock oder Block in Zone Z3–Z5."""
        if einheit.get("sportart") == "kraft":
            return True
        for u in einheit.get("uebungen") or []:
            if isinstance(u, dict) and katalog.get(u.get("id"), {}).get("kategorie") == "plyometrie":
                return True
        for b in einheit.get("bloecke") or []:
            if isinstance(b, dict) and (b.get("typ") == "intervall" or b.get("zone") in {"Z3", "Z4", "Z5"}):
                return True
        return False

    def verteilung(self, aid, wochen_je_datei):
        """Hinweise zur Tagesverteilung über alle Wochen eines Athleten (nur Warnungen)."""
        einheiten = sorted(
            (tag, intensiv, iso, eid)
            for iso, (k, _) in wochen_je_datei.items()
            for tag, intensiv, eid in k.get("trainingstage", [])
        )
        intensive = [x for x in einheiten if x[1]]
        for i, (tag1, _, iso1, id1) in enumerate(intensive):
            for tag2, _, iso2, id2 in intensive[i + 1:]:
                abstand = (tag2 - tag1).days
                if abstand > 1:
                    break
                wann = "am selben Tag" if abstand == 0 else "an Folgetagen"
                self.w(aid, f"zwei intensive Einheiten {wann}: {iso1} {id1} ({tag1}) und {iso2} {id2} ({tag2}) – bewusst geplant?")

        tage = sorted({x[0] for x in einheiten})
        serie = [tage[0]] if tage else []
        for tag in tage[1:] + [None]:
            if tag is not None and (tag - serie[-1]).days == 1:
                serie.append(tag)
                continue
            if len(serie) > 3:
                self.w(aid, f"{len(serie)} Trainingstage am Stück ({serie[0]} bis {serie[-1]}) – Erholung ausreichend?")
            serie = [tag] if tag is not None else []

    def tag_in_woche(self, obj, ort, start, ende, feld="tag_vorschlag"):
        if obj.get(feld) is None:
            return
        tag = self.datum(obj, feld, ort)
        if tag and start and ende and not (start <= tag <= ende):
            self.f(ort, f"'{feld}' {tag} liegt außerhalb der Woche {start}–{ende}")

    def mobility(self, w, ort, katalog, einheit_ids, start, ende):
        mort = f"{ort} mobility"
        ergebnis = {"mobility_soll": None, "erl_mobility": 0}
        if not isinstance(w.get("mobility"), dict):
            self.f(ort, "'mobility' fehlt oder ist kein Objekt – Mobility & Core ist in jeder Woche Pflicht")
            return ergebnis
        mob = w["mobility"]
        soll = self.pflicht(mob, "soll_pro_woche", int, mort)
        ergebnis["mobility_soll"] = soll
        if soll is not None and soll < 1:
            self.f(mort, "soll_pro_woche muss ≥ 1 sein (Mobility & Core jede Woche)")
        einheiten = self.pflicht(mob, "einheiten", list, mort) or []
        if soll is not None and len(einheiten) < soll:
            self.f(mort, f"{len(einheiten)} Einheit(en) geplant, soll_pro_woche ist {soll}")
        for i, e in enumerate(einheiten):
            eort = f"{mort} einheiten[{i}]"
            if not isinstance(e, dict):
                self.f(eort, "muss Objekt sein")
                continue
            eid = self.pflicht(e, "id", str, eort)
            if eid is not None:
                self.id_format(eid, eort)
                if eid in einheit_ids:
                    self.f(eort, f"id '{eid}' doppelt in der Woche")
                einheit_ids.add(eid)
            self.pflicht(e, "titel", str, eort, erlaubt_leer=False)
            self.pflicht(e, "dauer_min", (int, float), eort)
            self.tag_pflicht(e, eort, start, ende)
            status = self.pflicht(e, "status", str, eort)
            if status is not None and status not in EINHEIT_STATUS:
                self.f(eort, f"status '{status}' unbekannt")
            if status in ("erledigt", "teilweise"):
                ergebnis["erl_mobility"] += 1
            uebungen = self.pflicht(e, "uebungen", list, eort) or []
            if not uebungen:
                self.f(eort, "keine Übungen – Platzhalter sind nicht erlaubt, konkrete Übungen per ID angeben")
            passende = False
            for j, u in enumerate(uebungen):
                self.uebungsverweis(u, f"{eort} uebungen[{j}]", katalog)
                if isinstance(u, dict) and katalog.get(u.get("id"), {}).get("kategorie") in MOBILITY_KATEGORIEN:
                    passende = True
            if uebungen and not passende:
                self.f(eort, "enthält keine Übung der Kategorie mobility, faszien oder core")
        return ergebnis

    def block(self, b, ort):
        if not isinstance(b, dict):
            self.f(ort, "muss Objekt sein")
            return
        typ = self.pflicht(b, "typ", str, ort)
        if typ is not None and typ not in BLOCK_TYPEN:
            self.f(ort, f"typ '{typ}' unbekannt ({', '.join(sorted(BLOCK_TYPEN))})")
        self.pflicht(b, "dauer_min", (int, float), ort)
        zone = self.optional(b, "zone", str, ort)
        if zone is not None and zone not in ZONEN:
            self.f(ort, f"zone '{zone}' muss Z1–Z5 sein")
        for feld in ("hf", "leistung_w", "pace", "trittfrequenz"):
            self.bereich(b, feld, ort)
        self.optional(b, "beschreibung", str, ort)
        if typ == "intervall":
            wdh = self.pflicht(b, "wiederholungen", int, ort)
            if wdh is not None and wdh < 1:
                self.f(ort, "wiederholungen muss ≥ 1 sein")
            pause = self.pflicht(b, "pause", dict, ort)
            if pause is not None:
                self.pflicht(pause, "dauer_min", (int, float), ort + " pause")
                pzone = self.optional(pause, "zone", str, ort + " pause")
                if pzone is not None and pzone not in ZONEN:
                    self.f(ort + " pause", f"zone '{pzone}' muss Z1–Z5 sein")

    def uebungsverweis(self, u, ort, katalog):
        if not isinstance(u, dict):
            self.f(ort, "muss Objekt sein")
            return
        uid = self.pflicht(u, "id", str, ort)
        if uid is not None and uid not in katalog:
            self.f(ort, f"Übung '{uid}' existiert nicht in uebungen.json")
        self.mengenangabe(u, ort)
        self.optional(u, "hinweis", str, ort)

    # ---------- Athletenordner ----------

    def athletenordner(self, basis, aid, katalog):
        ordner = basis / aid
        wochen_je_datei = {}  # iso_woche -> (kennzahlen, datei)
        nrs_vorhanden = []

        aktuell_pfad = ordner / "aktuell.json"
        phasen_wochen = {}
        if not aktuell_pfad.exists():
            self.f(f"{aid}/aktuell.json", "Datei fehlt")
        else:
            daten = self.lade(aktuell_pfad, basis)
            if daten is not None:
                ort = f"{aid}/aktuell.json"
                if daten.get("athlet") != aid:
                    self.f(ort, f"'athlet' muss '{aid}' sein")
                self.zeitpunkt(daten, "aktualisiert", ort)
                phasen_wochen = self.block_info(daten, ort)
                self.zonen(daten, ort)
                wochen = self.pflicht(daten, "wochen", list, ort) or []
                if not 1 <= len(wochen) <= 2:
                    self.f(ort, "'wochen' muss 1–2 Wochen enthalten (laufende + nächste)")
                vorher = None
                for i, w in enumerate(wochen):
                    k = self.woche(w, f"{ort} wochen[{i}]", katalog)
                    if k is None:
                        continue
                    if vorher is not None and k["nr"] is not None and vorher["nr"] is not None:
                        if k["nr"] != vorher["nr"] + 1:
                            self.f(ort, "Wochen in 'wochen' müssen fortlaufende nr haben")
                        if k["start"] and vorher["start"]:
                            try:
                                d1 = date.fromisoformat(vorher["start"])
                                d2 = date.fromisoformat(k["start"])
                                m1 = d1 - timedelta(days=d1.weekday())
                                m2 = d2 - timedelta(days=d2.weekday())
                                if m2 - m1 != timedelta(days=7):
                                    self.f(ort, "Wochen in 'wochen' müssen direkt aufeinanderfolgen")
                            except ValueError:
                                pass
                    vorher = k
                    self.eintragen(wochen_je_datei, k, "aktuell.json", ort)

        wochen_ordner = ordner / "wochen"
        if wochen_ordner.is_dir():
            for pfad in sorted(wochen_ordner.glob("*.json")):
                daten = self.lade(pfad, basis)
                if daten is None:
                    continue
                ort = str(pfad.relative_to(basis))
                if daten.get("athlet") != aid:
                    self.f(ort, f"'athlet' muss '{aid}' sein")
                k = self.woche(daten, ort, katalog)
                if k is None:
                    continue
                if k["iso_woche"] and pfad.stem != k["iso_woche"]:
                    self.f(ort, f"Dateiname muss {k['iso_woche']}.json sein")
                mob = daten.get("mobility") if isinstance(daten.get("mobility"), dict) else {}
                alle = [e for teil in (daten.get("einheiten"), mob.get("einheiten")) if isinstance(teil, list) for e in teil]
                offen = [e.get("id") for e in alle if isinstance(e, dict) and e.get("status") == "geplant"]
                if offen:
                    self.w(ort, f"abgeschlossene Woche mit status 'geplant': {', '.join(map(str, offen))}")
                self.eintragen(wochen_je_datei, k, f"wochen/{pfad.name}", ort)

        for iso, (k, _) in wochen_je_datei.items():
            if k["nr"] is not None:
                nrs_vorhanden.append(k["nr"])
                if phasen_wochen and k["nr"] not in phasen_wochen:
                    self.f(f"{aid}", f"Woche nr {k['nr']} ({iso}) keiner Phase in block.phasen zugeordnet")
                elif phasen_wochen and k["phase"] != phasen_wochen[k["nr"]]:
                    self.w(f"{aid}", f"Woche nr {k['nr']}: phase '{k['phase']}' ≠ block.phasen '{phasen_wochen[k['nr']]}'")
        if len(nrs_vorhanden) != len(set(nrs_vorhanden)):
            self.f(f"{aid}", "Wochennummern doppelt vergeben")

        self.verteilung(aid, wochen_je_datei)
        self.index(basis, aid, wochen_je_datei)

    def eintragen(self, verzeichnis, k, datei, ort):
        iso = k["iso_woche"]
        if iso is None:
            return
        if iso in verzeichnis:
            self.f(ort, f"{iso} steht mehrfach ({verzeichnis[iso][1]} und {datei}) – "
                        "eine Woche gehört entweder in aktuell.json oder ins Archiv")
            return
        verzeichnis[iso] = (k, datei)

    def zeitpunkt(self, obj, feld, ort):
        wert = self.pflicht(obj, feld, str, ort)
        if wert is None:
            return
        try:
            zeit = datetime.fromisoformat(wert)
            if zeit.tzinfo is None:
                self.f(ort, f"'{feld}' braucht eine Zeitzone, z. B. +02:00")
        except ValueError:
            self.f(ort, f"'{feld}' muss ISO-Zeitpunkt sein, z. B. 2026-10-05T19:30:00+02:00")

    def block_info(self, daten, ort):
        bort = ort + " block"
        block = self.pflicht(daten, "block", dict, ort)
        if block is None:
            return {}
        self.pflicht(block, "name", str, bort, erlaubt_leer=False)
        self.pflicht(block, "ziel", str, bort, erlaubt_leer=False)
        self.datum(block, "zieldatum", bort, pflicht=False)
        start = self.datum(block, "start", bort)
        ende = self.datum(block, "ende", bort)
        if start and ende and start > ende:
            self.f(bort, "start liegt nach ende")
        zuordnung = {}
        for i, p in enumerate(self.pflicht(block, "phasen", list, bort, erlaubt_leer=False) or []):
            port = f"{bort} phasen[{i}]"
            name = self.pflicht(p, "name", str, port)
            typ = self.pflicht(p, "typ", str, port)
            if typ is not None and typ not in WOCHEN_TYPEN:
                self.f(port, f"typ '{typ}' unbekannt")
            for nr in self.pflicht(p, "wochen", list, port, erlaubt_leer=False) or []:
                if not self.typ_ok(nr, int):
                    self.f(port, "'wochen' enthält nur Wochennummern")
                elif nr in zuordnung:
                    self.f(port, f"Woche {nr} ist mehreren Phasen zugeordnet")
                else:
                    zuordnung[nr] = name
        return zuordnung

    def zonen(self, daten, ort):
        zonen = self.optional(daten, "zonen", dict, ort)
        if zonen is None:
            return
        zort = ort + " zonen"
        self.optional(zonen, "stand", str, zort)
        for art in ("hf", "leistung_w", "pace"):
            tabelle = self.optional(zonen, art, dict, zort)
            for zone, bereich in (tabelle or {}).items():
                if zone not in ZONEN:
                    self.f(f"{zort} {art}", f"Zone '{zone}' muss Z1–Z5 sein")
                self.bereich({art: bereich}, art, f"{zort} {art}.{zone}")

    def index(self, basis, aid, wochen_je_datei):
        pfad = basis / aid / "index.json"
        ort = f"{aid}/index.json"
        if not pfad.exists():
            self.f(ort, "Datei fehlt")
            return
        daten = self.lade(pfad, basis)
        if daten is None:
            return
        if daten.get("athlet") != aid:
            self.f(ort, f"'athlet' muss '{aid}' sein")
        eintraege = self.pflicht(daten, "wochen", list, ort) or []
        gesehen = set()
        letzte_nr = 0
        for i, z in enumerate(eintraege):
            zort = f"{ort} wochen[{i}]"
            if not isinstance(z, dict):
                self.f(zort, "muss Objekt sein")
                continue
            iso = self.pflicht(z, "iso_woche", str, zort)
            nr = self.pflicht(z, "nr", int, zort)
            if nr is not None:
                if nr <= letzte_nr:
                    self.f(zort, "Einträge müssen nach nr aufsteigend sortiert sein")
                letzte_nr = nr
            status = self.pflicht(z, "status", str, zort)
            if status is not None and status not in INDEX_STATUS:
                self.f(zort, f"status '{status}' unbekannt")
            datei = self.pflicht(z, "datei", str, zort)
            if iso is None:
                continue
            if iso in gesehen:
                self.f(zort, f"{iso} doppelt im Index")
                continue
            gesehen.add(iso)
            if iso not in wochen_je_datei:
                self.f(zort, f"{iso} steht im Index, aber in keiner Wochendatei")
                continue
            k, quelle = wochen_je_datei[iso]
            if datei is not None and datei != quelle:
                self.f(zort, f"'datei' muss '{quelle}' sein")
            if quelle == "aktuell.json" and status == "abgeschlossen":
                self.f(zort, "Woche in aktuell.json kann nicht 'abgeschlossen' sein")
            if quelle != "aktuell.json" and status in ("laufend", "geplant"):
                self.f(zort, "Archivwoche muss status 'abgeschlossen' haben")
            vergleich = {
                "nr": k["nr"], "start": k["start"], "ende": k["ende"], "phase": k["phase"], "typ": k["typ"],
                "geplant_min": k["geplant_min"], "einheiten_pflicht": k["pflicht"],
                "einheiten_optional": k["optional"], "mobility_soll": k["mobility_soll"],
            }
            for feld, soll in vergleich.items():
                if z.get(feld) != soll:
                    self.f(zort, f"'{feld}' ist {z.get(feld)!r}, laut Wochendatei {soll!r}")
            erledigt = z.get("erledigt")
            if status == "abgeschlossen":
                if not isinstance(erledigt, dict):
                    self.f(zort, "'erledigt' ist bei abgeschlossenen Wochen Pflicht")
                else:
                    soll_erl = {"einheiten_pflicht": k["erl_pflicht"], "einheiten_optional": k["erl_optional"],
                                "mobility": k["erl_mobility"], "minuten": k["erl_minuten"]}
                    for feld, soll in soll_erl.items():
                        if erledigt.get(feld) != soll:
                            self.f(zort, f"'erledigt.{feld}' ist {erledigt.get(feld)!r}, laut Wochendatei {soll!r}")
            elif erledigt is not None:
                self.f(zort, "'erledigt' muss null sein, solange die Woche nicht abgeschlossen ist")
        for iso, (_, quelle) in wochen_je_datei.items():
            if iso not in gesehen:
                self.f(ort, f"{iso} ({quelle}) fehlt im Index")

    # ---------- Gesamt ----------

    def alles(self, basis):
        athleten = self.athleten(basis)
        katalog = self.uebungen(basis)
        ordner = {p.name for p in basis.iterdir() if p.is_dir() and not p.name.startswith(".")}
        for aid in sorted(ordner - set(athleten)):
            self.f(aid, "Athletenordner ohne Eintrag in athleten.json")
        for aid in sorted(set(athleten) - ordner):
            self.f("athleten.json", f"'{aid}' hat keinen Ordner")
        for aid in sorted(ordner & set(athleten)):
            self.athletenordner(basis, aid, katalog)
        return athleten, katalog


def main():
    if len(sys.argv) != 2:
        print("Aufruf: python3 pruefen.py <pfad-zum-plaene-ordner>")
        return 2
    basis = Path(sys.argv[1]).resolve()
    if not basis.is_dir():
        print(f"Ordner nicht gefunden: {basis}")
        return 2
    p = Pruefer()
    athleten, katalog = p.alles(basis)
    for text in p.warnungen:
        print(f"WARNUNG  {text}")
    for text in p.fehler:
        print(f"FEHLER   {text}")
    print(f"\n{len(athleten)} Athlet(en), {len(katalog)} Übung(en) geprüft: "
          f"{len(p.fehler)} Fehler, {len(p.warnungen)} Warnung(en).")
    return 1 if p.fehler else 0


if __name__ == "__main__":
    sys.exit(main())
