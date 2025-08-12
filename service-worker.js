const CACHE_NAME = 'media-cache-v1.0.2'
const MEDIA_URL_RE = new RegExp('[0-9a-f]{24}/[0-9a-f]{24}')

// Service worker install event
self.addEventListener('install', event => {
    self.skipWaiting()
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(() => {
                console.log('Cache opened successfully')
            })
    )
})

// Service worker activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Deleting old cache:', name)
                        return caches.delete(name)
                    })
            )
        })
    )
})

// Handle fetch requests with stale-while-revalidate strategy for media assets
self.addEventListener('fetch', event => {
    // Only cache media URLs
    if (!MEDIA_URL_RE.test(event.request.url)) {
        return
    }

    // Extract the media ID from either format (direct or proxied URL)
    const urlParts = event.request.url.split('/')
    const mediaId = urlParts[urlParts.length - 1]

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(mediaId).then(response => {
                // Return cached response immediately if available
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // If we got a valid response, cache it
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(mediaId, networkResponse.clone())
                    }
                    return networkResponse
                }).catch(error => {
                    console.error(`Network fetch failed for ${mediaId}:`, error)
                    // If offline and we have a cached response, that will be used
                })

                return response || fetchPromise
            })
        })
    )
})

// Handle cache preloading from main thread
self.addEventListener('message', event => {
    console.log('Service Worker received message:', event.data)

    if (event.data && event.data.type === 'CACHE_URLS') {
        const urls = event.data.urls || []
        console.log(`Service Worker received ${urls.length} URLs to cache:`, urls)

        // Test each URL against the regex for debugging
        urls.forEach(url => {
            const matches = MEDIA_URL_RE.test(url)
            console.log(`URL "${url}" matches regex: ${matches}`)
        })

        // Filter URLs that match our media pattern
        const urlsToCache = urls.filter(url => MEDIA_URL_RE.test(url))

        console.log(`Preloading ${urlsToCache.length} media assets to cache (${urls.length - urlsToCache.length} filtered out)`)

        if (urlsToCache.length === 0) {
            console.warn('No URLs matched the media pattern!')
            return
        }

        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => {
                    console.log('Cache opened, starting to cache URLs...')
                    return Promise.all(
                        urlsToCache.map(url => {
                            // Extract the media ID from URL path (last two segments)
                            const urlParts = url.split('/')
                            const mediaId = urlParts[urlParts.length - 1]

                            console.log(`Caching media: ${mediaId} from ${url}`)

                            return fetch(url)
                                .then(response => {
                                    if (response && response.status === 200) {
                                        console.log(`Successfully cached: ${mediaId}`)
                                        return cache.put(mediaId, response.clone())
                                    } else {
                                        console.error(`Failed to fetch ${url}: ${response.status}`)
                                    }
                                })
                                .catch(error => console.error(`Failed to cache ${mediaId} from ${url}:`, error))
                        })
                    )
                })
                .then(() => {
                    console.log('All cache operations completed')
                })
        )
    }

    // Handle skip waiting message
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting()
    }
})
