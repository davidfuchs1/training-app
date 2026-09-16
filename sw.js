/* Service Worker: Oberfläche gecacht (sofortiger Start), Daten immer frisch.

   - Oberfläche (HTML, JS, CSS, Icons): erst Netz mit kurzer Wartezeit, sonst Cache.
     So kommt eine neue Version beim nächsten Öffnen sicher an, und ohne oder mit
     schlechtem Empfang startet die App trotzdem sofort aus dem Cache.
   - Übungsbibliothek und Demo-Daten: erst Netz, Cache nur als Rückfall.
   - Pläne kommen über api.github.com und laufen nie durch den Service Worker. */
const VERSION = 'v6';
const CACHE = `training-${VERSION}`;

const OBERFLAECHE = [
  './',
  'index.html',
  'app.js',
  'quelle.js',
  'stil.css',
  'farben.css',
  'manifest.webmanifest',
  'icon.svg',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(OBERFLAECHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

async function netzZuerst(anfrage) {
  const cache = await caches.open(CACHE);
  try {
    const antwort = await fetch(anfrage, { cache: 'no-store' });
    if (antwort.ok) cache.put(anfrage, antwort.clone());
    return antwort;
  } catch (fehler) {
    const gespeichert = await cache.match(anfrage);
    if (gespeichert) return gespeichert;
    throw fehler;
  }
}

const WARTEZEIT_MS = 1500;

async function netzMitWartezeit(anfrage) {
  const cache = await caches.open(CACHE);
  const ausNetz = fetch(anfrage, { cache: 'no-store' }).then((antwort) => {
    if (antwort.ok) cache.put(anfrage, antwort.clone());
    return antwort;
  });
  const zuLangsam = new Promise((fertig) => setTimeout(fertig, WARTEZEIT_MS));
  const erstes = await Promise.race([ausNetz.catch(() => null), zuLangsam.then(() => null)]);
  if (erstes) return erstes;
  const gespeichert = await cache.match(anfrage, { ignoreSearch: true });
  return gespeichert || ausNetz;
}

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/plaene/')) return ev.respondWith(netzZuerst(ev.request));
  ev.respondWith(netzMitWartezeit(ev.request));
});
