/* Trainings-App: Plan ansehen und Einheiten als erledigt melden.
   Daten und GitHub-Zugriff: quelle.js. Datenformat: docs/datenformat.md */
'use strict';

const D = window.Plan;
const esc = D.esc;

const inhalt = document.getElementById('inhalt');
const topbar = document.getElementById('topbar');
const tabs = document.getElementById('tabs');
const sheet = document.getElementById('sheet');
const sheetInhalt = document.getElementById('sheet-inhalt');
const toast = document.getElementById('toast');
const ziehen = document.getElementById('ziehen');
const wartetChip = document.getElementById('wartet');

let daten = null;
let plaeneListe = [];
let zugangFehler = false;   // Schlüssel abgelaufen oder widerrufen
let sendetGerade = false;
let letzteAdresse = '#heute'; // Seite vor einer Einheit (inkl. Tag/Woche) für „Zurück“
let letzterTab = 'heute';
const scrollStand = new Map();
const archiv = new Map(); // Wochen-Nr → Woche | 'laedt' | Error

const imHomeBildschirm = () => window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;
const istIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Weiche Kante oben nur, wenn nicht ganz oben (siehe .oberkante::after in stil.css)
const scrollZustand = () => document.body.classList.toggle('gescrollt', window.scrollY > 2);
window.addEventListener('scroll', scrollZustand, { passive: true });

// ---------- Start ----------

async function start() {
  // Beim Öffnen immer auf heute, auch wenn zuletzt ein anderer Tag angesehen wurde
  if (location.hash.startsWith('#heute/')) history.replaceState(null, '', `${location.pathname}${location.search}#heute`);
  if (!D.schluessel() && !D.demoModus()) return zugangZeigen();
  if (!D.schluessel() && D.demoModus() && new URLSearchParams(location.search).get('demo') !== '1') return zugangZeigen();
  await planLaden();
}

function zugangZeigen(art) {
  tabs.hidden = true;
  topbar.hidden = true;
  wartetChip.hidden = true;
  inhalt.innerHTML = seiteZugang(art || (istIOS() && !imHomeBildschirm() ? 'safari' : 'einrichten'));
}

async function planLaden() {
  tabs.hidden = false;
  inhalt.innerHTML = '<p class="laden">Lade Plan …</p>';
  try {
    if (!D.demoModus()) {
      plaeneListe = await D.plaene();
      if (!plaeneListe.length) throw new Error('Für diesen Schlüssel ist kein Plan freigegeben.');
      const gewaehlt = plaeneListe.includes(D.auswahl()) ? D.auswahl() : plaeneListe[0];
      D.auswahlSetzen(gewaehlt);
    }
    daten = await D.laden(D.auswahl() || 'demo');
    zugangFehler = false;
    statusAnwenden();
    zeichnen();
    sendenVersuchen();
  } catch (fehler) {
    if (fehler instanceof D.ZugangFehler) {
      zugangFehler = true;
      return zugangZeigen('abgelaufen');
    }
    inhalt.innerHTML = `<div class="karte fehler"><h2>Plan nicht geladen</h2><p>${esc(fehler.message)}</p></div>`;
  }
}

async function neuLaden() {
  try {
    daten = await D.laden(daten.id);
    statusAnwenden();
    archiv.clear();
    zeichnen(false);
    zeigeToast(daten.ausCache ? 'Keine Verbindung – alter Stand' : `Aktualisiert um ${D.fmtUhrzeit(daten.geladen)}`);
    sendenVersuchen();
  } catch (fehler) {
    if (fehler instanceof D.ZugangFehler) { zugangFehler = true; zeichnen(false); }
    zeigeToast('Keine Verbindung – alter Stand bleibt');
  }
}

const statusAnwenden = () => D.statusAnwenden(daten.aktuell, daten.statusDatei, D.offeneEbene(daten.id));

// Woche nach Nummer: aus aktuell.json, aus dem Archiv (lädt bei Bedarf nach) oder leer
function wocheNachNr(nr) {
  const aktuell = daten.aktuell.wochen.find((w) => w.nr === nr);
  if (aktuell) return { woche: aktuell, quelle: 'aktuell' };

  const eintrag = daten.index.find((x) => x.nr === nr);
  if (!eintrag || eintrag.datei === 'aktuell.json') return { woche: null, quelle: 'leer' };

  const gespeichert = archiv.get(nr);
  if (gespeichert instanceof Error) return { woche: null, quelle: 'fehler' };
  if (gespeichert && gespeichert !== 'laedt') return { woche: gespeichert, quelle: 'archiv' };
  if (!gespeichert) {
    archiv.set(nr, 'laedt');
    D.ladeWoche(daten.id, eintrag.datei)
      .then((w) => archiv.set(nr, w))
      .catch((f) => archiv.set(nr, f))
      .finally(() => zeichnen(false));
  }
  return { woche: null, quelle: 'laedt' };
}

// Nummer der Blockwoche, in die ein Datum fällt (kann < 1 oder > Blocklänge sein)
function nrFuerTag(tag) {
  const montag1 = D.plusTage(daten.aktuell.block.start, -D.wochentag(daten.aktuell.block.start));
  return Math.floor(D.tageZwischen(montag1, tag) / 7) + 1;
}

// Woche zu einem Datum; außerhalb des Blocks „leer“ ohne Rahmen
function wocheFuerTag(tag) {
  const nr = nrFuerTag(tag);
  const block = daten.aktuell.block;
  if (nr < 1 || nr > D.blockWochen(block)) return { woche: null, quelle: 'leer', rahmen: null, nr };
  const { woche, quelle } = wocheNachNr(nr);
  return { woche, quelle, rahmen: woche || D.wochenRahmen(block, nr), nr };
}

const nrJetzt = () => daten.aktuell.wochen[D.aktuelleWoche(daten.aktuell, D.heute())].nr;

function zeichnen(nachOben = true) {
  if (!daten) return;
  const [seite = 'heute', ...teile] = location.hash.slice(1).split('/');
  const seiten = { heute: seiteHeute, woche: seiteWoche, uebungen: seiteUebungen, block: seiteBlock };

  if (seite === 'einheit') {
    inhalt.innerHTML = seiteEinheit(Number(teile[0]), teile[1]);
  } else {
    letzterTab = seiten[seite] ? seite : 'heute';
    letzteAdresse = location.hash || '#heute';
    inhalt.innerHTML = seiten[letzterTab](teile);
  }
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('aktiv', a.dataset.tab === letzterTab));
  topbarZeichnen(seite === 'einheit');
  if (nachOben) window.scrollTo(0, 0);
}

