/* Entwurf A „Heute“: App mit Tab-Leiste, Heute-Karte zuerst, Blockdiagramme. */
'use strict';

const D = window.PlanDaten;
const esc = D.esc;

const inhalt = document.getElementById('inhalt');
const topbar = document.getElementById('topbar');
const sheet = document.getElementById('sheet');
const sheetInhalt = document.getElementById('sheet-inhalt');
const toast = document.getElementById('toast');

let daten = null;
let letzterTab = 'heute';
const archiv = new Map(); // Wochen-Nr → Woche | 'laedt' | Error

// ---------- Laden & Navigation ----------

async function start() {
  try {
    daten = await D.laden(D.athletId());
    zeichnen();
  } catch (fehler) {
    inhalt.innerHTML = `<div class="karte fehler"><h2>Plan nicht geladen</h2><p>${esc(fehler.message)}</p></div>`;
  }
}

async function neuLaden(knopf) {
  knopf.classList.add('dreht');
  try {
    daten = await D.laden(daten.id);
    archiv.clear();
    zeichnen(false);
    zeigeToast(`Aktualisiert um ${D.fmtUhrzeit(daten.geladen)}`);
  } catch {
    zeigeToast('Keine Verbindung – alter Stand bleibt');
  } finally {
    knopf.classList.remove('dreht');
  }
}

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

const nrJetzt = () => daten.aktuell.wochen[D.aktuelleWoche(daten.aktuell, D.heute())].nr;

function zeichnen(nachOben = true) {
  if (!daten) return;
  const [seite = 'heute', ...teile] = location.hash.slice(1).split('/');
  const seiten = { heute: seiteHeute, woche: seiteWoche, uebungen: seiteUebungen, block: seiteBlock };

  if (seite === 'einheit') {
    inhalt.innerHTML = seiteEinheit(Number(teile[0]), teile[1]);
  } else {
    letzterTab = seiten[seite] ? seite : 'heute';
    inhalt.innerHTML = seiten[letzterTab](teile);
  }
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('aktiv', a.dataset.tab === letzterTab));
  topbarZeichnen(seite === 'einheit');
  if (nachOben) window.scrollTo(0, 0);
}

