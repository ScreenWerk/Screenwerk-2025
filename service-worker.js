const CACHE_NAME = 'media-cache-v1';
const MEDIA_URL_RE = new RegExp('^.*/media/[0-9a-f]{24}/[0-9a-f]{24}.*$')

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Opened cache');
        })
    );
});

// Look into cache only, if requested url is in form of "/media/6765320b32faaba00f8f92f8/6765321232faaba00f8f9301"
self.addEventListener('fetch', event => {
    console.log(`Fetching zz ${event.request.url}`)
    if (!MEDIA_URL_RE.test(event.request.url)) {
        console.log(`Ignoring ${event.request.url}`)
        return
    }
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Cache hit - return the response from the cache
            if (response) {
                console.log(`Cache hit for ${event.request.url}`)
                return response
            }
            // Cache miss - fetch from the network
            console.log(`Cache miss for ${event.request.url}`)
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
        // test against the regex
        const urlsToCache = event.data.urls.filter(url => MEDIA_URL_RE.test(url))
        console.log(`Caching ${urlsToCache.length} URLs`)
        console.log(urlsToCache)
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(urlsToCache)
        })
    }
})