// Kopfleiste: nur „Zurück“ und – wenn der Schlüssel für mehrere Pläne gilt – die Planauswahl
function topbarZeichnen(unterseite) {
  const teile = [];
  if (unterseite) teile.push(`<a class="knopf zurueck" href="${esc(letzteAdresse)}">‹ Zurück</a>`);
  else if (plaeneListe.length > 1) {
    teile.push(`<button class="knopf athlet" data-aktion="athlet">${esc(daten.athlet.anzeigename)} <span>· Plan wählen ▾</span></button>`);
  }
  topbar.hidden = !teile.length;
  topbar.innerHTML = teile.join('');
  const wartend = daten.demo ? 0 : D.warteschlange().filter((m) => m.id === daten.id).length;
  wartetChip.hidden = !wartend || sendetGerade;
  wartetChip.textContent = `${wartend} Meldung${wartend === 1 ? '' : 'en'} wartet auf Verbindung`;
}

// ---------- Bausteine ----------

const typBadge = (w) => `<span class="typ wt-${w.typ}">${esc(w.phase)}</span>`;

const STATUS_TEXT = { erledigt: 'erledigt', teilweise: 'teilweise', ausgelassen: 'ausgelassen' };

function artText(e) {
  if (e.art === 'mobility') return 'Mobility & Core';
  return e.pflicht ? 'Pflicht' : 'Optional';
}

function artBadge(e) {
  const klasse = e.art === 'mobility' ? 'mob' : e.pflicht ? 'pflicht' : 'optional';
  return `<span class="art art-${klasse}">${artText(e)}</span>`;
}

// Punkt für eine Einheit: Sportfarbe, Pflicht gefüllt, Status als Form
function punkt(e, groesse = '') {
  return `<i class="p ${groesse} sp-${e.sportart} ${e.pflicht ? 'voll' : ''} st-${e.status}"></i>`;
}

const ZONEN_HOEHE = { Z1: 30, Z2: 48, Z3: 66, Z4: 84, Z5: 100 };

function diagramm(e, gross = false) {
  const seg = D.segmente(e);
  const summe = seg.reduce((s, x) => s + x.min, 0);
  const balken = seg.map((s) =>
    `<span class="seg z-${s.zone || 'x'} seg-${s.typ}" style="flex:${s.min} 0 0;height:${ZONEN_HOEHE[s.zone] || 22}%"
       title="${s.min} min ${s.zone || ''}"></span>`).join('');
  return `<div class="diagramm ${gross ? 'gross' : ''}">${balken}</div>
    ${gross ? `<div class="achse"><span>0</span><span>${D.fmtDauer(Math.round(summe / 2))}</span><span>${D.fmtDauer(summe)}</span></div>` : ''}`;
}

const zeigeDiagramm = (e) => e.bloecke && e.bloecke.length > 1;

function kernwerte(e) {
  const hb = D.hauptBlock(e);
  if (hb) {
    const int = D.intensitaet(hb, e.sportart, daten.aktuell.zonen);
    return `<div class="chips">
      ${int.zone ? `<span class="chip zone z-${int.zone}">${int.zone}</span>` : ''}
      ${int.werte.map((v) => `<span class="chip">${esc(v.text)}</span>`).join('')}
    </div>`;
  }
  if (e.uebungen) {
    const saetze = Math.max(...e.uebungen.map((u) => u.saetze || 1));
    return `<div class="chips"><span class="chip">${e.uebungen.length} Übungen</span>${saetze > 1 ? `<span class="chip">bis ${saetze} Sätze</span>` : ''}</div>`;
  }
  return '';
}

function karteGross(e, nr) {
  const sp = D.sport(e.sportart);
  return `<div class="karte-rahmen sp-${e.sportart}">${karteGrossLink(e, nr, sp, statusMarke(e, nr))}</div>`;
}

function karteGrossLink(e, nr, sp, marke) {
  return `<a class="karte gross sp-${e.sportart} ${e.status === 'ausgelassen' ? 'ist-ausgelassen' : ''}" href="#einheit/${nr}/${e.id}">
    <div class="karte-kopf">
      <span class="icon">${sp.icon}</span>
      ${e.art === 'mobility' ? '' : `<span class="sp-name">${esc(sp.name)}</span>`}
      ${artBadge(e)}
      <span class="dauer">${D.fmtDauer(e.dauer_min)}</span>
    </div>
    <h3>${esc(e.titel)}</h3>
    ${e.ziel ? `<p class="ziel">${esc(e.ziel)}</p>` : ''}
    ${zeigeDiagramm(e) ? diagramm(e) : ''}
    ${kernwerte(e)}
    <div class="karte-fuss"><span class="mehr">Details ›</span>${marke}</div>
  </a>`;
}

function zeileKompakt(e, nr) {
  const hb = D.hauptBlock(e);
  const zone = hb && hb.zone ? ` · ${hb.zone}` : '';
  const status = STATUS_TEXT[e.status] ? ` · <span class="status">${STATUS_TEXT[e.status]}</span>` : '';
  return `<a class="zeile sp-${e.sportart} ${e.status === 'ausgelassen' ? 'ist-ausgelassen' : ''}" href="#einheit/${nr}/${e.id}">
    ${punkt(e, 'gross')}
    <span class="zeile-text"><b>${esc(e.titel)}</b><small>${artText(e)} · ${D.fmtDauer(e.dauer_min)}${zone}${status}</small></span>
    <span class="pfeil-rechts">›</span>
  </a>`;
}

// Ernährungshinweise eines Tages, direkt unter dessen Einheiten
function ernaehrungAmTag(w, tag) {
  return D.ernaehrung(w, tag).map((h) => `<p class="essen-klein">🍝 ${esc(h.text)}</p>`).join('');
}

function zaehler(label, ist, soll) {
  const punkte = Array.from({ length: soll }, (_, i) => `<i class="${i < ist ? 'voll' : ''}"></i>`).join('');
  return `<div class="zaehler"><div class="punkte">${punkte}</div><b>${ist}<small>/${soll}</small></b><span>${label}</span></div>`;
}

// ---------- Seite: Heute (ein Tag, mit ‹ › blätterbar) ----------

// Blätterbereich: Blockzeitraum, mindestens aber bis heute
function tagesGrenzen() {
  const { start, ende } = daten.aktuell.block;
  const heute = D.heute();
  return { min: heute < start ? heute : start, max: heute > ende ? heute : ende };
}

function tagUeberschrift(tag, heute) {
  const abstand = D.tageZwischen(heute, tag);
  if (abstand === 0) return 'Heute';
  if (abstand === -1) return 'Gestern';
  if (abstand === 1) return 'Morgen';
  return D.TAGE_LANG[D.wochentag(tag)];
}

