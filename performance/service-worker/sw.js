/**
 * Service Worker for Shell Platform
 * Advanced caching, offline functionality, and performance optimization
 */

const CACHE_NAME = 'shell-platform-v1.2.0';
const STATIC_CACHE_NAME = 'shell-platform-static-v1.2.0';
const DYNAMIC_CACHE_NAME = 'shell-platform-dynamic-v1.2.0';
const API_CACHE_NAME = 'shell-platform-api-v1.2.0';

// Cache configuration
const CACHE_CONFIG = {
  staticAssets: {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 100
  },
  dynamicContent: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    maxEntries: 50
  },
  apiResponses: {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 200
  },
  images: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 150
  }
};

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/assets/css/main.css',
  '/assets/js/main.js',
  '/assets/fonts/inter.woff2',
  '/assets/icons/logo-192.png',
  '/assets/icons/logo-512.png',
  '/favicon.ico'
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  '/api/v1/config',
  '/api/v1/public',
  '/api/v1/user/profile',
  '/api/v1/files/metadata'
];

// API endpoints that should never be cached
const NON_CACHEABLE_API_PATTERNS = [
  '/api/auth',
  '/api/files/upload',
  '/api/external',
  '/api/admin'
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Pre-cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch Event Handler - Main caching logic
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImage(url.pathname)) {
    event.respondWith(handleImageRequest(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

/**
 * Handle API requests with intelligent caching
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Check if API endpoint should not be cached
  if (NON_CACHEABLE_API_PATTERNS.some(pattern => pathname.includes(pattern))) {
    return networkFirst(request, null);
  }
  
  // Check if API endpoint is cacheable
  if (CACHEABLE_API_PATTERNS.some(pattern => pathname.includes(pattern))) {
    return cacheFirst(request, API_CACHE_NAME, CACHE_CONFIG.apiResponses);
  }
  
  // Default to network first for other API requests
  return networkFirst(request, API_CACHE_NAME);
}

/**
 * Handle static assets with cache first strategy
 */
async function handleStaticAsset(request) {
  return cacheFirst(request, STATIC_CACHE_NAME, CACHE_CONFIG.staticAssets);
}

/**
 * Handle image requests with cache first strategy
 */
async function handleImageRequest(request) {
  return cacheFirst(request, DYNAMIC_CACHE_NAME, CACHE_CONFIG.images);
}

/**
 * Handle page requests with network first strategy
 */
async function handlePageRequest(request) {
  return networkFirst(request, DYNAMIC_CACHE_NAME, CACHE_CONFIG.dynamicContent);
}

/**
 * Cache First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request, cacheName, config = {}) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, config.maxAge)) {
      // Update cache in background if needed
      if (shouldUpdateCache(cachedResponse, config.maxAge)) {
        updateCacheInBackground(request, cache);
      }
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const responseToCache = networkResponse.clone();
      await cacheWithExpiry(cache, request, responseToCache, config);
      
      // Clean up old cache entries
      await limitCacheSize(cache, config.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first error:', error);
    
    // Try to return stale cache entry
    const cache = await caches.open(cacheName);
    const staleResponse = await cache.match(request);
    
    if (staleResponse) {
      return staleResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

/**
 * Network First Strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request, cacheName, config = {}) {
  try {
    const networkResponse = await fetch(request, {
      timeout: 3000 // 3 second timeout
    });
    
    if (networkResponse.ok && cacheName) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      await cacheWithExpiry(cache, request, responseToCache, config);
      
      // Clean up old cache entries
      if (config.maxEntries) {
        await limitCacheSize(cache, config.maxEntries);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network first error:', error);
    
    if (cacheName) {
      const cache = await caches.open(cacheName);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

/**
 * Cache response with expiry timestamp
 */
async function cacheWithExpiry(cache, request, response, config) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', Date.now().toString());
  
  if (config.maxAge) {
    headers.set('sw-expires-at', (Date.now() + config.maxAge).toString());
  }
  
  const responseWithHeaders = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
  
  await cache.put(request, responseWithHeaders);
}

/**
 * Check if cached response is expired
 */
function isExpired(response, maxAge) {
  if (!maxAge) return false;
  
  const expiresAt = response.headers.get('sw-expires-at');
  if (!expiresAt) return false;
  
  return Date.now() > parseInt(expiresAt);
}

/**
 * Check if cache should be updated in background
 */
function shouldUpdateCache(response, maxAge) {
  if (!maxAge) return false;
  
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  
  // Update if cached more than 25% of maxAge ago
  const updateThreshold = maxAge * 0.25;
  return (Date.now() - parseInt(cachedAt)) > updateThreshold;
}

/**
 * Update cache in background
 */
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    console.error('[SW] Background cache update failed:', error);
  }
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cache, maxEntries) {
  if (!maxEntries) return;
  
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // Get cache entries with timestamps
    const entries = await Promise.all(
      keys.map(async key => {
        const response = await cache.match(key);
        const cachedAt = response.headers.get('sw-cached-at');
        return {
          key,
          cachedAt: cachedAt ? parseInt(cachedAt) : 0
        };
      })
    );
    
    // Sort by cached timestamp (oldest first)
    entries.sort((a, b) => a.cachedAt - b.cachedAt);
    
    // Remove oldest entries
    const entriesToRemove = entries.slice(0, entries.length - maxEntries);
    await Promise.all(
      entriesToRemove.map(entry => cache.delete(entry.key))
    );
  }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const expectedCaches = [CACHE_NAME, STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, API_CACHE_NAME];
  
  const deletionPromises = cacheNames
    .filter(name => !expectedCaches.includes(name))
    .map(name => {
      console.log('[SW] Deleting old cache:', name);
      return caches.delete(name);
    });
  
  await Promise.all(deletionPromises);
}

