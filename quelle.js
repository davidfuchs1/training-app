/* Datenschicht der Trainings-App.

   Zwei Quellen:
   - Demo:   öffentliche Testdaten aus plaene/demo/ (ohne Schlüssel)
   - GitHub: privates Plan-Repo plan-<id> über api.github.com mit dem
             Schlüssel (fine-grained Token), der nur auf diesem Gerät liegt.

   Plandaten werden immer frisch geladen; der Zwischenspeicher im Gerät dient
   nur als Rückfall ohne Verbindung. Status-Meldungen laufen über eine
   Warteschlange, damit auch ohne Empfang nichts verloren geht.
   Datenformat: docs/datenformat.md */
(function () {
  'use strict';

  const API = 'https://api.github.com';
  const BESITZER = 'davidfuchs1';
  const REPO_PRAEFIX = 'plan-';
  const STATUS_DATEI = 'status.json';
  const GEMELDETER_STATUS = ['erledigt', 'teilweise', 'ausgelassen'];

  const S_SCHLUESSEL = 'plan-schluessel';
  const S_AUSWAHL = 'plan-auswahl';
  const S_WARTESCHLANGE = 'plan-warteschlange';
  const S_CACHE = 'plan-cache-';

  const param = (name) => new URLSearchParams(location.search).get(name);
  const pad = (n) => String(n).padStart(2, '0');

  // ---------- Gerätespeicher ----------

  function speicherLesen(schluessel, standard = null) {
    try {
      const wert = localStorage.getItem(schluessel);
      return wert === null ? standard : JSON.parse(wert);
    } catch { return standard; }
  }

  function speicherSchreiben(schluessel, wert) {
    try {
      if (wert === null) localStorage.removeItem(schluessel);
      else localStorage.setItem(schluessel, JSON.stringify(wert));
      return true;
    } catch { return false; }
  }

  const schluessel = () => speicherLesen(S_SCHLUESSEL);
  const schluesselSetzen = (token) => speicherSchreiben(S_SCHLUESSEL, token);
  const auswahl = () => speicherLesen(S_AUSWAHL);
  const auswahlSetzen = (id) => speicherSchreiben(S_AUSWAHL, id);

  function abmelden() {
    speicherSchreiben(S_SCHLUESSEL, null);
    speicherSchreiben(S_AUSWAHL, null);
    speicherSchreiben(S_WARTESCHLANGE, null);
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(S_CACHE)) localStorage.removeItem(k);
    }
  }

  // Demo, solange kein Schlüssel eingetragen ist (oder ausdrücklich ?demo=1)
  const demoModus = () => param('demo') === '1' || !schluessel();

  // ---------- Fehlerarten ----------

  class ZugangFehler extends Error {} // Schlüssel ungültig, abgelaufen, widerrufen
  class NetzFehler extends Error {}   // keine Verbindung

  // ---------- GitHub ----------

  async function api(pfad, { methode = 'GET', body, roh = false } = {}) {
    let antwort;
    try {
      antwort = await fetch(`${API}${pfad}`, {
        method: methode,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${schluessel()}`,
          Accept: roh ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new NetzFehler('keine Verbindung');
    }
    if (antwort.status === 401 || antwort.status === 403) {
      throw new ZugangFehler('Schlüssel ungültig, abgelaufen oder widerrufen');
    }
    const text = await antwort.text();
    let daten = text;
    try { daten = JSON.parse(text); } catch { /* roher Text */ }
    return { status: antwort.status, daten };
  }

  const inhaltPfad = (id, datei) => `/repos/${BESITZER}/${REPO_PRAEFIX}${id}/contents/${datei}`;

  async function datei(id, name, { pflicht = true } = {}) {
    const antwort = await api(inhaltPfad(id, name), { roh: true });
    if (antwort.status === 404) {
      if (pflicht) throw new Error(`${name} fehlt im Plan-Repo`);
      return null;
    }
    if (antwort.status !== 200) throw new Error(`${name} nicht geladen (HTTP ${antwort.status})`);
    return antwort.daten;
  }

  // Pläne, für die der Schlüssel gilt: private Repos plan-*
  async function plaene() {
    const antwort = await api('/user/repos?per_page=100&sort=full_name');
    if (antwort.status !== 200) throw new Error(`Pläne nicht geladen (HTTP ${antwort.status})`);
    return antwort.daten
      .filter((r) => r.private && r.name.startsWith(REPO_PRAEFIX))
      .map((r) => r.name.slice(REPO_PRAEFIX.length));
  }

  // ---------- Öffentliche Dateien (Übungen, Demo) ----------

  const OEFFENTLICH = new URL('plaene/', new URL('.', document.currentScript.src));

  async function oeffentlich(pfad, { pflicht = true } = {}) {
    let antwort;
    try {
      antwort = await fetch(new URL(pfad, OEFFENTLICH), { cache: 'no-store' });
    } catch {
      throw new NetzFehler('keine Verbindung');
    }
    if (antwort.status === 404 && !pflicht) return null;
    if (!antwort.ok) throw new Error(`${pfad} nicht geladen (HTTP ${antwort.status})`);
    return antwort.json();
  }

  // ---------- Laden ----------

  const cacheLesen = (id) => speicherLesen(S_CACHE + id);
  const cacheSchreiben = (id, daten) => speicherSchreiben(S_CACHE + id, daten);

  async function ausGitHub(id) {
    const [athlet, aktuell, index, status] = await Promise.all([
      datei(id, 'athlet.json'),
      datei(id, 'aktuell.json'),
      datei(id, 'index.json'),
      datei(id, STATUS_DATEI, { pflicht: false }),
    ]);
    return { athlet, aktuell, index: index.wochen, statusDatei: (status && status.wochen) || {} };
  }

  async function ausDemo() {
    const [athleten, aktuell, index, status] = await Promise.all([
      oeffentlich('athleten.json'),
      oeffentlich('demo/aktuell.json'),
      oeffentlich('demo/index.json'),
      oeffentlich('demo/status.json', { pflicht: false }),
    ]);
    const athlet = athleten.athleten.find((a) => a.id === 'demo') || { id: 'demo', anzeigename: 'Demo' };
    return { athlet, aktuell, index: index.wochen, statusDatei: (status && status.wochen) || {} };
  }

  /* Plan laden. Ohne Verbindung greift der Zwischenspeicher (ausCache = true).
     Übungen kommen aus dem öffentlichen Repo und dürfen aus dem Cache des
     Service Workers kommen. */
  async function laden(id) {
    const demo = demoModus();
    let teile;
    let ausCache = false;
    try {
      teile = demo ? await ausDemo() : await ausGitHub(id);
      cacheSchreiben(demo ? 'demo' : id, teile);
    } catch (fehler) {
      const gespeichert = cacheLesen(demo ? 'demo' : id);
      if (!gespeichert || fehler instanceof ZugangFehler) throw fehler;
      teile = gespeichert;
      ausCache = true;
    }
    const uebungen = await oeffentlich('uebungen.json');

    for (const w of teile.aktuell.wochen) {
      for (const e of [...w.einheiten, ...w.mobility.einheiten]) e.planStatus = e.status;
    }
    return {
      id: teile.athlet.id,
      demo,
      ausCache,
      athlet: teile.athlet,
      uebungen: uebungen.uebungen,
      aktuell: teile.aktuell,
      index: teile.index,
      statusDatei: teile.statusDatei,
      geladen: new Date(),
    };
  }

  // Abgeschlossene Woche aus dem Archiv (datei laut index.json)
  const ladeWoche = (id, name) => (demoModus()
    ? oeffentlich(`demo/${name}`)
    : datei(id, name));

  // ---------- Status melden ----------

  const warteschlange = () => speicherLesen(S_WARTESCHLANGE, []) || [];
  const warteschlangeSetzen = (liste) => speicherSchreiben(S_WARTESCHLANGE, liste);

  // Offene Meldungen als Ebene {iso: {einheit: status}} – liegt über status.json
  function offeneEbene(id) {
    const ebene = {};
    for (const m of warteschlange()) {
      if (m.id !== id) continue;
      ebene[m.iso] = { ...(ebene[m.iso] || {}), [m.einheit]: m.status };
    }
    return ebene;
  }

  const offenFuer = (id, iso, einheit) =>
    warteschlange().some((m) => m.id === id && m.iso === iso && m.einheit === einheit);

  /* Meldung vormerken und sofort zu senden versuchen.
     status: 'erledigt' | 'teilweise' | 'ausgelassen' | 'geplant' (= zurücksetzen) */
  function melden(id, iso, einheit, status) {
    const liste = warteschlange().filter((m) => !(m.id === id && m.iso === iso && m.einheit === einheit));
    liste.push({ id, iso, einheit, status, zeit: new Date().toISOString() });
    warteschlangeSetzen(liste);
  }

  // Gemeldete Status über den Plan legen (status.json + offene Meldungen)
  function statusAnwenden(aktuell, ...ebenen) {
    for (const w of aktuell.wochen) {
      for (const e of [...w.einheiten, ...w.mobility.einheiten]) {
        const gemeldet = ebenen.reduce((wert, ebene) => {
          const woche = ebene && ebene[w.iso_woche];
          return woche && e.id in woche ? woche[e.id] : wert;
        }, undefined);
        e.status = gemeldet || e.planStatus;
      }
    }
  }

  const zeitpunkt = () => {
    const d = new Date();
    const v = -d.getTimezoneOffset();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T`
      + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      + `${v < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(v) / 60))}:${pad(Math.abs(v) % 60)}`;
  };

  const zuBase64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

  /* Warteschlange senden: status.json lesen, alle offenen Meldungen einbauen,
     zurückschreiben. Der sha schützt vor Überschreiben (zweites Gerät → 409).
     Wochen, die nicht mehr in aktuell.json stehen, entfernt die App dabei. */
  async function senden(id, aktuelleWochen) {
    const offen = warteschlange().filter((m) => m.id === id);
    if (!offen.length || demoModus()) return { gesendet: 0 };

    for (let versuch = 0; versuch < 2; versuch++) {
      const vorher = await api(inhaltPfad(id, STATUS_DATEI));
      const sha = vorher.status === 200 ? vorher.daten.sha : undefined;
      let doc = { format_version: 1, athlet: id, aktualisiert: null, wochen: {} };
      if (sha) {
        try { doc = JSON.parse(decodeURIComponent(escape(atob(vorher.daten.content.replace(/\n/g, ''))))); } catch { /* neu aufbauen */ }
      }
      const wochen = {};
      for (const [iso, eintraege] of Object.entries(doc.wochen || {})) {
        if (aktuelleWochen.includes(iso)) wochen[iso] = { ...eintraege };
      }
      for (const m of offen) {
        if (!aktuelleWochen.includes(m.iso)) continue;
        if (m.status === 'geplant') {
          if (wochen[m.iso]) delete wochen[m.iso][m.einheit];
        } else {
          wochen[m.iso] = { ...(wochen[m.iso] || {}), [m.einheit]: m.status };
        }
      }
      for (const iso of Object.keys(wochen)) {
        if (!Object.keys(wochen[iso]).length) delete wochen[iso];
      }
      const neu = { format_version: 1, athlet: id, aktualisiert: zeitpunkt(), wochen };

      const antwort = await api(inhaltPfad(id, STATUS_DATEI), {
        methode: 'PUT',
        body: {
          message: `Status ${offen.map((m) => `${m.iso} ${m.einheit} ${m.status}`).join(', ')}`,
          content: zuBase64(`${JSON.stringify(neu, null, 2)}\n`),
          ...(sha ? { sha } : {}),
        },
      });
      if (antwort.status === 200 || antwort.status === 201) {
        warteschlangeSetzen(warteschlange().filter((m) => m.id !== id));
        return { gesendet: offen.length, wochen };
      }
      if (antwort.status !== 409) { // 409 = jemand anderes war schneller → neu lesen
        throw new Error(`Status nicht gespeichert (HTTP ${antwort.status})`);
      }
    }
    throw new Error('Status nicht gespeichert (gleichzeitige Änderung)');
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

  function bereich(b, einheitText) {
    if (!b) return null;
    const [von, bis] = b;
    const e = einheitText ? ` ${einheitText}` : '';
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

  // Absolute Werte eines Blocks; fehlende Werte kommen aus der Zonentabelle
  function intensitaet(block, sportart, zonen) {
    const z = block.zone;
    const tabelle = zonen || {};
    const werte = [];
    const hinzu = (feld, einheitText) => {
      const eigen = block[feld];
      const wert = eigen || (z && tabelle[feld] && tabelle[feld][z]);
      if (wert) werte.push({ feld, text: bereich(wert, einheitText), abgeleitet: !eigen });
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
    eingewoehnung: 'Eingewöhnung', grundlage: 'Grundlage', aufbau: 'Aufbau', entlastung: 'Entlastung',
    peak: 'Peak', taper: 'Taper', wettkampf: 'Wettkampf', pause: 'Pause',
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

  window.Plan = {
    // Zugang und Daten
    schluessel, schluesselSetzen, abmelden, demoModus, auswahl, auswahlSetzen,
    plaene, laden, ladeWoche, ZugangFehler, NetzFehler,
    // Status melden
    GEMELDETER_STATUS, melden, senden, warteschlange, offeneEbene, offenFuer, statusAnwenden,
    // Darstellung
    TAGE_KURZ, TAGE_LANG, MONATE, datum, iso, plusTage, tageZwischen, wochentag, heute,
    fmtTag, fmtZeitraum, fmtZeitpunkt, fmtUhrzeit, fmtDauer, kw, wochenTage, aktuelleWoche,
    isoWoche, wochenRahmen,
    alleEinheiten, sortieren, amTag, einheit, ernaehrung, istErledigt, wochenZahlen,
    blockWochen, phaseVonNr, bereich, hauptBlock, intensitaet, segmente, zonenZeilen,
    dosis, dosisDetails, sport, WOCHEN_TYP, BLOCK_TYP, KATEGORIE, esc,
  };
})();
