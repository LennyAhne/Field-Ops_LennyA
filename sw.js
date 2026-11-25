/* Bump VERSION whenever app assets change. Relative URLs support subfolder hosting. */
'use strict';
const VERSION = 'v1.1.0';
const PREFIX = 'fieldops-shell-' + self.registration.scope;
const CACHE = PREFIX + VERSION;
const ASSETS = ['./index.html', './radar-sim.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
const urlFor = path => new URL(path, self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    ASSETS.map(path => new Request(urlFor(path), { cache: 'reload' }))
  )));
  // A future update waits for existing app windows to close: no mixed asset versions.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  const isEntry = event.request.mode === 'navigate' &&
    (url.pathname === new URL('./', self.registration.scope).pathname || url.pathname === new URL('./index.html', self.registration.scope).pathname);
  const asset = ASSETS.find(path => new URL(path, self.registration.scope).pathname === url.pathname);
  if (!isEntry && !asset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(urlFor(isEntry ? './index.html' : asset))) || fetch(event.request);
  })());
});
