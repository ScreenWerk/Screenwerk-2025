const CACHE_NAME = 'media-cache-v1';
const urlsToCache = [
    // List of media URLs to cache
    'https://entu.app/piletilevi/media1.jpg',
    'https://entu.app/piletilevi/media2.mp4',
    // Add more URLs as needed
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Cache hit - return the response from the cache
            if (response) {
                return response;
            }
            // Cache miss - fetch from the network
            return fetch(event.request).then(
                response => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    // Clone the response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                }
            );
        })
    );
});