const CACHE_NAME = 'media-cache-v1.0.2';
const MEDIA_URL_RE = new RegExp('(swpublisher|api/swpublisher)/media/[0-9a-f]{24}/[0-9a-f]{24}');

// Service worker install event
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Cache opened successfully');
        })
    );
});

// Service worker activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                .map(name => {
                    console.log('Deleting old cache:', name);
                    return caches.delete(name);
                })
            );
        })
    );
});

// Handle fetch requests with stale-while-revalidate strategy for media assets
self.addEventListener('fetch', event => {
    // Only cache media URLs
    if (!MEDIA_URL_RE.test(event.request.url)) {
        return;
    }
    
    // Extract the media ID from either format (direct or proxied URL)
    const urlParts = event.request.url.split('/');
    const mediaId = urlParts[urlParts.length - 1];
    
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(mediaId).then(response => {
                // Return cached response immediately if available
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // If we got a valid response, cache it
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(mediaId, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    console.error(`Network fetch failed for ${mediaId}:`, error);
                    // If offline and we have a cached response, that will be used
                });
                
                return response || fetchPromise;
            });
        })
    );
});

// Handle cache preloading from main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_URLS') {
        // Filter URLs that match our media pattern
        const urlsToCache = event.data.urls.filter(url => MEDIA_URL_RE.test(url));
        const mediaIdsToCache = urlsToCache.map(url => url.match(MEDIA_URL_RE)[0].split('/')[1]);
        
        console.log(`Preloading ${mediaIdsToCache.length} media assets to cache`);
        
        event.waitUntil(
            caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.all(
                    mediaIdsToCache.map(mediaId => {
                        const url = urlsToCache.find(url => url.includes(mediaId));
                        return fetch(url)
                            .then(response => cache.put(mediaId, response))
                            .catch(error => console.error(`Failed to cache ${mediaId}:`, error));
                    })
                );
            })
        );
    }
    
    // Handle skip waiting message
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