// Einheiten eines Tages als kompakte Zeilen (für „Als Nächstes“)
function tagKompakt(tag) {
  const { woche, quelle, rahmen } = wocheFuerTag(tag);
  let rechts;
  if (quelle === 'laedt') rechts = `<p class="leise klein">lädt …</p>`;
  else if (!woche) rechts = `<p class="leise klein">noch nicht geplant</p>`;
  else if (tag < rahmen.start || tag > rahmen.ende) rechts = `<p class="leise klein">außerhalb des Blocks</p>`;
  else {
    const liste = D.amTag(woche, tag);
    rechts = liste.length
      ? liste.map((e) => zeileKompakt(e, woche.nr)).join('') + ernaehrungAmTag(woche, tag)
      : `<p class="leise klein">Ruhetag</p>`;
  }
  return `<div class="tag-gruppe">
    <a class="tag-label" href="#heute/${tag}"><b>${D.TAGE_KURZ[D.wochentag(tag)]}</b><span>${D.datum(tag).getDate()}.</span></a>
    <div class="tag-liste">${rechts}</div>
  </div>`;
}

function seiteHeute(teile) {
  const heute = D.heute();
  const grenzen = tagesGrenzen();
  const gewuenscht = /^\d{4}-\d{2}-\d{2}$/.test(teile[0] || '') ? teile[0] : heute;
  const tag = gewuenscht < grenzen.min ? grenzen.min : gewuenscht > grenzen.max ? grenzen.max : gewuenscht;
  const block = daten.aktuell.block;
  const n = D.blockWochen(block);
  const { woche: w, quelle, rahmen, nr } = wocheFuerTag(tag);

  const vorher = D.plusTage(tag, -1);
  const nachher = D.plusTage(tag, 1);
  const pfeil = (ziel, zeichen, name, aus) => (aus
    ? `<span class="pfeil aus" aria-hidden="true">${zeichen}</span>`
    : `<a class="pfeil" href="#heute/${ziel}" aria-label="${name}">${zeichen}</a>`);
  const wocheInfo = rahmen
    ? `KW ${D.kw(rahmen)} · Woche ${nr} von ${n}${rahmen.phase ? ` · ${typBadge(rahmen)}` : ''}`
    : 'außerhalb des Blocks';

  let html = hinweisBanner();
  html += `<section class="wochen-nav tag-nav">
      ${pfeil(vorher, '‹', 'Vorheriger Tag', vorher < grenzen.min)}
      <div class="kw">
        <p class="ueber">${D.TAGE_LANG[D.wochentag(tag)]}, ${D.fmtTag(tag)}</p>
        <h1>${tagUeberschrift(tag, heute)}</h1>
        <p class="tag-info">${wocheInfo}</p>
      </div>
      ${pfeil(nachher, '›', 'Nächster Tag', nachher > grenzen.max)}
    </section>
    ${tag !== heute ? `<div class="heute-leiste"><a class="heute-knopf" href="#heute">Zurück zu heute</a></div>` : ''}`;

  if (quelle === 'laedt') return `${html}<p class="laden">Lade Tag …</p>`;
  if (quelle === 'fehler') return `${html}<div class="karte fehler"><h2>Woche nicht geladen</h2></div>`;

  if (!w) {
    html += `<div class="karte leer-woche">
      <h2>Bisher kein Training geplant</h2>
      <p class="leise">Der Plan für diese Woche entsteht beim Wochen-Check.</p>
    </div>`;
  } else if (tag < rahmen.start || tag > rahmen.ende) {
    html += `<div class="karte ruhetag"><p class="ueber">Kein Plantag</p><h3>Außerhalb des Blocks</h3></div>`;
  } else {
    const liste = D.amTag(w, tag);
    html += liste.length
      ? liste.map((e) => karteGross(e, w.nr)).join('')
      : `<div class="karte ruhetag">
          <p class="ueber">Kein Training</p>
          <h3>Ruhetag</h3>
          <p class="leise">Erholung gehört zum Plan.</p>
        </div>`;
    html += ernaehrungAmTag(w, tag);
    if (w.notiz_coach) {
      html += `<div class="hinweis coach"><span class="ueber">Coach</span>${esc(w.notiz_coach)}</div>`;
    }
    const z = D.wochenZahlen(w);
    html += `<h2 class="abschnitt">${nr === nrJetzt() ? 'Diese Woche' : `KW ${D.kw(w)}`} <a href="#woche/${nr}">Plan ›</a></h2>
      <div class="karte fortschritt">
        ${zaehler('Pflicht', z.pflichtErledigt, z.pflicht)}
        ${zaehler('Optional', z.optionalErledigt, z.optional)}
        ${zaehler('Mobility', z.mobilityErledigt, z.mobilitySoll)}
      </div>`;
  }

  html += `<h2 class="abschnitt">Als Nächstes</h2>`;
  html += [1, 2].map((i) => tagKompakt(D.plusTage(tag, i))).join('');
  return html;
}

// ---------- Seite: Woche ----------

