// Service Worker for Shell Platform PWA
const CACHE_NAME = 'shell-platform-v1';
const RUNTIME_CACHE = 'shell-platform-runtime-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
];

// Assets to cache at runtime
const RUNTIME_CACHE_URLS = [
  // API endpoints that should be cached
  '/api/auth/me',
  '/api/plugins/registry',
  '/api/plugins/installed',
];

// Network-first strategy URLs (always try network first)
const NETWORK_FIRST_URLS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
];

// Cache-first strategy URLs (serve from cache, update in background)
const CACHE_FIRST_URLS = [
  '/api/plugins/registry',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate new service worker immediately
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If navigation fails, serve the cached index.html
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Handle API requests with different strategies
  if (url.pathname.startsWith('/api/')) {
    if (NETWORK_FIRST_URLS.some(pattern => url.pathname.includes(pattern))) {
      // Network-first strategy for authentication and critical APIs
      event.respondWith(networkFirst(request));
    } else if (CACHE_FIRST_URLS.some(pattern => url.pathname.includes(pattern))) {
      // Cache-first strategy for less critical data
      event.respondWith(cacheFirst(request));
    } else {
      // Default to stale-while-revalidate for other API calls
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  // Handle favicon requests with special fallback
  if (url.pathname.includes('favicon') || 
      url.pathname.includes('apple-touch-icon') ||
      url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirstWithIconFallback(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'image' || 
      request.destination === 'font' || 
      request.destination === 'style' || 
      request.destination === 'script') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default strategy for other requests
  event.respondWith(staleWhileRevalidate(request));
});

// Caching strategies

// Network-first: Try network, fallback to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Update cache with fresh response
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a custom offline response for API requests
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This request is not available offline' 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    throw error;
  }
}

// Cache-first: Serve from cache, update in background
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, response);
        });
      }
    }).catch(() => {
      // Ignore network errors in background update
    });
    
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Return offline fallback for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#f0f0f0" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Stale-while-revalidate: Serve from cache, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network response
  return fetchPromise;
}

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  // For example, sync offline actions, upload queued data, etc.
  console.log('[SW] Performing background sync...');
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  const options = {
    body: 'New notification from Shell Platform',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(
    self.registration.showNotification('Shell Platform', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    console.log('[SW] Periodic background sync triggered');
    event.waitUntil(doPeriodicSync());
  }
});

async function doPeriodicSync() {
  // Implement periodic sync logic
  console.log('[SW] Performing periodic sync...');
}

// Cache-first strategy specifically for icons with fallback to favicon.svg
async function cacheFirstWithIconFallback(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, response);
        });
      }
    }).catch(() => {
      // Ignore network errors in background update
    });
    
    return cachedResponse;
  }
  
  // If not in cache, try to fetch from network
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      return response;
    }
    
    // If response is not ok, fall through to fallback
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.log('[SW] Icon request failed, trying fallback:', request.url);
    
    // Try to serve favicon.svg as fallback for any icon request
    const fallbackResponse = await caches.match('/favicon.svg');
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    // Return a generic SVG icon as last resort
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>',
      { 
        headers: { 
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400'
        } 
      }
    );
  }
}