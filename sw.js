/* Service Worker: Oberfläche gecacht (sofortiger Start), Daten immer frisch.

   - Oberfläche (HTML, JS, CSS, Icons): aus dem Cache, im Hintergrund erneuert.
   - Übungsbibliothek und Demo-Daten: erst Netz, Cache nur als Rückfall.
   - Pläne kommen über api.github.com und laufen nie durch den Service Worker. */
const VERSION = 'v4';
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

async function cacheZuerst(anfrage) {
  const cache = await caches.open(CACHE);
  const gespeichert = await cache.match(anfrage);
  const ausNetz = fetch(anfrage)
    .then((antwort) => {
      if (antwort.ok) cache.put(anfrage, antwort.clone());
      return antwort;
    })
    .catch(() => gespeichert);
  return gespeichert || ausNetz;
}

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/plaene/')) return ev.respondWith(netzZuerst(ev.request));
  ev.respondWith(cacheZuerst(ev.request));
});
