/**
 * Clean ScreenWerk Player - Pure Content Renderer
 * 
 * Focused solely on content delivery: Layout → Regions → Playlists → Media
 * Assumes all media is preloaded and cached by Scheduler
 */

import { debugLog } from '../../../../common/utils/debug-utils.js'
import { createRegions as wiringCreateRegions } from '../core/player/RegionWiring.js'
import { play as playbackPlay, pause as playbackPause, resume as playbackResume, cleanup as playbackCleanup, destroy as playbackDestroy, showError as playbackShowError } from '../core/player/PlayerPlayback.js'

export class ScreenWerkPlayer {
    /**
     * Create a new clean player instance
     * @param {HTMLElement} container - DOM element where player renders content
     */
    constructor(container) {
        if (!container) {
            throw new Error('Player requires a container element')
        }

        this.container = container
        this.currentLayout = null
        this.isPlaying = false
        this.regions = new Map()
        this.destroyed = false
    this.autoStart = true // Auto start playback after layout load by default

        // Initialize container
        this.initializeContainer()

        debugLog('[Player] Clean ScreenWerk Player initialized')
    }

    /**
     * Emit a player lifecycle event on the container for external UI to react
     * @param {string} name
     * @param {Object} [detail]
     * @private
     */
    emit(name, detail = {}) {
        try {
            this.container.dispatchEvent(new CustomEvent(name, { detail: { player: this, ...detail } }))
        } catch {
            // Fail silently – events are best-effort for demo tooling
        }
    }

    /**
     * Initialize the container element
     * @private
     */
    initializeContainer() {
        this.container.classList.add('screenwerk-player')
        this.container.style.position = 'relative'
        this.container.style.overflow = 'hidden'
        this.container.innerHTML = '' // Clear any existing content
    }

    /**
     * Load and render a layout
     * @param {Object} layout - Simple layout object from scheduler
     * @param {string} layout.id - Layout identifier
     * @param {string} layout.name - Layout name
     * @param {number} layout.width - Layout width in pixels
     * @param {number} layout.height - Layout height in pixels
     * @param {Array} layout.regions - Array of region objects
     * @returns {Promise<boolean>} Success status
     */
    async loadLayout(layout) {
        if (this.destroyed) {
            console.error('[Player] Cannot load layout - player is destroyed')
            return false
        }

        try {
            debugLog(`[Player] Loading layout: ${layout.name} (${layout.id})`)

            // Validate layout structure
            if (!this.validateLayout(layout)) {
                throw new Error('Invalid layout structure')
            }

            // Clean up current layout
            this.cleanup()

            // Store current layout (ignore layout dimensions, use container's natural size)
            this.currentLayout = layout

            // Create regions (media should already be preloaded by Scheduler)
            await this.createRegions(layout.regions)

            debugLog(`[Player] Layout loaded successfully: ${layout.name}`)
            this.emit('player:layoutLoaded', { layout })
            if (this.autoStart) {
                this.play()
            }
            return true

        } catch (error) {
            console.error('[Player] Failed to load layout:', error)
            this.showError(`Failed to load layout: ${error.message}`)
            return false
        }
    }

    /**
     * Validate layout structure
     * @param {Object} layout - Layout to validate
     * @returns {boolean} Validation result
     * @private
     */
    validateLayout(layout) {
        if (!layout || typeof layout !== 'object') {
            console.error('[Player] Layout is not an object')
            return false
        }

        if (!layout.id || !layout.name) {
            console.error('[Player] Layout missing required id or name')
            return false
        }

        if (!Array.isArray(layout.regions)) {
            console.error('[Player] Layout regions is not an array')
            return false
        }

        return true
    }

    /**
     * Create regions from layout data
     * @param {Array} regionsData - Array of region objects
     * @private
     */
    async createRegions(regionsData) { return wiringCreateRegions(this, regionsData) }


    /**
     * Start playback of all playlists
     * @returns {boolean} Success status
     */
    play() { return playbackPlay(this) }

    /**
     * Pause playback of all playlists
     * @returns {boolean} Success status
     */
    pause() { return playbackPause(this) }

    /**
     * Resume playback
     * @returns {boolean} Success status
     */
    resume() { return playbackResume(this) }

    /**
     * Clean up current layout and destroy playlists
     * @private
     */
    cleanup() { return playbackCleanup(this) }

    /**
     * Show error message
     * @param {string} message - Error message
     * @private
     */
    showError(message) { return playbackShowError(this, message) }

    /**
     * Destroy the player and clean up resources
     */
    destroy() { return playbackDestroy(this) }

    /**
     * Get current player state
     * @returns {Object} Player state information
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            currentLayout: this.currentLayout?.name || null,
            regionCount: this.regions.size,
            destroyed: this.destroyed
        }
    }
}
