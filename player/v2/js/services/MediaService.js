/**
 * Media Service - Handles media caching and service worker communication
 * 
 * Manages media URL caching through service worker for better performance
 */

import { debugLog } from '../../../../../common/utils/debug-utils.js'

export class MediaService {
    constructor() {
        this.isServiceWorkerAvailable = 'serviceWorker' in navigator
        this.registration = null
        this.initialized = false
    }

    /**
     * Initialize the media service and register service worker
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        if (!this.isServiceWorkerAvailable) {
            console.warn('[MediaService] Service Worker not available')
            return false
        }

        try {
            // Check for existing service worker registrations
            const registrations = await navigator.serviceWorker.getRegistrations()
            debugLog('[MediaService] Existing service worker registrations:', registrations.length)
            registrations.forEach((reg, index) => {
                debugLog(`[MediaService] Registration ${index}:`, {
                    scope: reg.scope,
                    active: !!reg.active,
                    installing: !!reg.installing,
                    waiting: !!reg.waiting
                })
            })
            
            // Register service worker from root (relative to the site root, not current directory)
            this.registration = await navigator.serviceWorker.register('/service-worker.js')
            debugLog('[MediaService] Service Worker registered with scope:', this.registration.scope)
            debugLog('[MediaService] Service Worker state:', this.registration.active?.state || 'not active')
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready
            debugLog('[MediaService] Service Worker is ready')
            
            this.initialized = true
            return true
        } catch (error) {
            console.error('[MediaService] Service Worker registration failed:', error)
            return false
        }
    }

    /**
     * Cache media URLs through service worker
     * @param {Array} mediaUrls - Array of media URLs to cache
     */
    cacheMediaUrls(mediaUrls) {
        if (!this.initialized || !this.registration) {
            debugLog('[MediaService] Service worker not initialized, skipping cache')
            return
        }

        const validUrls = mediaUrls.filter(url => url && typeof url === 'string')
        
        if (validUrls.length === 0) {
            debugLog('[MediaService] No valid URLs to cache')
            return
        }

        debugLog(`[MediaService] Requesting cache for ${validUrls.length} media URLs:`, validUrls)
        
        // Debug the service worker registration state
        debugLog('[MediaService] Registration state:', {
            active: !!this.registration.active,
            installing: !!this.registration.installing,
            waiting: !!this.registration.waiting,
            scope: this.registration.scope
        })
        
        if (this.registration.active) {
            debugLog('[MediaService] Service worker is active, sending cache request')
            debugLog('[MediaService] Sending message to:', this.registration.active)
            
            try {
                this.registration.active.postMessage({
                    type: 'CACHE_URLS',
                    urls: validUrls
                })
                debugLog('[MediaService] Message sent successfully')
            } catch (error) {
                console.error('[MediaService] Failed to send message to service worker:', error)
            }
        } else if (this.registration.installing) {
            debugLog('[MediaService] Service worker installing, waiting for activation')
            this.registration.addEventListener('statechange', () => {
                if (this.registration.active) {
                    debugLog('[MediaService] Service worker activated, sending deferred cache request')
                    this.registration.active.postMessage({
                        type: 'CACHE_URLS',
                        urls: validUrls
                    })
                }
            })
        } else {
            debugLog('[MediaService] Service worker not active yet, deferring cache request')
        }
    }

    /**
     * Extract media URLs from layout data
     * @param {Object} layout - Layout object with regions and playlists
     * @returns {Array} Array of media URLs
     */
    extractMediaUrls(layout) {
        if (!layout || !layout.regions) {
            return []
        }

        return layout.regions
            .filter(region => region.playlist && region.playlist.mediaItems)
            .flatMap(region => this.extractUrlsFromMediaItems(region.playlist.mediaItems))
    }

    /**
     * Extract URLs from media items array
     * @param {Array} mediaItems - Array of media items
     * @returns {Array} Array of URLs
     * @private
     */
    extractUrlsFromMediaItems(mediaItems) {
        const urls = []
        
        for (const mediaItem of mediaItems) {
            if (mediaItem.uri) {
                urls.push(mediaItem.uri)
            }
            if (mediaItem.url && mediaItem.url !== mediaItem.uri) {
                urls.push(mediaItem.url)
            }
        }
        
        return urls
    }

    /**
     * Preload layout media through service worker
     * @param {Object} layout - Layout object to preload media for
     */
    preloadLayoutMedia(layout) {
        const mediaUrls = this.extractMediaUrls(layout)
        
        if (mediaUrls.length > 0) {
            debugLog(`[MediaService] Preloading ${mediaUrls.length} media items for layout: ${layout.name}`)
            this.cacheMediaUrls(mediaUrls)
        } else {
            debugLog(`[MediaService] No media URLs found in layout: ${layout.name}`)
        }
    }

    /**
     * Get service worker status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            available: this.isServiceWorkerAvailable,
            initialized: this.initialized,
            registration: !!this.registration,
            active: !!(this.registration && this.registration.active)
        }
    }

    /**
     * Debug: Show what's in the cache
     * @returns {Promise<Array>} Array of cached URLs
     */
    async inspectCache() {
        if (!this.isServiceWorkerAvailable) {
            console.log('[MediaService] Service Worker not available')
            return []
        }

        try {
            const cache = await caches.open('media-cache-v1.0.2')
            const requests = await cache.keys()
            const cachedUrls = requests.map(req => req.url)
            
            console.log(`[MediaService] Cache contains ${cachedUrls.length} items:`)
            cachedUrls.forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`)
            })
            
            return cachedUrls
        } catch (error) {
            console.error('[MediaService] Failed to inspect cache:', error)
            return []
        }
    }

    /**
     * Debug: Clear the media cache
     * @returns {Promise<boolean>} Success status
     */
    async clearCache() {
        if (!this.isServiceWorkerAvailable) {
            console.log('[MediaService] Service Worker not available')
            return false
        }

        try {
            const deleted = await caches.delete('media-cache-v1.0.2')
            console.log(`[MediaService] Cache cleared: ${deleted}`)
            return deleted
        } catch (error) {
            console.error('[MediaService] Failed to clear cache:', error)
            return false
        }
    }
}
