const CACHE_NAME = 'media-cache-v1';
// const urlsToCache = [];sdgrrrr

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Opened cache');
            // return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Cache hit - return the response from the cache
            if (response) {
                return response
            }
            // Cache miss - fetch from the network
            return fetch(event.request).then(
                response => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response
                    }
                    // Clone the response
                    const responseToCache = response.clone()
                    caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache)
                    })
                    return response
                }
            )
        })
    )
})

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_URLS') {
        const urlsToCache = event.data.urls
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(urlsToCache)
        })
    }
})