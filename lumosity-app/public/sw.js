// ================================================================
// Ygy Service Worker — offline-first PWA + background sync + push
// Strategy: cache-first for static, network-first for API, background sync
// ================================================================
const CACHE_VERSION = 'v4';
const STATIC_CACHE  = `ygy-static-${CACHE_VERSION}`;
const API_CACHE     = `ygy-api-${CACHE_VERSION}`;
const SYNC_TAG      = 'ygy-game-sync';

const STATIC_PRECACHE = ['/', '/index.html', '/manifest.json'];

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_PRECACHE))
  );
});

// ── Activate: purge stale caches ─────────────────────────────
self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: tiered strategy ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Navigation: serve shell, fall back to cached index
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // API: network-first → cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static: cache-first → network fallback → cache store
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});

// ── Background Sync ───────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(drainOfflineQueue());
  }
});

async function drainOfflineQueue() {
  let db;
  try { db = await openSWDB(); } catch { return; }
  const items = await idbGetAll(db, 'sync_queue');
  for (const item of items) {
    try {
      const res = await fetch('/api/game-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(item.token ? { Authorization: `Bearer ${item.token}` } : {}),
        },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) await idbDelete(db, 'sync_queue', item.id);
    } catch { /* retry on next sync event */ }
  }
}

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Ygy', {
      body: data.body || 'Your daily brain workout is ready!',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag || 'ygy',
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(target) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(target);
    })
  );
});

// ── Minimal IDB helpers (SW context, no imports) ─────────────
function openSWDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ygy_sw_db', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sync_queue'))
        db.createObjectStore('sync_queue', { keyPath: 'id' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}
function idbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
function idbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
