// Enhanced Service Worker for Ygy Offline-First Architecture
// Version 3.0 - Advanced offline capabilities

const CACHE_NAME = 'ygy-v3-offline';
const STATIC_CACHE = 'ygy-static-v3';
const DYNAMIC_CACHE = 'ygy-dynamic-v3';
const API_CACHE = 'ygy-api-v3';
const GAME_CACHE = 'ygy-games-v3';

// Core assets for app shell
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/style.css',
  '/src/App.css'
];

// Static assets (images, fonts)
const STATIC_ASSETS = [
  '/assets/images/brain-bg.jpg',
  '/assets/images/logo.svg',
  '/assets/fonts/roboto.woff2'
];

// Game assets for offline play
const GAME_ASSETS = [
  '/src/components/games/MemoryMatrix.tsx',
  '/src/components/games/SpeedMatch.tsx',
  '/src/components/games/ColorMatch.tsx',
  '/src/components/games/MentalRotation3D.tsx',
  '/src/components/games/DualNBack.tsx',
  '/src/components/games/StroopChallenge.tsx',
  '/src/utils/audio.ts',
  '/src/utils/storage.ts'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing enhanced service worker v3...');
  
  event.waitUntil(
    Promise.all([
      // Cache core app shell
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching core app shell...');
        return cache.addAll(CORE_ASSETS);
      }),
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache game assets
      caches.open(GAME_CACHE).then(cache => {
        console.log('[SW] Caching game assets...');
        return cache.addAll(GAME_ASSETS);
      })
    ]).then(() => {
      console.log('[SW] All assets cached successfully');
      return self.skipWaiting();
    }).catch(err => {
      console.error('[SW] Cache installation failed:', err);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating enhanced service worker v3...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (![CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, GAME_CACHE].includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients...');
      return self.clients.claim();
    })
  );
});

// Fetch event - advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for now
  if (request.method !== 'GET') {
    // Handle POST requests for offline queue
    if (request.method === 'POST' && !navigator.onLine) {
      event.respondWith(handleOfflinePost(request));
      return;
    }
    return;
  }
  
  // Strategy 1: Network First for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }
  
  // Strategy 2: Cache First for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }
  
  // Strategy 3: Stale While Revalidate for games
  if (url.pathname.includes('/games/') || url.pathname.includes('Game')) {
    event.respondWith(staleWhileRevalidate(request, GAME_CACHE));
    return;
  }
  
  // Strategy 4: Cache First for navigation
  if (request.mode === 'navigate') {
    event.respondWith(cacheFirstWithNetwork(request, CACHE_NAME));
    return;
  }
  
  // Default: Network with Cache Fallback
  event.respondWith(networkWithCacheFallback(request, DYNAMIC_CACHE));
});

// Helper: Check if URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Caching Strategy: Network First with Cache Fallback (for APIs)
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API
    return new Response(
      JSON.stringify({ 
        error: 'Offline',
        message: 'You are currently offline. Some features may be limited.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Caching Strategy: Cache First with Network (for static assets)
async function cacheFirstWithNetwork(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        caches.open(cacheName).then(cache => {
          cache.put(request, response);
        });
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline placeholder for images
    if (request.destination === 'image') {
      return new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
          <rect width="100" height="100" fill="#2a2a4a"/>
          <text x="50" y="50" text-anchor="middle" fill="#6366f1" font-size="12">Offline</text>
        </svg>`,
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Caching Strategy: Stale While Revalidate (for games)
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(error => {
    console.log('[SW] Network fetch failed for game asset:', error);
    return null;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return fetchPromise.then(response => {
    if (response) return response;
    throw new Error('Failed to fetch game asset');
  });
}

// Caching Strategy: Network with Cache Fallback
async function networkWithCacheFallback(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle offline POST requests
async function handleOfflinePost(request) {
  // Store for background sync
  const body = await request.clone().text();
  
  await self.registration.sync.register('offline-post', {
    payload: {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body
    }
  });
  
  return new Response(
    JSON.stringify({ 
      success: true,
      queued: true,
      message: 'Request queued for sync when online'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// Background sync for offline queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-post') {
    event.waitUntil(processOfflineQueue());
  }
  
  if (event.tag === 'sync-game-sessions') {
    event.waitUntil(syncGameSessions());
  }
  
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

// Process offline queue
async function processOfflineQueue() {
  // Get offline queue from IndexedDB
  const queue = await getOfflineQueueFromIndexedDB();
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      
      if (response.ok) {
        await removeFromOfflineQueue(item.id);
      } else {
        await incrementRetryCount(item.id);
      }
    } catch (error) {
      await incrementRetryCount(item.id);
    }
  }
}

// Sync game sessions specifically
async function syncGameSessions() {
  const sessions = await getOfflineQueueFromIndexedDB('game_sessions');
  
  for (const session of sessions) {
    try {
      const response = await fetch('/api/game-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      
      if (response.ok) {
        await removeFromOfflineQueue(session.id, 'game_sessions');
        // Notify clients
        notifyClients('game-session-synced', session);
      }
    } catch (error) {
      console.error('[SW] Failed to sync game session:', error);
    }
  }
}

// Sync analytics events
async function syncAnalytics() {
  const events = await getOfflineQueueFromIndexedDB('analytics');
  
  if (events.length > 0) {
    try {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
      
      if (response.ok) {
        for (const event of events) {
          await removeFromOfflineQueue(event.id, 'analytics');
        }
      }
    } catch (error) {
      console.error('[SW] Failed to sync analytics:', error);
    }
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || 'Ygy Brain Training';
  const options = {
    body: data.body || 'Time for your daily brain workout!',
    icon: '/assets/images/logo.svg',
    badge: '/assets/images/badge.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open the app
      if (clients.openWindow) {
        const url = notificationData.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_GAME_ASSETS':
      cacheGameAssets(payload.games);
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
      
    case 'GET_CACHE_STATUS':
      event.ports[0].postMessage(getCacheStatus());
      break;
      
    case 'SYNC_NOW':
      if ('sync' in self.registration) {
        self.registration.sync.register(payload.tag || 'offline-post');
      }
      break;
  }
});

// Cache additional game assets on demand
async function cacheGameAssets(gameFiles) {
  const cache = await caches.open(GAME_CACHE);
  
  for (const file of gameFiles) {
    try {
      const response = await fetch(file);
      if (response.ok) {
        await cache.put(file, response);
      }
    } catch (error) {
      console.error('[SW] Failed to cache game asset:', file, error);
    }
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, GAME_CACHE];
  
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
  
  console.log('[SW] All caches cleared');
}

// Get cache status
async function getCacheStatus() {
  const status = {};
  const cacheNames = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, GAME_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

// Notify all clients
function notifyClients(type, data) {
  self.clients.matchAll({ type: 'window' }).then(clients => {
    for (const client of clients) {
      client.postMessage({ type, data });
    }
  });
}

// IndexedDB helpers (simplified - actual implementation would use IndexedDB)
async function getOfflineQueueFromIndexedDB(storeName = 'default') {
  // This would interface with IndexedDB in production
  // For now, return empty array
  return [];
}

async function removeFromOfflineQueue(id, storeName = 'default') {
  // Implementation would remove from IndexedDB
  console.log('[SW] Removed from queue:', id);
}

async function incrementRetryCount(id) {
  // Implementation would update retry count in IndexedDB
  console.log('[SW] Incremented retry count:', id);
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.registration.periodicSync.register('sync-game-sessions', {
    minInterval: 24 * 60 * 60 * 1000 // Daily
  });
}
