/* Spike Schritt 0: prüft Token-Zugriff auf private Plan-Repos direkt aus dem Browser.
   Wegwerf-Code – nicht Teil der finalen App. */
'use strict';

const API = 'https://api.github.com';
const BESITZER = 'davidfuchs1';
const PLAN_REPO = 'plan-test';
const FREMD_REPO = 'training-daten'; // darf mit dem Test-/Coach-Token NICHT lesbar sein
const SPEICHER = 'spike-schluessel';

const $ = (id) => document.getElementById(id);
const liste = $('ergebnisse');

const imHomeBildschirm = () => window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;
const modusName = () => (imHomeBildschirm() ? 'Home-Bildschirm-App' : 'Browser (Safari o. Ä.)');

// ---------- Schlüssel im Gerät ----------

function lesen() {
  try { return JSON.parse(localStorage.getItem(SPEICHER)); } catch { return null; }
}

function schreiben(wert) {
  try {
    if (wert) localStorage.setItem(SPEICHER, JSON.stringify(wert));
    else localStorage.removeItem(SPEICHER);
    return true;
  } catch { return false; }
}

function schluesselZeigen() {
  const s = lesen();
  $('modus').textContent = `Läuft als: ${modusName()}`;
  $('schluessel-da').hidden = !s;
  $('schluessel-form').hidden = !!s;
  $('start').disabled = !s;
  if (s) {
    $('schluessel-info').textContent =
      `Gespeichert: github_pat_…${s.token.slice(-4)} · eingetragen ${new Date(s.seit).toLocaleString('de-DE')} als ${s.modus}`;
  }
}

$('schluessel-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const token = $('token').value.trim();
  if (!/^github_pat_[A-Za-z0-9_]{20,}$/.test(token)) {
    alert('Das sieht nicht wie ein Fine-grained Token (github_pat_…) aus.');
    return;
  }
  if (!schreiben({ token, seit: new Date().toISOString(), modus: modusName() })) {
    alert('Speichern im Gerät nicht möglich (privater Modus?).');
    return;
  }
  $('token').value = '';
  schluesselZeigen();
});

$('entfernen').addEventListener('click', () => {
  schreiben(null);
  liste.innerHTML = '';
  schluesselZeigen();
});

// ---------- GitHub-API ----------

