/**
 * Base Media Class - Foundation for all media types
 * 
 * Provides common functionality for media rendering, validation, and lifecycle
 */

import { debugLog } from '../../../../../shared/utils/debug-utils.js'

export class BaseMedia {
    /**
     * Create a new media instance
     * @param {Object} mediaData - Media configuration from API
     * @param {HTMLElement} container - Parent container element
     */
    constructor(mediaData, container) {
        if (!mediaData || !container) {
            throw new Error('Media requires mediaData and container')
        }

        this.mediaData = mediaData
        this.container = container
        this.element = null
        this.isLoaded = false
        this.isPlaying = false
        this.duration = mediaData.duration || 10 // Default 10 seconds
        this.startTime = null
        this.timeoutId = null
        this.completed = false

        debugLog(`[BaseMedia] Created ${this.getType()} media: ${this.mediaData.name}`)
    }

    /**
     * Get media type - override in subclasses
     * @returns {string} Media type
     */
    getType() {
        return 'base'
    }

    /**
     * Instance debug logger for subclasses
     * @param {string} message - Debug message
     */
    debug(message) {
        debugLog(`[BaseMedia] ${message}`)
    }

    /**
     * Validate media data
     * @returns {boolean} Is valid
     */
    validate() {
        // Check required fields
        if (!this.mediaData.name || !this.mediaData.uri) {
            console.error('[BaseMedia] Missing required fields (name, uri)')
            return false
        }

        // Check valid_from/valid_to dates if present
        const now = new Date()
        if (this.mediaData.valid_from) {
            const validFrom = new Date(this.mediaData.valid_from)
            if (now < validFrom) {
                debugLog(`[BaseMedia] Media not yet valid: ${this.mediaData.name}`)
                return false
            }
        }

        if (this.mediaData.valid_to) {
            const validTo = new Date(this.mediaData.valid_to)
            if (now > validTo) {
                debugLog(`[BaseMedia] Media expired: ${this.mediaData.name}`)
                return false
            }
        }

        return true
    }

    /**
     * Create the media element - override in subclasses
     * @returns {HTMLElement} Media element
     */
    createElement() {
        const element = document.createElement('div')
        element.className = 'media-element base-media'
        element.textContent = `${this.getType()}: ${this.mediaData.name}`
        return element
    }

    /**
     * Load and display the media
     * @returns {Promise<boolean>} Success status
     */
    async load() {
        try {
            if (!this.validate()) {
                return false
            }

            this.element = this.createElement()
            this.container.appendChild(this.element)
            this.isLoaded = true

            debugLog(`[BaseMedia] Loaded ${this.getType()}: ${this.mediaData.name}`)
            return true
        } catch (error) {
            console.error(`[BaseMedia] Failed to load ${this.getType()}:`, error)
            return false
        }
    }

    /**
     * Start playing the media
     * @returns {boolean} Success status
     */
    play() {
        if (!this.isLoaded) {
            console.error('[BaseMedia] Cannot play - media not loaded')
            return false
        }

        this.isPlaying = true
        this.startTime = Date.now()
        this.completed = false

        // Set up duration timeout
        this.timeoutId = setTimeout(() => {
            this.onComplete()
        }, this.duration * 1000)

        debugLog(`[BaseMedia] Playing ${this.getType()}: ${this.mediaData.name} for ${this.duration}s`)
        return true
    }

    /**
     * Stop playing the media
     */
    stop() {
        this.isPlaying = false
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
        debugLog(`[BaseMedia] Stopped ${this.getType()}: ${this.mediaData.name}`)
    }

    /**
     * Handle media completion
     * @private
     */
    onComplete() {
        if (this.completed) return
        this.completed = true
        this.stop()
        debugLog(`[BaseMedia] Completed ${this.getType()}: ${this.mediaData.name}`)

        // Emit completion event for playlist management
        this.container.dispatchEvent(new CustomEvent('mediaComplete', {
            detail: { media: this }
        }))
    }

    /**
     * Clean up and remove media
     */
    destroy() {
        this.stop()

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element)
        }

        this.element = null
        this.isLoaded = false
        debugLog(`[BaseMedia] Destroyed ${this.getType()}: ${this.mediaData.name}`)
    }

    /**
     * Get remaining playback time in seconds
     * @returns {number} Remaining time
     */
    getRemainingTime() {
        if (!this.isPlaying || !this.startTime) return 0

        const elapsed = (Date.now() - this.startTime) / 1000
        return Math.max(0, this.duration - elapsed)
    }

    /**
     * Fast restart for single-item playlist loops (override in subclasses)
     * @returns {boolean} Success status
     */
    fastLoopRestart() {
        // Default: fallback to standard destroy/recreate cycle
        return false
    }
}