function seiteWoche(teile) {
  const heute = D.heute();
  const block = daten.aktuell.block;
  const n = D.blockWochen(block);
  const jetzt = nrJetzt();
  const nr = Math.min(n, Math.max(1, Number(teile[0]) || jetzt));
  const { woche: w, quelle } = wocheNachNr(nr);
  const rahmen = w || D.wochenRahmen(block, nr);

  const label = nr === jetzt ? 'Diese Woche'
    : nr === jetzt + 1 ? 'Nächste Woche'
      : nr < jetzt ? 'Abgeschlossen' : 'Noch nicht geplant';

  const pfeil = (ziel, zeichen, name) => (ziel < 1 || ziel > n
    ? `<span class="pfeil aus" aria-hidden="true">${zeichen}</span>`
    : `<a class="pfeil" href="#woche/${ziel}" aria-label="${name}">${zeichen}</a>`);

  const tage = D.wochenTage(rahmen);
  const kalender = tage.map((t) => {
    const liste = w ? D.amTag(w, t.datum) : [];
    const klickbar = w && t.imPlan;
    return `<button class="kal-tag ${t.datum === heute ? 'ist-heute' : ''} ${t.imPlan ? '' : 'aussen'}"
        ${klickbar ? `data-aktion="zu-tag" data-tag="${t.datum}"` : 'disabled'}>
      <span>${D.TAGE_KURZ[t.index]}</span>
      <b>${D.datum(t.datum).getDate()}</b>
      <i>${liste.map((e) => punkt(e, 'klein')).join('')}</i>
    </button>`;
  }).join('');

  const html = `<section class="wochen-nav">
      ${pfeil(nr - 1, '‹', 'Vorherige Woche')}
      <div class="kw">
        <p class="ueber">${label}</p>
        <h1>KW ${D.kw(rahmen)}</h1>
        <p>${D.fmtZeitraum(rahmen.start, rahmen.ende)} · Woche ${nr} von ${n}</p>
      </div>
      ${pfeil(nr + 1, '›', 'Nächste Woche')}
    </section>
    <div class="kalender">${kalender}</div>
    <p class="kal-legende" ${quelle === 'leer' ? 'hidden' : ''}>${quelle === 'archiv'
      ? `<span><i class="p klein sp-kraft st-erledigt"></i>erledigt</span>
         <span><i class="p klein sp-kraft st-teilweise"></i>teilweise</span>
         <span><i class="p klein sp-kraft st-ausgelassen"></i>ausgelassen</span>`
      : `<span><i class="p klein voll sp-kraft"></i>Pflicht</span>
         <span><i class="p klein sp-kraft"></i>optional</span>`}
    </p>`;

  if (quelle === 'laedt') return `${html}<p class="laden">Lade Woche …</p>`;
  if (quelle === 'fehler') return `${html}<div class="karte fehler"><h2>Woche nicht geladen</h2></div>`;
  if (quelle === 'leer') {
    return `${html}<div class="karte leer-woche">
      <p class="ueber">${rahmen.phase ? typBadge(rahmen) : ''}</p>
      <h2>Bisher kein Training geplant</h2>
      <p class="leise">Der Plan für diese Woche entsteht beim Wochen-Check.</p>
    </div>`;
  }

  const z = D.wochenZahlen(w);
  const mitStatus = quelle === 'archiv';
  const zahl = (ist, soll) => (mitStatus ? `${ist}<small>/${soll}</small>` : soll);

  const tagesListe = tage.map((t) => {
    const liste = D.amTag(w, t.datum);
    let rechts;
    if (!t.imPlan) rechts = `<p class="leise klein">außerhalb des Blocks</p>`;
    else if (!liste.length) rechts = `<p class="leise klein">Ruhetag</p>`;
    else rechts = liste.map((e) => zeileKompakt(e, nr)).join('');
    rechts += ernaehrungAmTag(w, t.datum);
    return `<div class="tag-gruppe ${t.datum === heute ? 'ist-heute' : ''} ${t.imPlan ? '' : 'aussen'}" id="tag-${t.datum}">
      <div class="tag-label"><b>${D.TAGE_KURZ[t.index]}</b><span>${D.datum(t.datum).getDate()}.</span></div>
      <div class="tag-liste">${rechts}</div>
    </div>`;
  }).join('');


  return `${html}
    <div class="karte wochenkopf">
      <p class="ueber">${typBadge(w)}</p>
      <h2>${esc(w.fokus)}</h2>
      <div class="kennzahlen">
        <div><b>${D.fmtDauer(z.minuten)}</b><span>geplant</span></div>
        <div><b>${zahl(z.pflichtErledigt, z.pflicht)}</b><span>Pflicht</span></div>
        <div><b>${zahl(z.optionalErledigt, z.optional)}</b><span>Optional</span></div>
        <div><b>${mitStatus ? zahl(z.mobilityErledigt, z.mobilitySoll) : `${z.mobilitySoll}×`}</b><span>Mobility</span></div>
      </div>
    </div>
    ${w.notiz_coach ? `<div class="hinweis coach"><span class="ueber">Coach</span>${esc(w.notiz_coach)}</div>` : ''}
    <h2 class="abschnitt">Tage</h2>
    ${tagesListe}`;
}

// ---------- Seite: Einheit ----------

function seiteEinheit(nr, id) {
  const { woche: w, quelle } = wocheNachNr(nr);
  if (quelle === 'laedt') return `<p class="laden">Lade Einheit …</p>`;
  const e = w && D.einheit(w, id);
  if (!e) return `<div class="karte fehler"><h2>Einheit nicht gefunden</h2></div>`;
  const sp = D.sport(e.sportart);
  const zonen = daten.aktuell.zonen;

  let html = `<section class="einheit-kopf sp-${e.sportart} ${e.status === 'ausgelassen' ? 'ist-ausgelassen' : ''}">
    <p class="ueber">${sp.icon} ${e.art === 'mobility' ? '' : `${esc(sp.name)} · `}${artBadge(e)}
      ${STATUS_TEXT[e.status] ? `${punkt(e)}<span class="status">${STATUS_TEXT[e.status]}</span>` : ''}</p>
    <h1>${esc(e.titel)}</h1>
    <p class="unter">${D.TAGE_LANG[D.wochentag(e.tag_vorschlag)]}, ${D.fmtTag(e.tag_vorschlag)} · ${D.fmtDauer(e.dauer_min)}</p>
    ${e.ziel ? `<p class="ziel">${esc(e.ziel)}</p>` : ''}
  </section>
  ${statusWahl(e, nr, quelle)}`;

  if (zeigeDiagramm(e)) {
    html += `<div class="karte">${diagramm(e, true)}
      <div class="legende">${['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((z) => `<span><i class="z-${z}"></i>${z}</span>`).join('')}</div>
    </div>`;
  }

  if (e.bloecke && e.bloecke.length) {
    html += `<h2 class="abschnitt">Ablauf</h2>`;
    html += e.bloecke.map((b) => {
      const int = D.intensitaet(b, e.sportart, zonen);
      const dauer = b.typ === 'intervall' ? `${b.wiederholungen} × ${b.dauer_min} min` : D.fmtDauer(b.dauer_min);
      return `<div class="block z-rand-${b.zone || 'x'}">
        <div class="block-kopf"><b>${D.BLOCK_TYP[b.typ] || b.typ}</b><span>${dauer}</span></div>
        <div class="chips">
          ${b.zone ? `<span class="chip zone z-${b.zone}">${b.zone}</span>` : ''}
          ${int.werte.map((v) => `<span class="chip ${v.abgeleitet ? 'abgeleitet' : ''}">${esc(v.text)}</span>`).join('')}
        </div>
        ${b.beschreibung ? `<p>${esc(b.beschreibung)}</p>` : ''}
        ${b.pause ? `<p class="pause">Pause ${b.pause.dauer_min} min${b.pause.zone ? ` · ${b.pause.zone}` : ''}${b.pause.beschreibung ? ` – ${esc(b.pause.beschreibung)}` : ''}</p>` : ''}
      </div>`;
    }).join('');
  }

  if (e.uebungen && e.uebungen.length) {
    html += `<h2 class="abschnitt">Übungen <small>${e.uebungen.length}</small></h2><div class="karte liste">`;
    html += e.uebungen.map((r, i) => {
      const u = daten.uebungen[r.id] || { name: r.id, kategorie: '' };
      const details = [D.dosis(r), ...D.dosisDetails(r)].join(' · ');
      return `<button class="uebung-zeile" data-aktion="uebung" data-id="${r.id}" data-nr="${nr}" data-e="${e.id}" data-i="${i}">
        <span class="nr">${i + 1}</span>
        <span class="zeile-text"><b>${esc(u.name)}</b><small>${esc(details)}</small>${r.hinweis ? `<small class="akzent">${esc(r.hinweis)}</small>` : ''}</span>
        <span class="pfeil-rechts">›</span>
      </button>`;
    }).join('');
    html += `</div>`;
  }

  if (e.alternativen && e.alternativen.length) {
    html += `<section class="alternative-bereich">
      <h2 class="abschnitt">Alternative</h2>
      <div class="alternativen einspaltig">${e.alternativen.map((a) => `<div class="alternativ-karte">
        <small>${esc(a.titel)}</small><p>${esc(a.beschreibung)}</p>
      </div>`).join('')}</div>
    </section>`;
  }
  return html;
}