function topbarZeichnen(unterseite) {
  const athlet = daten.athleten.find((x) => x.id === daten.id);
  const links = unterseite
    ? `<a class="knopf zurueck" href="#${letzterTab}">‹ Zurück</a>`
    : `<button class="knopf athlet" data-aktion="athlet">${esc(athlet ? athlet.anzeigename : daten.id)} <span>▾</span></button>`;
  topbar.innerHTML = `${links}
    <button class="knopf stand" data-aktion="neu" aria-label="Neu laden">
      <span>Stand ${D.fmtZeitpunkt(daten.aktuell.aktualisiert)}</span><span class="dreh">↻</span>
    </button>`;
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
    <span class="mehr">Details ›</span>
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

function zaehler(label, ist, soll) {
  const punkte = Array.from({ length: soll }, (_, i) => `<i class="${i < ist ? 'voll' : ''}"></i>`).join('');
  return `<div class="zaehler"><div class="punkte">${punkte}</div><b>${ist}<small>/${soll}</small></b><span>${label}</span></div>`;
}

// ---------- Seite: Heute ----------

function seiteHeute() {
  const heute = D.heute();
  const wochen = daten.aktuell.wochen;
  const w = wochen[D.aktuelleWoche(daten.aktuell, heute)];
  const block = daten.aktuell.block;
  const heuteListe = D.amTag(w, heute);
  const frei = D.freiWaehlbar(w);
  const z = D.wochenZahlen(w);

  let html = `<section class="titel">
    <p class="ueber">${D.TAGE_LANG[D.wochentag(heute)]}, ${D.fmtTag(heute)}</p>
    <h1>Heute</h1>
    <p class="unter">KW ${D.kw(w)} · Woche ${w.nr} von ${D.blockWochen(block)} · ${typBadge(w)}</p>
  </section>`;

  if (heuteListe.length) {
    html += heuteListe.map((e) => karteGross(e, w.nr)).join('');
  } else {
    html += `<div class="karte ruhetag">
      <p class="ueber">Kein fester Termin</p>
      <h3>Ruhetag – oder eine freie Einheit</h3>
      ${frei.length ? `<p class="leise">Diese Woche frei wählbar:</p>${frei.map((e) => zeileKompakt(e, w.nr)).join('')}` : ''}
    </div>`;
  }

  for (const h of D.ernaehrung(w, heute)) {
    html += `<div class="hinweis essen"><span class="ueber">Ernährung heute</span>${esc(h.text)}</div>`;
  }
  if (w.notiz_coach) {
    html += `<div class="hinweis coach"><span class="ueber">Coach</span>${esc(w.notiz_coach)}</div>`;
  }

  html += `<h2 class="abschnitt">Diese Woche <a href="#woche/${w.nr}">Plan ›</a></h2>
    <div class="karte fortschritt">
      ${zaehler('Pflicht', z.pflichtErledigt, z.pflicht)}
      ${zaehler('Optional', z.optionalErledigt, z.optional)}
      ${zaehler('Mobility', z.mobilityErledigt, z.mobilitySoll)}
    </div>`;

  const kommend = [];
  for (let i = 1; i <= 7; i++) {
    const tag = D.plusTage(heute, i);
    const wo = wochen.find((x) => tag >= x.start && tag <= x.ende);
    if (!wo) continue;
    const liste = D.amTag(wo, tag);
    if (liste.length) kommend.push({ tag, nr: wo.nr, liste });
  }
  if (kommend.length) {
    html += `<h2 class="abschnitt">Als Nächstes</h2>`;
    html += kommend.map((k) => `<div class="tag-gruppe">
      <div class="tag-label"><b>${D.TAGE_KURZ[D.wochentag(k.tag)]}</b><span>${D.datum(k.tag).getDate()}.</span></div>
      <div class="tag-liste">${k.liste.map((e) => zeileKompakt(e, k.nr)).join('')}</div>
    </div>`).join('');
  }
  if (heuteListe.length && frei.length) {
    html += `<h2 class="abschnitt">Frei wählbar</h2>
      <div class="tag-liste">${frei.map((e) => zeileKompakt(e, w.nr)).join('')}</div>`;
  }
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
    const essen = D.ernaehrung(w, t.datum);
    let rechts;
    if (!t.imPlan) rechts = `<p class="leise klein">außerhalb des Blocks</p>`;
    else if (!liste.length) rechts = `<p class="leise klein">Ruhetag</p>`;
    else rechts = liste.map((e) => zeileKompakt(e, nr)).join('');
    if (essen.length) rechts += essen.map((h) => `<p class="essen-klein">🍝 ${esc(h.text)}</p>`).join('');
    return `<div class="tag-gruppe ${t.datum === heute ? 'ist-heute' : ''} ${t.imPlan ? '' : 'aussen'}" id="tag-${t.datum}">
      <div class="tag-label"><b>${D.TAGE_KURZ[t.index]}</b><span>${D.datum(t.datum).getDate()}.</span></div>
      <div class="tag-liste">${rechts}</div>
    </div>`;
  }).join('');

  const frei = D.freiWaehlbar(w);
  const allgemein = D.ernaehrung(w, null);

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
    ${tagesListe}
    ${frei.length ? `<h2 class="abschnitt">Frei wählbar</h2><div class="tag-liste">${frei.map((e) => zeileKompakt(e, nr)).join('')}</div>` : ''}
    ${allgemein.length ? `<h2 class="abschnitt">Ernährung</h2>${allgemein.map((h) => `<div class="hinweis essen">${esc(h.text)}</div>`).join('')}` : ''}`;
}

// ---------- Seite: Einheit ----------

function seiteEinheit(nr, id) {
  const { woche: w, quelle } = wocheNachNr(nr);
  if (quelle === 'laedt') return `<p class="laden">Lade Einheit …</p>`;
  const e = w && D.einheit(w, id);
  if (!e) return `<div class="karte fehler"><h2>Einheit nicht gefunden</h2></div>`;
  const sp = D.sport(e.sportart);
  const zonen = daten.aktuell.zonen;
  let hatAbgeleitet = false;

  let html = `<section class="einheit-kopf sp-${e.sportart} ${e.status === 'ausgelassen' ? 'ist-ausgelassen' : ''}">
    <p class="ueber">${sp.icon} ${e.art === 'mobility' ? '' : `${esc(sp.name)} · `}${artBadge(e)}
      ${STATUS_TEXT[e.status] ? `${punkt(e)}<span class="status">${STATUS_TEXT[e.status]}</span>` : ''}</p>
    <h1>${esc(e.titel)}</h1>
    <p class="unter">${e.tag_vorschlag ? `${D.TAGE_LANG[D.wochentag(e.tag_vorschlag)]}, ${D.fmtTag(e.tag_vorschlag)}` : 'Tag frei wählbar'} · ${D.fmtDauer(e.dauer_min)}</p>
    ${e.ziel ? `<p class="ziel">${esc(e.ziel)}</p>` : ''}
  </section>`;

  if (zeigeDiagramm(e)) {
    html += `<div class="karte">${diagramm(e, true)}
      <div class="legende">${['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((z) => `<span><i class="z-${z}"></i>${z}</span>`).join('')}</div>
    </div>`;
  }

  if (e.bloecke && e.bloecke.length) {
    html += `<h2 class="abschnitt">Ablauf</h2>`;
    html += e.bloecke.map((b) => {
      const int = D.intensitaet(b, e.sportart, zonen);
      if (int.werte.some((v) => v.abgeleitet)) hatAbgeleitet = true;
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
    if (hatAbgeleitet) html += `<p class="fussnote">Gestrichelte Werte stammen aus deiner Zonentabelle.</p>`;
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
    </table></div>`;
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

function athletWahl() {
  blattOeffnen(`<h2>Plan wählen</h2><p class="leise">Coach-Sicht: Auswahl wird im Browser gemerkt.</p>
    <div class="karte liste">${daten.athleten.map((x) => `
      <button class="uebung-zeile" data-aktion="athlet-wahl" data-id="${x.id}">
        <span class="zeile-text"><b>${esc(x.anzeigename)}</b><small>${x.sportarten.map((s) => D.sport(s).name).join(', ')}${x.testdaten ? ' · Testdaten' : ''}</small></span>
        ${x.id === daten.id ? '<span class="marke">aktiv</span>' : '<span class="pfeil-rechts">›</span>'}
      </button>`).join('')}</div>`);
}

function zeigeToast(text) {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(zeigeToast.t);
  zeigeToast.t = setTimeout(() => { toast.hidden = true; }, 2200);
}

// ---------- Ereignisse ----------

document.addEventListener('click', (ev) => {
  if (ev.target === sheet) return blattSchliessen();
  const el = ev.target.closest('[data-aktion]');
  if (!el) return;
  const aktion = el.dataset.aktion;
  if (aktion === 'neu') neuLaden(el);
  else if (aktion === 'athlet') athletWahl();
  else if (aktion === 'athlet-wahl') D.athletWechseln(el.dataset.id);
  else if (aktion === 'zu') blattSchliessen();
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

document.addEventListener('input', (ev) => {
  if (ev.target.dataset.aktion !== 'suche') return;
  const q = ev.target.value.trim().toLowerCase();
  document.querySelectorAll('#uebungsliste [data-suche]').forEach((b) => {
    b.hidden = q && !b.dataset.suche.includes(q);
  });
});

window.addEventListener('hashchange', () => zeichnen());
start();