async function api(pfad, { methode = 'GET', body, roh = false } = {}) {
  const antwort = await fetch(`${API}${pfad}`, {
    method: methode,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${lesen().token}`,
      Accept: roh ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await antwort.text();
  let daten = text;
  try { daten = JSON.parse(text); } catch { /* roher Text */ }
  return { status: antwort.status, headers: antwort.headers, daten };
}

// Base64 für UTF-8-Text (Contents-API)
const zuBase64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const ausBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

// ---------- Anzeige ----------

function ergebnis(art, titel, text = '') {
  const li = document.createElement('li');
  li.className = art;
  const b = document.createElement('b');
  b.textContent = titel;
  const small = document.createElement('small');
  small.textContent = text;
  li.append(b, small);
  liste.append(li);
}

// ---------- Tests ----------

async function tests() {
  liste.innerHTML = '';
  $('start').disabled = true;
  const repo = `/repos/${BESITZER}/${PLAN_REPO}`;

  try {
    // 1. Token gültig + Ablaufdatum lesbar?
    const ich = await api('/user');
    if (ich.status === 200) ergebnis('ok', '1 · Token gültig', `Konto: ${ich.daten.login}`);
    else ergebnis('fehler', '1 · Token ungültig', `HTTP ${ich.status}: ${ich.daten.message || ''}`);
    const ablauf = ich.headers.get('github-authentication-token-expiration');
    ergebnis(ablauf ? 'ok' : 'info', '2 · Ablaufdatum per Header lesbar',
      ablauf ? `Läuft ab: ${ablauf}` : 'Header im Browser nicht sichtbar (CORS) → Ablaufdatum anders ermitteln bzw. beim Einrichten eintragen');

    // 3. Zugängliche Repos auflisten
    const repos = await api('/user/repos?per_page=100&sort=full_name');
    if (repos.status === 200) {
      const alle = repos.daten.map((r) => `${r.name}${r.private ? ' (privat)' : ''}`);
      const plaene = repos.daten.filter((r) => r.name.startsWith('plan-') && r.private).map((r) => r.name);
      ergebnis(plaene.includes(PLAN_REPO) ? 'ok' : 'fehler', '3 · Plan-Repos zum Token auflisten',
        `plan-*: ${plaene.join(', ') || '–'}\nalle gelieferten: ${alle.join(', ')}`);
    } else {
      ergebnis('fehler', '3 · Repo-Liste nicht abrufbar', `HTTP ${repos.status}`);
    }

    // 4. Plan lesen
    const aktuell = await api(`${repo}/contents/aktuell.json`, { roh: true });
    let woche = null;
    if (aktuell.status === 200 && typeof aktuell.daten === 'object') {
      woche = aktuell.daten.wochen[0];
      ergebnis('ok', '4 · Plan aus privatem Repo lesen',
        `aktuell.json, Stand ${aktuell.daten.aktualisiert}, Wochen: ${aktuell.daten.wochen.map((w) => w.iso_woche).join(', ')}`);
    } else {
      ergebnis('fehler', '4 · Plan nicht lesbar', `HTTP ${aktuell.status}`);
    }

    // 5. Fremdes Repo muss verborgen bleiben
    const fremd = await api(`/repos/${BESITZER}/${FREMD_REPO}`);
    ergebnis(fremd.status === 404 ? 'ok' : 'fehler', `5 · Fremdes Repo (${FREMD_REPO}) verborgen`,
      fremd.status === 404 ? 'GitHub antwortet 404 – Repo für diesen Schlüssel unsichtbar' : `HTTP ${fremd.status} – Token hat zu viele Rechte!`);

    // 6. Status schreiben (Einheit e1 der ersten Woche zwischen erledigt/teilweise umschalten)
    if (woche) {
      const vorher = await api(`${repo}/contents/status.json`);
      const sha = vorher.status === 200 ? vorher.daten.sha : undefined;
      const doc = sha ? JSON.parse(ausBase64(vorher.daten.content))
        : { format_version: 1, athlet: 'test', aktualisiert: null, wochen: {} };
      const einheit = woche.einheiten[0].id;
      const alt = (doc.wochen[woche.iso_woche] || {})[einheit];
      const neu = alt === 'erledigt' ? 'teilweise' : 'erledigt';
      doc.wochen[woche.iso_woche] = { ...(doc.wochen[woche.iso_woche] || {}), [einheit]: neu };
      doc.aktualisiert = new Date().toISOString();

      const t0 = performance.now();
      const put = await api(`${repo}/contents/status.json`, {
        methode: 'PUT',
        body: {
          message: `Spike: Status ${woche.iso_woche} ${einheit} ${neu}`,
          content: zuBase64(`${JSON.stringify(doc, null, 2)}\n`),
          ...(sha ? { sha } : {}),
        },
      });
      const dauer = Math.round(performance.now() - t0);
      if (put.status === 200 || put.status === 201) {
        ergebnis('ok', '6 · Status schreiben', `${woche.iso_woche} ${einheit}: ${alt || 'geplant'} → ${neu} (${dauer} ms)\nCommit ${put.daten.commit.sha.slice(0, 7)}`);

        // 7. Sofort nachlesen (kein Cache?)
        const nach = await api(`${repo}/contents/status.json`, { roh: true });
        const gelesen = nach.daten && nach.daten.wochen && nach.daten.wochen[woche.iso_woche][einheit];
        ergebnis(gelesen === neu ? 'ok' : 'fehler', '7 · Sofort wieder lesbar', `gelesen: ${gelesen}`);

        // 8. Konflikt: mit veraltetem sha schreiben muss abgelehnt werden
        if (sha) {
          const konflikt = await api(`${repo}/contents/status.json`, {
            methode: 'PUT',
            body: { message: 'Spike: Konflikttest (darf nicht landen)', content: zuBase64('{}\n'), sha },
          });
          ergebnis(konflikt.status === 409 ? 'ok' : 'fehler', '8 · Konflikt erkannt (veralteter Stand)',
            `HTTP ${konflikt.status}${konflikt.status === 409 ? ' – Änderung abgelehnt, App würde neu laden und wiederholen' : ''}`);
        } else {
          ergebnis('info', '8 · Konflikttest', 'status.json wurde gerade erst angelegt – Tests noch einmal starten');
        }
      } else {
        ergebnis('fehler', '6 · Status schreiben fehlgeschlagen', `HTTP ${put.status}: ${put.daten.message || ''}`);
      }
    }

    // 9. Kontingent
    const rest = ich.headers.get('x-ratelimit-remaining');
    const limit = ich.headers.get('x-ratelimit-limit');
    ergebnis('info', '9 · API-Kontingent', rest ? `${rest} von ${limit} Anfragen/h übrig` : 'Header nicht sichtbar');
    ergebnis('info', '10 · Speicherort', `Test läuft als ${modusName()}; Schlüssel eingetragen als ${lesen().modus}`);
  } catch (fehler) {
    ergebnis('fehler', 'Abbruch', `${fehler.name}: ${fehler.message}\n(Netzwerk, CORS oder Content-Security-Policy)`);
  } finally {
    $('start').disabled = false;
  }
}

$('start').addEventListener('click', tests);
schluesselZeigen();