// ---------- Seite: Übungen ----------

function seiteUebungen(teile) {
  const kat = teile[0] || 'alle';
  const w = daten.aktuell.wochen[D.aktuelleWoche(daten.aktuell, D.heute())];
  const dieseWoche = new Set(D.alleEinheiten(w).flatMap((e) => (e.uebungen || []).map((u) => u.id)));

  const eintraege = Object.entries(daten.uebungen);
  const kategorien = [...new Set(eintraege.map(([, u]) => u.kategorie))];
  const chips = ['alle', ...kategorien].map((k) =>
    `<a href="#uebungen/${k}" class="filter ${k === kat ? 'aktiv' : ''}">${k === 'alle' ? 'Alle' : D.KATEGORIE[k] || k}</a>`).join('');

  const liste = eintraege
    .filter(([, u]) => kat === 'alle' || u.kategorie === kat)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'de'))
    .map(([id, u]) => {
      const suche = [u.name, ...(u.zielmuskeln || []), ...(u.equipment || [])].join(' ').toLowerCase();
      return `<button class="uebung-zeile" data-aktion="uebung" data-id="${id}" data-suche="${esc(suche)}">
        <span class="kat-punkt kat-${u.kategorie}"></span>
        <span class="zeile-text"><b>${esc(u.name)}</b><small>${D.KATEGORIE[u.kategorie] || u.kategorie} · ${u.equipment.length ? esc(u.equipment.join(', ')) : 'ohne Geräte'}</small></span>
        ${dieseWoche.has(id) ? '<span class="marke">diese Woche</span>' : '<span class="pfeil-rechts">›</span>'}
      </button>`;
    }).join('');

  return `<section class="titel"><h1>Übungen</h1></section>
    <input class="suche" type="search" placeholder="Übung, Muskel oder Gerät suchen" data-aktion="suche">
    <div class="filterleiste">${chips}</div>
    <div class="karte liste" id="uebungsliste">${liste}</div>`;
}

// ---------- Seite: Block ----------

function seiteBlock() {
  const a = daten.aktuell;
  const block = a.block;
  const heute = D.heute();
  const n = D.blockWochen(block);
  const jetzt = nrJetzt();
  const bisZiel = D.tageZwischen(heute, block.zieldatum);
  const maxMin = Math.max(...daten.index.map((x) => x.geplant_min), 1);

  const phasenBalken = Array.from({ length: n }, (_, i) => {
    const p = D.phaseVonNr(block, i + 1);
    return `<span class="wt-${p ? p.typ : ''} ${i + 1 === jetzt ? 'jetzt' : ''} ${i + 1 < jetzt ? 'vorbei' : ''}"></span>`;
  }).join('');

  const zeilen = Array.from({ length: n }, (_, i) => {
    const nr = i + 1;
    const p = D.phaseVonNr(block, nr);
    const x = daten.index.find((y) => y.nr === nr);
    const rahmen = x || D.wochenRahmen(block, nr);
    const umfang = x
      ? `<div class="umfang"><span style="width:${(x.geplant_min / maxMin) * 100}%">${x.erledigt ? `<i style="width:${Math.min(100, (x.erledigt.minuten / x.geplant_min) * 100)}%"></i>` : ''}</span></div>`
      : '';
    const wert = x
      ? (x.erledigt ? `${x.erledigt.minuten}<small>/${x.geplant_min} min</small>` : `${x.geplant_min}<small> min</small>`)
      : '<small>noch offen</small>';
    const mob = x && x.erledigt ? `<small>Mobility ${x.erledigt.mobility}/${x.mobility_soll}</small>` : '';
    return `<a class="woche-zeile ${nr === jetzt ? 'jetzt' : ''} ${x ? x.status : 'offen'}" href="#woche/${nr}">
      <span class="wnr typ-flaeche wt-${p ? p.typ : ''}">${nr}</span>
      <span class="wtext"><b>${esc(p ? p.name : '')}</b><small>KW ${D.kw(rahmen)} · ${D.fmtZeitraum(rahmen.start, rahmen.ende)}</small>${umfang}</span>
      <span class="wwert">${wert}${mob}</span>
    </a>`;
  }).join('');

  const zonen = D.zonenZeilen(a.zonen).map((z) =>
    `<tr><td><span class="chip zone z-${z.zone}">${z.zone}</span></td><td>${z.hf || '–'}</td><td>${z.leistung_w || '–'}</td><td>${z.pace || '–'}</td></tr>`).join('');

  return `<section class="titel">
      <p class="ueber">Trainingsblock</p>
      <h1>${esc(block.name)}</h1>
      <p class="unter">${esc(block.ziel)}</p>
    </section>
    <div class="karte countdown">
      <div><b>${Math.max(bisZiel, 0)}</b><span>Tage bis ${D.fmtTag(block.zieldatum)}</span></div>
      <div><b>${jetzt}<small>/${n}</small></b><span>Woche</span></div>
    </div>
    <div class="karte">
      <div class="phasen">${phasenBalken}</div>
      <div class="phasen-legende">${block.phasen.map((p) => `<span class="wt-${p.typ}"><i></i>${esc(p.name)}</span>`).join('')}</div>
    </div>
    <h2 class="abschnitt">Wochen</h2>
    <div class="karte liste">${zeilen}</div>
    <h2 class="abschnitt">Zonen <small>Stand ${esc(a.zonen.stand || '')}</small></h2>
    <div class="karte tabelle-rahmen"><table class="zonen">
      <thead><tr><th></th><th>HF</th><th>Rad</th><th>Lauf</th></tr></thead><tbody>${zonen}</tbody>
    </table></div>
    ${zugangDetails()}`;
}

