/**
 * Media Factory - Creates appropriate media handlers
 * 
 * Determines media type and instantiates the correct handler class
 */

import { ImageMedia } from './ImageMedia.js'
import { VideoMedia } from './VideoMedia.js'
import { BaseMedia } from './BaseMedia.js'
import { debugLog } from '../../../../../shared/utils/debug-utils.js'

export class MediaFactory {
    /**
     * Create appropriate media handler for given media data
     * @param {Object} mediaData - Media configuration from API
     * @param {HTMLElement} container - Parent container element
     * @returns {BaseMedia} Media handler instance
     */
    static createMedia(mediaData, container) {
        if (!mediaData || !container) {
            throw new Error('MediaFactory requires mediaData and container')
        }

        const mediaType = MediaFactory.detectMediaType(mediaData)
        
        switch (mediaType) {
            case 'image':
                debugLog(`[MediaFactory] Creating ImageMedia: ${mediaData.name}`)
                return new ImageMedia(mediaData, container)
            
            case 'video':
                debugLog(`[MediaFactory] Creating VideoMedia: ${mediaData.name}`)
                return new VideoMedia(mediaData, container)
            
            case 'text':
                // TODO: Implement TextMedia in future
                debugLog(`[MediaFactory] Text media not yet implemented: ${mediaData.name}`)
                return new BaseMedia(mediaData, container)
            
            default:
                debugLog(`[MediaFactory] Unknown media type '${mediaType}', using BaseMedia: ${mediaData.name}`)
                return new BaseMedia(mediaData, container)
        }
    }

    /**
     * Detect media type from media data
     * @param {Object} mediaData - Media configuration
     * @returns {string} Detected media type
     * @private
     */
    static detectMediaType(mediaData) {
        // Check explicit type first
        if (mediaData.type) {
            return mediaData.type.toLowerCase()
        }

        // Detect from URI extension
        const uri = mediaData.uri?.toLowerCase() || ''
        
        // Image extensions
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
        if (imageExtensions.some(ext => uri.includes(ext))) {
            return 'image'
        }

        // Video extensions
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv']
        if (videoExtensions.some(ext => uri.includes(ext))) {
            return 'video'
        }

        // Text/HTML content
        if (uri.includes('.html') || uri.includes('.txt')) {
            return 'text'
        }

        // Default fallback - use BaseMedia for unknown types (including videos)
        debugLog(`[MediaFactory] Could not detect type for: ${uri}, using BaseMedia fallback`)
        return 'unknown'
    }

    /**
     * Get supported media types
     * @returns {Array<string>} Supported media types
     */
    static getSupportedTypes() {
        return ['image', 'video', 'text']
    }

    /**
     * Check if media type is supported
     * @param {string} type - Media type to check
     * @returns {boolean} Is supported
     */
    static isTypeSupported(type) {
        return MediaFactory.getSupportedTypes().includes(type?.toLowerCase())
    }
}
