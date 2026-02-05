/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service Worker for Offline Support and App Caching
 * Provides offline functionality and caches static assets
 */

const CACHE_NAME = 'impactflow-os-v1';
const STATIC_CACHE_NAME = 'impactflow-os-static-v1';
const API_CACHE_NAME = 'impactflow-os-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// API endpoints to cache (with TTL)
const API_CACHE_PATTERNS = [
  /\/api\/v1\/impactOS\/shared-inbox\/emails/,
  /\/api\/v1\/impactOS\/users/,
  /\/api\/v1\/impactOS\/shared-inbox\/signatures/
];

// Cache duration for API responses (in milliseconds)
const API_CACHE_TTL = {
  '/api/v1/impactOS/shared-inbox/emails': 60000, // 1 minute
  '/api/v1/impactOS/users': 600000, // 10 minutes
  '/api/v1/impactOS/shared-inbox/signatures': 300000 // 5 minutes
};

// Installation event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service Worker installed');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((err) => {
        console.error('[SW] Installation failed:', err);
      })
  );
});

// Activation event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old caches
            return name !== CACHE_NAME && 
                   name !== STATIC_CACHE_NAME && 
                   name !== API_CACHE_NAME;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
    .then(() => {
      console.log('[SW] Service Worker activated');
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Fetch event - Handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket and other non-HTTP requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // For navigation requests, try network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((response) => {
            return response || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

/**
 * Handle API requests with caching strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = url.pathname + url.search;

  // Check if this API endpoint should be cached
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (!shouldCache) {
    // Network only for non-cacheable APIs
    return fetch(request).catch(() => {
      return new Response(
        JSON.stringify({ error: 'Network unavailable', offline: true }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    });
  }

  // Try cache first, then network (stale-while-revalidate)
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(cacheKey);

  // Check if cached response is still valid
  if (cachedResponse) {
    const cachedDate = cachedResponse.headers.get('sw-cached-date');
    if (cachedDate) {
      const cacheAge = Date.now() - parseInt(cachedDate);
      const ttl = getCacheTTL(url.pathname);
      
      if (cacheAge < ttl) {
        // Return cached response, but update in background
        updateCacheInBackground(request, cacheKey, cache);
        return cachedResponse;
      }
    }
  }

  // Fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone response and add cache metadata
      const responseClone = networkResponse.clone();
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });

      // Cache the response
      await cache.put(cacheKey, cachedResponse);
      return networkResponse;
    }
    
    // If network fails, return cached if available
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, return cached if available
    if (cachedResponse) {
      console.log('[SW] Network failed, serving from cache:', cacheKey);
      return cachedResponse;
    }
    
    // No cache available, return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable', 
        offline: true,
        message: 'You are offline. Some features may be limited.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Update cache in background (stale-while-revalidate)
 */
async function updateCacheInBackground(request, cacheKey, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });

      await cache.put(cacheKey, cachedResponse);
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', error);
  }
}

/**
 * Handle static asset requests
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return cached version even if stale
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|json)$/.test(url);
}

/**
 * Get cache TTL for API endpoint
 */
function getCacheTTL(pathname) {
  for (const [pattern, ttl] of Object.entries(API_CACHE_TTL)) {
    if (pathname.includes(pattern)) {
      return ttl;
    }
  }
  return 60000; // Default 1 minute
}

// Message handler for cache invalidation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});