// ---------- Übungs-Blatt ----------

function blattOeffnen(html) {
  sheetInhalt.innerHTML = `<div class="griff"></div><button class="knopf-rund zu" data-aktion="zu" aria-label="Schließen">✕</button>${html}`;
  sheet.hidden = false;
  document.body.classList.add('gesperrt');
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('offen')));
  sheetInhalt.scrollTop = 0;
}

function blattSchliessen() {
  sheet.classList.remove('offen');
  document.body.classList.remove('gesperrt');
  setTimeout(() => { sheet.hidden = true; }, 250);
}

function uebungZeigen(id, ref) {
  const u = daten.uebungen[id];
  if (!u) return;
  const liste = (titel, eintraege, klasse = '') => (eintraege && eintraege.length
    ? `<h3>${titel}</h3><ul class="${klasse}">${eintraege.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const alternative = (label, aid) => (aid && daten.uebungen[aid]
    ? `<button class="alternativ-karte" data-aktion="uebung" data-id="${aid}"><small>${label}</small>${esc(daten.uebungen[aid].name)} ›</button>` : '');

  let dosis = '';
  if (ref) {
    dosis = `<div class="dosis"><b>${esc(D.dosis(ref))}</b>${D.dosisDetails(ref).map((d) => `<span>${esc(d)}</span>`).join('')}
      ${ref.hinweis ? `<p>${esc(ref.hinweis)}</p>` : ''}</div>`;
  } else if (u.standard) {
    dosis = `<div class="dosis leise"><span>Standard</span><b>${esc(D.dosis(u.standard))}</b></div>`;
  }

  blattOeffnen(`
    <p class="ueber"><span class="kat-punkt kat-${u.kategorie}"></span>${D.KATEGORIE[u.kategorie] || u.kategorie}</p>
    <h2>${esc(u.name)}</h2>
    ${dosis}
    <div class="chips">
      ${(u.equipment.length ? u.equipment : ['ohne Geräte']).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}
      ${(u.zielmuskeln || []).map((x) => `<span class="chip leise">${esc(x)}</span>`).join('')}
    </div>
    <h3>Ablauf</h3>
    <ol class="ablauf">${u.ablauf.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    ${liste('Hinweise', u.hinweise)}
    ${liste('Typische Fehler', u.fehler, 'fehlerliste')}
    ${u.leichter || u.schwerer ? `<section class="alternative-bereich">
      <h3>Alternative</h3>
      <div class="alternativen">${alternative('Einfacher', u.leichter)}${alternative('Schwerer', u.schwerer)}</div>
    </section>` : ''}
  `);
}

function zeigeToast(text) {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(zeigeToast.t);
  zeigeToast.t = setTimeout(() => { toast.hidden = true; }, 2200);
}

// Hinweis oben auf „Heute“: kein Zugriff oder Daten aus dem Zwischenspeicher
function hinweisBanner() {
  if (zugangFehler) {
    return `<div class="hinweis warnung">
      <span class="ueber">Kein Zugriff</span>
      Dein Schlüssel ist abgelaufen oder wurde widerrufen. Du siehst den zuletzt geladenen Stand.
      <button class="text-knopf" data-aktion="abmelden">Neuen Schlüssel eintragen ›</button>
    </div>`;
  }
  if (daten.ausCache) {
    return `<div class="hinweis warnung">
      <span class="ueber">Ohne Verbindung</span>
      Stand vom letzten Laden. Zum Aktualisieren nach unten ziehen, sobald du wieder online bist.
    </div>`;
  }
  return '';
}

// ---------- Status melden ----------

const STATUS_WAHL = [
  { wert: 'erledigt', text: 'Erledigt' },
  { wert: 'teilweise', text: 'Teilweise' },
  { wert: 'ausgelassen', text: 'Ausgelassen' },
];

const offenFuer = (w, e) => !daten.demo && D.offenFuer(daten.id, w.iso_woche, e.id);

// Abhaken erst ab dem geplanten Tag; abgeschlossene Wochen und fehlender Zugang: nur ansehen
function statusSperre(e, quelle) {
  if (quelle === 'archiv') return 'Woche abgeschlossen – Status vom Coach übernommen.';
  if (zugangFehler) return 'Kein Zugriff – Status kann gerade nicht gemeldet werden.';
  if (e.tag_vorschlag > D.heute()) {
    return `Abhaken ab ${D.TAGE_LANG[D.wochentag(e.tag_vorschlag)]}, ${D.fmtTag(e.tag_vorschlag)}.`;
  }
  return '';
}

function statusInfo(w, e) {
  if (offenFuer(w, e)) {
    return sendetGerade
      ? '<span class="dreh-klein">↻</span> Wird gespeichert …'
      : 'Keine Verbindung – wird gesendet, sobald du online bist.';
  }
  if (daten.demo && e.status !== 'geplant') return 'Demo: bleibt nur auf diesem Gerät.';
  if (e.status === 'geplant') return 'Tippe, sobald die Einheit vorbei ist.';
  return 'Gespeichert – der Coach sieht es beim Wochen-Check. Nochmal tippen setzt zurück.';
}

function statusWahl(e, nr, quelle) {
  const { woche: w } = wocheNachNr(nr);
  const sperre = statusSperre(e, quelle);
  if (quelle === 'archiv') return `<p class="status-hinweis">${sperre}</p>`;
  const knoepfe = STATUS_WAHL.map((s) => `
    <button class="st-knopf ${e.status === s.wert ? 'aktiv' : ''}" data-aktion="status" data-nr="${nr}" data-e="${e.id}"
        data-wert="${s.wert}" ${sperre ? 'disabled' : ''} aria-pressed="${e.status === s.wert}">
      <i class="p gross voll st-${s.wert}"></i>${s.text}
    </button>`).join('');
  return `<section class="status-wahl">
    <p class="ueber">Status</p>
    <div class="st-knoepfe">${knoepfe}</div>
    <p class="status-hinweis">${sperre || statusInfo(w, e)}</p>
  </section>`;
}

// Heute-Karte: nur anzeigen, was gewählt wurde – nichts gewählt = nichts anzeigen
function statusMarke(e, nr) {
  const { woche: w } = wocheNachNr(nr);
  if (w && offenFuer(w, e)) {
    return sendetGerade
      ? '<span class="status-marke"><span class="dreh-klein">↻</span> Speichert</span>'
      : '<span class="status-marke">⏳ Wartet</span>';
  }
  if (!STATUS_TEXT[e.status]) return '';
  const text = STATUS_TEXT[e.status];
  return `<span class="status-marke">${punkt(e)} ${text[0].toUpperCase()}${text.slice(1)}</span>`;
}

async function statusSetzen(nr, id, wert) {
  const { woche: w } = wocheNachNr(nr);
  const e = w && D.einheit(w, id);
  if (!e) return;
  const neu = e.status === wert ? 'geplant' : wert; // nochmal tippen = zurücksetzen
  D.melden(daten.id, w.iso_woche, id, neu);
  statusAnwenden();
  zeichnen(false);
  await sendenVersuchen();
}

// Warteschlange senden; ohne Verbindung bleibt sie liegen und wird später erneut versucht
async function sendenVersuchen() {
  if (!daten || daten.demo || sendetGerade) return;
  if (!D.warteschlange().some((m) => m.id === daten.id)) return;
  sendetGerade = true;
  zeichnen(false);
  try {
    const wochen = daten.aktuell.wochen.map((w) => w.iso_woche);
    const ergebnis = await D.senden(daten.id, wochen);
    if (ergebnis.gesendet) {
      daten.statusDatei = ergebnis.wochen;
      zeigeToast(`Gespeichert (${ergebnis.gesendet})`);
    }
  } catch (fehler) {
    if (fehler instanceof D.ZugangFehler) zugangFehler = true;
    else if (!(fehler instanceof D.NetzFehler)) zeigeToast(fehler.message);
  } finally {
    sendetGerade = false;
    statusAnwenden();
    zeichnen(false);
  }
}

// ---------- Zugang ----------

const APP_ICON = `<div class="app-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></div>`;

function seiteZugang(art) {
  if (art === 'safari') {
    return `<section class="zugang">
      ${APP_ICON}
      <h1>Trainingsplan</h1>
      <p class="leise">Dein Plan läuft als App auf dem Home-Bildschirm – so bleibt dein Zugang gespeichert.</p>
      <ol class="ablauf">
        <li>Unten auf <b>Teilen</b> <span class="teilen-symbol">⎙</span> tippen</li>
        <li><b>Zum Home-Bildschirm</b> wählen und hinzufügen</li>
        <li>Die App <b>Trainingsplan</b> öffnen und dort deinen Schlüssel eintragen</li>
      </ol>
      <p class="fussnote">Safari und die App speichern getrennt. Ein hier eingetragener Schlüssel wäre in der App nicht vorhanden.</p>
      <button class="knopf-breit zweit" data-aktion="zugang-formular">Schlüssel trotzdem hier eintragen</button>
      <a class="knopf-breit zweit" href="?demo=1">Demo ansehen</a>
    </section>`;
  }
  return `<section class="zugang">
    ${APP_ICON}
    <h1>${art === 'abgelaufen' ? 'Kein Zugriff' : 'Zugang einrichten'}</h1>
    <p class="leise">${art === 'abgelaufen'
      ? 'Dein Schlüssel ist abgelaufen oder wurde widerrufen. Bitte den Coach um einen neuen.'
      : 'Den Schlüssel bekommst du von deinem Coach. Er bleibt nur auf diesem Gerät.'}</p>
    <form class="karte zugang-form" data-form="zugang">
      <input class="unsichtbar" type="text" name="username" autocomplete="username" value="trainingsplan" tabindex="-1" aria-hidden="true">
      <label for="schluessel">Schlüssel</label>
      <input class="suche" id="schluessel" name="password" type="password" autocomplete="current-password"
             placeholder="github_pat_…" spellcheck="false" autocapitalize="off">
      <p class="feld-fehler" id="zugang-fehler" hidden></p>
      <button class="knopf-breit" type="submit">Verbinden</button>
    </form>
    <p class="fussnote">Tipp: Im Feld tippen und den Schlüssel aus der Passwörter-App wählen.</p>
    <a class="knopf-breit zweit" href="?demo=1">Demo ansehen</a>
  </section>`;
}

async function zugangPruefen(formular) {
  const feld = formular.querySelector('#schluessel');
  const fehlerText = document.getElementById('zugang-fehler');
  const knopf = formular.querySelector('button[type=submit]');
  const token = feld.value.trim();
  const melden = (text) => {
    fehlerText.textContent = text;
    fehlerText.hidden = false;
    knopf.disabled = false;
    knopf.textContent = 'Verbinden';
  };
  if (!token) return melden('Bitte den Schlüssel einfügen.');
  fehlerText.hidden = true;
  knopf.disabled = true;
  knopf.textContent = 'Prüfe Schlüssel …';
  D.schluesselSetzen(token);
  try {
    const liste = await D.plaene();
    if (!liste.length) {
      D.abmelden();
      return melden('Für diesen Schlüssel ist kein Plan freigegeben. Frag deinen Coach.');
    }
    feld.value = '';
    D.auswahlSetzen(liste[0]);
    await planLaden();
  } catch (fehler) {
    D.abmelden();
    melden(fehler instanceof D.NetzFehler
      ? 'Keine Verbindung – bitte später erneut versuchen.'
      : 'Schlüssel ungültig, abgelaufen oder für keinen Plan freigegeben.');
  }
}

function planWahlBlatt() {
  blattOeffnen(`<h2>Plan wählen</h2><p class="leise">Dein Schlüssel gilt für ${plaeneListe.length} Pläne.</p>
    <div class="karte liste">${plaeneListe.map((id) => `
      <button class="uebung-zeile" data-aktion="plan-wahl" data-id="${esc(id)}">
        <span class="zeile-text"><b>${esc(id)}</b></span>
        ${id === daten.id ? '<span class="marke">aktiv</span>' : '<span class="pfeil-rechts">›</span>'}
      </button>`).join('')}</div>`);
}

async function planWechseln(id) {
  blattSchliessen();
  D.auswahlSetzen(id);
  archiv.clear();
  await planLaden();
}

// Zugang am Ende des Block-Tabs: zurückhaltend, nur das Nötige
function zugangDetails() {
  if (daten.demo) {
    return `<section class="zugang-fuss">
      <p class="ueber">Zugang</p>
      <dl><dt>Demo</dt><dd>Testdaten, Meldungen bleiben auf diesem Gerät</dd></dl>
      <a class="text-knopf" href="./">Eigenen Plan einrichten</a>
    </section>`;
  }
  return `<section class="zugang-fuss">
    <p class="ueber">Zugang</p>
    <dl>
      <dt>Plan vom Coach</dt><dd>${D.fmtZeitpunkt(daten.aktuell.aktualisiert)}</dd>
      <dt>Zuletzt geladen</dt><dd>${D.fmtUhrzeit(daten.geladen)} Uhr${daten.ausCache ? ' · ohne Verbindung' : ''}</dd>
    </dl>
    <button class="text-knopf" data-aktion="abmelden">Schlüssel entfernen</button>
  </section>`;
}

// ---------- Herunterziehen zum Aktualisieren ----------

const ZIEH_SCHWELLE = 70;
let ziehStart = null;
let ziehWeg = 0;

function ziehAnzeige(text, offsetPx) {
  ziehen.hidden = false;
  ziehen.textContent = text;
  ziehen.style.transform = `translateY(${Math.min(offsetPx, ZIEH_SCHWELLE)}px)`;
}

function ziehEnde() {
  ziehen.hidden = true;
  ziehen.style.transform = '';
  ziehStart = null;
  ziehWeg = 0;
}

function ziehBeginn(y, ziel) {
  if (!daten || !sheet.hidden || window.scrollY > 0 || (ziel && ziel.closest('.sheet'))) return;
  ziehStart = y;
  ziehWeg = 0;
}

function ziehBewegung(y) {
  if (ziehStart === null) return;
  ziehWeg = y - ziehStart;
  if (window.scrollY > 0 || ziehWeg <= 0) return ziehEnde();
  ziehAnzeige(ziehWeg > ZIEH_SCHWELLE ? 'Loslassen zum Aktualisieren' : '↓ Zum Aktualisieren ziehen', ziehWeg / 2);
}

async function ziehLoslassen() {
  if (ziehStart === null) return;
  if (ziehWeg <= ZIEH_SCHWELLE) return ziehEnde();
  ziehAnzeige('Aktualisiert …', ZIEH_SCHWELLE / 2);
  ziehStart = null;
  await neuLaden();
  ziehEnde();
}

document.addEventListener('pointerdown', (ev) => { if (ev.pointerType !== 'touch') ziehBeginn(ev.clientY, ev.target); });
document.addEventListener('pointermove', (ev) => { if (ev.pointerType !== 'touch') ziehBewegung(ev.clientY); });
document.addEventListener('pointerup', (ev) => { if (ev.pointerType !== 'touch') ziehLoslassen(); });
document.addEventListener('pointercancel', ziehEnde);
document.addEventListener('touchstart', (ev) => {
  if (ev.touches.length === 1) ziehBeginn(ev.touches[0].clientY, ev.target);
}, { passive: true });
document.addEventListener('touchmove', (ev) => ziehBewegung(ev.touches[0].clientY), { passive: true });
document.addEventListener('touchend', ziehLoslassen, { passive: true });
document.addEventListener('touchcancel', ziehEnde, { passive: true });

// Wischen auf der Heute-Seite: nach links = nächster Tag, nach rechts = vorheriger Tag
let wischStart = null;
inhalt.addEventListener('touchstart', (ev) => {
  const t = ev.touches[0];
  wischStart = ev.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
}, { passive: true });
inhalt.addEventListener('touchend', (ev) => {
  if (!wischStart || !sheet.hidden) return;
  const [seite = 'heute'] = location.hash.slice(1).split('/');
  if (seite !== 'heute') return;
  const t = ev.changedTouches[0];
  const dx = t.clientX - wischStart.x;
  const dy = t.clientY - wischStart.y;
  wischStart = null;
  if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
  const ziel = document.querySelector(`.tag-nav a.pfeil[aria-label="${dx < 0 ? 'Nächster Tag' : 'Vorheriger Tag'}"]`);
  if (ziel) location.hash = ziel.getAttribute('href');
}, { passive: true });

// ---------- Ereignisse ----------

document.addEventListener('click', (ev) => {
  if (ev.target === sheet) return blattSchliessen();
  const el = ev.target.closest('[data-aktion]');
  if (!el) return;
  const aktion = el.dataset.aktion;
  if (aktion === 'athlet') planWahlBlatt();
  else if (aktion === 'plan-wahl') planWechseln(el.dataset.id);
  else if (aktion === 'status') statusSetzen(Number(el.dataset.nr), el.dataset.e, el.dataset.wert);
  else if (aktion === 'zugang-formular') zugangZeigen('einrichten');
  else if (aktion === 'abmelden') {
    if (!confirm('Schlüssel von diesem Gerät entfernen? Zum Ansehen des Plans brauchst du ihn dann erneut.')) return;
    D.abmelden();
    daten = null;
    plaeneListe = [];
    zugangZeigen('einrichten');
  } else if (aktion === 'zu') blattSchliessen();
  else if (aktion === 'zu-tag') {
    const ziel = document.getElementById(`tag-${el.dataset.tag}`);
    if (ziel) ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (aktion === 'uebung') {
    let ref = null;
    if (el.dataset.e) {
      const { woche } = wocheNachNr(Number(el.dataset.nr));
      const e = woche && D.einheit(woche, el.dataset.e);
      ref = e && e.uebungen[Number(el.dataset.i)];
    }
    uebungZeigen(el.dataset.id, ref);
  }
});

document.addEventListener('submit', (ev) => {
  if (ev.target.dataset.form !== 'zugang') return;
  ev.preventDefault();
  zugangPruefen(ev.target);
});

document.addEventListener('input', (ev) => {
  if (ev.target.dataset.aktion !== 'suche') return;
  const q = ev.target.value.trim().toLowerCase();
  document.querySelectorAll('#uebungsliste [data-suche]').forEach((b) => {
    b.hidden = q && !b.dataset.suche.includes(q);
  });
});

// Wieder online: offene Meldungen nachsenden
window.addEventListener('online', () => sendenVersuchen());
document.addEventListener('visibilitychange', () => { if (!document.hidden) sendenVersuchen(); });

// Zurück von einer Einheit: gleicher Tag/gleiche Woche und alte Scrollposition
window.addEventListener('hashchange', (ev) => {
  const vorher = new URL(ev.oldURL).hash;
  if (!vorher.startsWith('#einheit/')) scrollStand.set(vorher || '#heute', window.scrollY);
  const zurueck = vorher.startsWith('#einheit/') && scrollStand.has(location.hash);
  zeichnen(!zurueck);
  if (zurueck) window.scrollTo(0, scrollStand.get(location.hash));
});

if ('serviceWorker' in navigator) {
  // Neue App-Version aktiv → einmal neu laden, damit nicht die alte Oberfläche stehen bleibt
  const hatteVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hatteVersion) location.reload(); });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* ohne SW läuft die App auch */ }));
}

start();
