const CACHE = 'attendance-tracker-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: precache shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c) { return c.addAll(SHELL); })
      .then(function() { return self.skipWaiting(); })
  );
});

// Activate: drop old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch: route by request type
self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // External (fonts): cache-first
  if (!req.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(req).then(function(c) {
        if (c) return c;
        return fetch(req).then(function(res) {
          var clone = res.clone();
          caches.open(CACHE).then(function(cc) { cc.put(req, clone); });
          return res;
        }).catch(function() { return c; });
      })
    );
    return;
  }

  // HTML: network-first
  var isHTML = req.mode === 'navigate' ||
               req.destination === 'document' ||
               req.url.endsWith('.html') ||
               req.url.endsWith('/');

  if (isHTML) {
    e.respondWith(
      fetch(req).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, clone); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(c) { return c || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Assets: cache-first
  e.respondWith(
    caches.match(req).then(function(c) {
      if (c) return c;
      return fetch(req).then(function(res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function(cc) { cc.put(req, clone); });
        }
        return res;
      });
    })
  );
});