/**
 * Utility functions
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.ico'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/assets/') ||
         pathname.startsWith('/fonts/');
}

function isImage(pathname) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
  return imageExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Background Sync for offline actions
 */
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log('[SW] Running background sync...');
    
    // Sync pending offline actions
    const pendingActions = await getStoredPendingActions();
    
    for (const action of pendingActions) {
      try {
        await syncAction(action);
        await removePendingAction(action.id);
      } catch (error) {
        console.error('[SW] Failed to sync action:', action, error);
      }
    }
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        synced: pendingActions.length
      });
    });
  } catch (error) {
    console.error('[SW] Background sync error:', error);
  }
}

/**
 * Push Notification Handler
 */
self.addEventListener('push', event => {
  const options = {
    body: 'New notification from Shell Platform',
    icon: '/assets/icons/logo-192.png',
    badge: '/assets/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/assets/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/icons/xmark.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    options.title = payload.title || 'Shell Platform';
    options.body = payload.body || options.body;
    options.icon = payload.icon || options.icon;
    options.data = { ...options.data, ...payload.data };
  }

  event.waitUntil(
    self.registration.showNotification('Shell Platform', options)
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open app
    event.waitUntil(
      clients.matchAll().then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

/**
 * Message Handler for communication with main thread
 */
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'PREFETCH_RESOURCES':
      prefetchResources(payload.urls).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'STORE_OFFLINE_ACTION':
      storeOfflineAction(payload).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

/**
 * Prefetch resources
 */
async function prefetchResources(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  const prefetchPromises = urls.map(async url => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.error('[SW] Prefetch failed for:', url, error);
    }
  });
  
  await Promise.all(prefetchPromises);
}

/**
 * IndexedDB utilities for offline actions
 */
async function storeOfflineAction(action) {
  // Implementation would use IndexedDB to store offline actions
  // This is a simplified version
  console.log('[SW] Storing offline action:', action);
}

async function getStoredPendingActions() {
  // Implementation would retrieve from IndexedDB
  return [];
}

async function removePendingAction(actionId) {
  // Implementation would remove from IndexedDB
  console.log('[SW] Removing pending action:', actionId);
}

async function syncAction(action) {
  // Implementation would replay the action
  console.log('[SW] Syncing action:', action);
}

/**
 * Performance monitoring
 */
function reportPerformanceMetrics() {
  if ('performance' in self && 'measure' in self.performance) {
    // Report cache hit rates, response times, etc.
    const clients = self.clients.matchAll();
    clients.then(clientList => {
      clientList.forEach(client => {
        client.postMessage({
          type: 'PERFORMANCE_METRICS',
          metrics: {
            cacheHitRate: 0.85, // Example metric
            averageResponseTime: 150 // Example metric
          }
        });
      });
    });
  }
}

// Report metrics periodically
setInterval(reportPerformanceMetrics, 60000); // Every minute

console.log('[SW] Service Worker loaded successfully');