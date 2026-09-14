/* Gemeinsame Datenfunktionen für die Design-Entwürfe A und B.
   Entwurfsstand: wird bei der finalen Umsetzung neu geschrieben.
   Liest die Plandateien laut docs/datenformat.md. */
(function () {
  'use strict';

  const PLAENE = new URL('../../plaene/', document.currentScript.src);
  const param = (name) => new URLSearchParams(location.search).get(name);
  const pad = (n) => String(n).padStart(2, '0');

  // ---------- Laden ----------

  async function json(pfad) {
    // no-store: Plandaten immer frisch, nie aus dem Browser-Cache
    const antwort = await fetch(new URL(pfad, PLAENE), { cache: 'no-store' });
    if (!antwort.ok) throw new Error(`${pfad} nicht geladen (HTTP ${antwort.status})`);
    return antwort.json();
  }

  async function laden(id) {
    const [athleten, uebungen, aktuell, index] = await Promise.all([
      json('athleten.json'),
      json('uebungen.json'),
      json(`${id}/aktuell.json`),
      json(`${id}/index.json`),
    ]);
    return {
      id,
      athleten: athleten.athleten,
      uebungen: uebungen.uebungen,
      aktuell,
      index: index.wochen,
      geladen: new Date(),
    };
  }

  // Abgeschlossene Woche aus dem Archiv (datei laut index.json)
  const ladeWoche = (id, datei) => json(`${id}/${datei}`);

  // Athlet: ?id=… hat Vorrang, sonst letzte Auswahl im Browser, sonst demo
  function athletId() {
    const ausAdresse = param('id');
    try {
      if (ausAdresse) localStorage.setItem('plan-athlet', ausAdresse);
      return ausAdresse || localStorage.getItem('plan-athlet') || 'demo';
    } catch {
      return ausAdresse || 'demo';
    }
  }

  function athletWechseln(id) {
    const url = new URL(location.href);
    url.searchParams.set('id', id);
    url.hash = '';
    location.href = url.toString();
  }

  // ---------- Datum ----------

  const TAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const TAGE_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  const datum = (s) => { const [j, m, t] = s.split('-').map(Number); return new Date(j, m - 1, t); };
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const plusTage = (s, n) => { const d = datum(s); d.setDate(d.getDate() + n); return iso(d); };
  const tageZwischen = (a, b) => Math.round((datum(b) - datum(a)) / 86400000);
  const wochentag = (s) => (datum(s).getDay() + 6) % 7; // 0 = Montag

  // Zum Testen: ?heute=2026-09-17
  const heute = () => param('heute') || iso(new Date());

  const fmtTag = (s) => `${datum(s).getDate()}. ${MONATE[datum(s).getMonth()]}`;
  function fmtZeitraum(a, b) {
    const da = datum(a), db = datum(b);
    if (a === b) return fmtTag(a);
    if (da.getMonth() === db.getMonth()) return `${da.getDate()}.–${db.getDate()}. ${MONATE[db.getMonth()]}`;
    return `${fmtTag(a)} – ${fmtTag(b)}`;
  }
  function fmtZeitpunkt(s) {
    const d = new Date(s);
    return `${d.getDate()}. ${MONATE[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const fmtUhrzeit = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const fmtDauer = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)}:${pad(min % 60)} h`);
  const kw = (woche) => Number(woche.iso_woche.split('-W')[1]);

  // Alle 7 Tage Mo–So der ISO-Woche; imPlan = false bei Kurzwochen außerhalb start/ende
  function wochenTage(woche) {
    const montag = plusTage(woche.start, -wochentag(woche.start));
    return Array.from({ length: 7 }, (_, i) => {
      const d = plusTage(montag, i);
      return { datum: d, index: i, imPlan: d >= woche.start && d <= woche.ende };
    });
  }

  // ISO-Kalenderwoche als "JJJJ-Www" (Jahr des Donnerstags zählt)
  function isoWoche(s) {
    const donnerstag = datum(plusTage(s, 3 - wochentag(s)));
    const jan4 = new Date(donnerstag.getFullYear(), 0, 4);
    const nr = 1 + Math.round(((donnerstag - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
    return `${donnerstag.getFullYear()}-W${pad(nr)}`;
  }

  // Zeitrahmen einer Blockwoche, für die (noch) keine Datei existiert
  function wochenRahmen(block, nr) {
    const montag = plusTage(plusTage(block.start, -wochentag(block.start)), 7 * (nr - 1));
    const sonntag = plusTage(montag, 6);
    const phase = phaseVonNr(block, nr);
    return {
      nr,
      iso_woche: isoWoche(montag),
      start: montag < block.start ? block.start : montag,
      ende: sonntag > block.ende ? block.ende : sonntag,
      phase: phase ? phase.name : '',
      typ: phase ? phase.typ : '',
    };
  }

  function aktuelleWoche(aktuell, tag) {
    const i = aktuell.wochen.findIndex((w) => {
      const t = wochenTage(w);
      return tag >= t[0].datum && tag <= t[6].datum;
    });
    return i < 0 ? 0 : i;
  }

  // ---------- Woche & Einheiten ----------

  function alleEinheiten(woche) {
    return [
      ...woche.einheiten.map((e) => ({ ...e, art: 'training' })),
      ...woche.mobility.einheiten.map((e) => ({ ...e, art: 'mobility', sportart: 'mobility', pflicht: false })),
    ];
  }

  // Reihenfolge: Pflicht, Optional, Mobility
  const rang = (e) => (e.art === 'mobility' ? 2 : e.pflicht ? 0 : 1);
  const sortieren = (liste) => [...liste].sort((a, b) => rang(a) - rang(b));

  const amTag = (woche, tag) => sortieren(alleEinheiten(woche).filter((e) => e.tag_vorschlag === tag));
  const freiWaehlbar = (woche) => sortieren(alleEinheiten(woche).filter((e) => !e.tag_vorschlag));
  const einheit = (woche, id) => alleEinheiten(woche).find((e) => e.id === id);
  const ernaehrung = (woche, tag) => (woche.ernaehrung_hinweise || []).filter((h) => h.tag === tag);
  const istErledigt = (e) => e.status === 'erledigt' || e.status === 'teilweise';

  function wochenZahlen(woche) {
    const e = woche.einheiten;
    const pflicht = e.filter((x) => x.pflicht);
    const optional = e.filter((x) => !x.pflicht);
    return {
      minuten: e.reduce((s, x) => s + x.dauer_min, 0),
      pflicht: pflicht.length,
      pflichtErledigt: pflicht.filter(istErledigt).length,
      optional: optional.length,
      optionalErledigt: optional.filter(istErledigt).length,
      mobilitySoll: woche.mobility.soll_pro_woche,
      mobilityErledigt: woche.mobility.einheiten.filter(istErledigt).length,
    };
  }

  const blockWochen = (block) => Math.max(...block.phasen.flatMap((p) => p.wochen));
  function phaseVonNr(block, nr) { return block.phasen.find((p) => p.wochen.includes(nr)); }

  // ---------- Intensitäten ----------

  function bereich(b, einheit) {
    if (!b) return null;
    const [von, bis] = b;
    const e = einheit ? ` ${einheit}` : '';
    if (von == null) return `≤ ${bis}${e}`;
    if (bis == null) return `≥ ${von}${e}`;
    return von === bis ? `${von}${e}` : `${von}–${bis}${e}`;
  }

  // Wichtigster Block einer Ausdauereinheit (für Kurzanzeigen)
  function hauptBlock(e) {
    if (!e.bloecke || !e.bloecke.length || (e.uebungen && e.uebungen.length)) return null;
    return e.bloecke.find((b) => b.typ === 'intervall')
      || e.bloecke.find((b) => b.typ === 'haupt')
      || [...e.bloecke].sort((a, b) => b.dauer_min - a.dauer_min)[0];
  }

  // Absolute Werte eines Blocks. Fehlt ein Wert, wird er aus der Zonentabelle
  // ergänzt (abgeleitet: true), damit immer Zone + absolute Werte sichtbar sind.
  function intensitaet(block, sportart, zonen) {
    const z = block.zone;
    const tabelle = zonen || {};
    const werte = [];
    const hinzu = (feld, einheit) => {
      const eigen = block[feld];
      const wert = eigen || (z && tabelle[feld] && tabelle[feld][z]);
      if (wert) werte.push({ feld, text: bereich(wert, einheit), abgeleitet: !eigen });
    };
    if (sportart === 'rad' || block.leistung_w) hinzu('leistung_w', 'W');
    if (sportart === 'laufen' || block.pace) hinzu('pace', '/km');
    hinzu('hf', 'bpm');
    if (block.trittfrequenz) hinzu('trittfrequenz', 'U/min');
    return { zone: z || null, werte };
  }

  // Ablauf als Segmente für Blockdiagramme (Intervalle aufgefächert)
  function segmente(e) {
    const s = [];
    for (const b of e.bloecke || []) {
      if (b.typ === 'intervall') {
        for (let i = 0; i < b.wiederholungen; i++) {
          s.push({ min: b.dauer_min, zone: b.zone, typ: 'intervall' });
          if (b.pause && i < b.wiederholungen - 1) {
            s.push({ min: b.pause.dauer_min, zone: b.pause.zone || 'Z1', typ: 'pause' });
          }
        }
      } else {
        s.push({ min: b.dauer_min, zone: b.zone, typ: b.typ });
      }
    }
    return s;
  }

  function zonenZeilen(zonen) {
    return ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((z) => ({
      zone: z,
      hf: bereich(zonen.hf && zonen.hf[z], 'bpm'),
      leistung_w: bereich(zonen.leistung_w && zonen.leistung_w[z], 'W'),
      pace: bereich(zonen.pace && zonen.pace[z], '/km'),
    }));
  }

  // ---------- Übungen ----------

  function dosis(ref) {
    const saetze = ref.saetze || 1;
    const menge = ref.wdh != null ? `${ref.wdh} Wdh.` : ref.dauer_s != null ? `${ref.dauer_s} s` : '';
    return `${saetze > 1 ? `${saetze} × ` : ''}${menge}${ref.seitig ? ' je Seite' : ''}`;
  }

  function dosisDetails(ref) {
    const d = [];
    if (ref.tempo) d.push(`Tempo ${ref.tempo}`);
    if (ref.pause_s) d.push(`Pause ${ref.pause_s} s`);
    return d;
  }

  // ---------- Bezeichnungen ----------

  const SPORT = {
    kraft: { name: 'Kraft', icon: '🏋️' },
    laufen: { name: 'Laufen', icon: '🏃' },
    rad: { name: 'Rad', icon: '🚴' },
    schwimmen: { name: 'Schwimmen', icon: '🏊' },
    koppel: { name: 'Koppel', icon: '🔁' },
    mobility: { name: 'Mobility & Core', icon: '🧘' },
    core: { name: 'Core', icon: '🧘' },
    ski: { name: 'Ski', icon: '⛷️' },
    wandern: { name: 'Wandern', icon: '🥾' },
    sonstiges: { name: 'Sonstiges', icon: '✳️' },
  };
  const sport = (s) => SPORT[s] || { name: s, icon: '•' };

  const WOCHEN_TYP = {
    eingewoehnung: 'Eingewöhnung', aufbau: 'Aufbau', entlastung: 'Entlastung',
    taper: 'Taper', wettkampf: 'Wettkampf', pause: 'Pause',
  };
  const BLOCK_TYP = {
    aufwaermen: 'Aufwärmen', haupt: 'Hauptteil', intervall: 'Intervalle',
    technik: 'Technik', cooldown: 'Ausklang',
  };
  const KATEGORIE = {
    mobility: 'Mobility', faszien: 'Faszien', core: 'Core', kraft: 'Kraft',
    plyometrie: 'Plyometrie', 'lauf-abc': 'Lauf-ABC', aufwaermen: 'Aufwärmen',
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.PlanDaten = {
    laden, ladeWoche, athletId, athletWechseln,
    TAGE_KURZ, TAGE_LANG, MONATE, datum, iso, plusTage, tageZwischen, wochentag, heute,
    fmtTag, fmtZeitraum, fmtZeitpunkt, fmtUhrzeit, fmtDauer, kw, wochenTage, aktuelleWoche,
    isoWoche, wochenRahmen,
    alleEinheiten, sortieren, amTag, freiWaehlbar, einheit, ernaehrung, istErledigt, wochenZahlen,
    blockWochen, phaseVonNr, bereich, hauptBlock, intensitaet, segmente, zonenZeilen,
    dosis, dosisDetails, sport, WOCHEN_TYP, BLOCK_TYP, KATEGORIE, esc,
  };
})();
