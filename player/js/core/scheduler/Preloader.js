// Preloader.js - Media preloading for layouts via MediaService
// Responsibility: Given layout + mediaService, initiate caching of media URLs

import { debugLog } from '../../../../shared/utils/debug-utils.js'

export async function preloadLayoutMedia(layout, mediaService, mediaServiceReady) {
    if (!mediaServiceReady) {
        debugLog('[Preloader] Media service not ready, skipping preload')
        return
    }

    debugLog(`[Preloader] Preloading media for layout: ${layout.name}`)

    const mediaUrls = mediaService.extractMediaUrls(layout)
    if (mediaUrls.length === 0) {
        debugLog('[Preloader] No media URLs found to preload')
        return
    }

    debugLog(`[Preloader] Found ${mediaUrls.length} media items to preload`)
    mediaService.cacheMediaUrls(mediaUrls)
    await new Promise(resolve => setTimeout(resolve, 100))
    debugLog('[Preloader] Media preloading initiated')
}
