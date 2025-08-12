/**
 * Playlist Manager - Handles media progression and timing
 * 
 * Manages a sequence of media items with automatic progression
 */

import { MediaFactory } from './MediaFactory.js'
import { debugLog } from '../../../../../shared/utils/debug-utils.js'

export class Playlist {
    /**
     * Create a new playlist
     * @param {Object} playlistData - Playlist configuration
     * @param {HTMLElement} container - Parent container element
     */
    constructor(playlistData, container) {
        if (!playlistData || !container) {
            throw new Error('Playlist requires playlistData and container')
        }

        this.playlistData = playlistData
        this.container = container
        this.mediaItems = playlistData.mediaItems || []
        this.currentIndex = 0
        this.currentMedia = null
        this.isPlaying = false
        this.loop = playlistData.loop !== false // Default to loop (only false if explicitly false)
        this.loopCounter = 0 // Track number of completed loops
        debugLog(`[Playlist] Loop flag: ${this.loop}`)
        this.progressionTimer = null

        debugLog(`[Playlist] Created playlist: ${this.playlistData.name} with ${this.mediaItems.length} items`)

        // Listen for media completion events (store bound ref for proper removal)
        this._boundHandleMediaComplete = this.handleMediaComplete.bind(this)
        this.container.addEventListener('mediaComplete', this._boundHandleMediaComplete)
    }

    /**
     * Validate playlist data
     * @returns {boolean} Is valid
     */
    validate() {
        if (!Array.isArray(this.mediaItems)) {
            console.error('[Playlist] mediaItems is not an array')
            return false
        }

        if (this.mediaItems.length === 0) {
            debugLog('[Playlist] Playlist is empty')
            return true // Empty playlist is valid, just won't play anything
        }

        return true
    }

    /**
     * Load the playlist (prepare first media item)
     * @returns {Promise<boolean>} Success status
     */
    async load() {
        try {
            if (!this.validate()) {
                return false
            }

            if (this.mediaItems.length === 0) {
                debugLog('[Playlist] No media items to load')
                return true
            }

            // Load first media item
            await this.loadMediaAtIndex(0)

            debugLog(`[Playlist] Loaded playlist: ${this.playlistData.name}`)
            return true
        } catch (error) {
            console.error('[Playlist] Failed to load playlist:', error)
            return false
        }
    }

    /**
     * Load media at specific index
     * @param {number} index - Media index to load
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async loadMediaAtIndex(index) {
        if (index < 0 || index >= this.mediaItems.length) {
            console.error(`[Playlist] Invalid media index: ${index}`)
            return false
        }

        // Prevent race: if already loading same index, skip
        if (this._loadingIndex === index) {
            return false
        }
        this._loadingIndex = index

        await this.prepareContainerForIndexChange(index)

        const mediaData = this.mediaItems[index]

        const result = await this.instantiateAndLoadMedia(mediaData, index)
        this._loadingIndex = null
        return result
    }

    async prepareContainerForIndexChange(index) {
        // Clean up current media (only if changing index)
        if (this.currentMedia && this.currentIndex !== index) {
            this.currentMedia.destroy()
            this.currentMedia = null
            this.container.innerHTML = ''
            await new Promise(resolve => setTimeout(resolve, 20))
        } else if (!this.currentMedia) {
            this.container.innerHTML = ''
        }
    }

    async instantiateAndLoadMedia(mediaData, index) {
        try {
            this.currentMedia = MediaFactory.createMedia(mediaData, this.container)
            const loaded = await this.currentMedia.load()
            if (loaded) {
                this.currentIndex = index
                debugLog(`[Playlist] Loaded media ${index}: ${mediaData.name}`)
                return true
            } else {
                console.error(`[Playlist] Failed to load media ${index}: ${mediaData.name}`)
                return false
            }
        } catch (error) {
            console.error(`[Playlist] Error loading media ${index}:`, error)
            return false
        }
    }

    /**
     * Start playlist playback
     * @returns {boolean} Success status
     */
    play() {
        if (this.mediaItems.length === 0) {
            debugLog('[Playlist] Cannot play empty playlist')
            return false
        }
        if (!this.currentMedia) {
            console.error('[Playlist] No current media to play')
            return false
        }
        if (this.isPlaying) {
            // Idempotent: already playing
            return true
        }
        this.isPlaying = true
        const success = this.currentMedia.play()

        if (success) {
            debugLog(`[Playlist] Started playing media ${this.currentIndex}: ${this.mediaItems[this.currentIndex].name}`)
        }

        return success
    }

    /**
     * Pause playlist playback
     */
    pause() {
        this.isPlaying = false

        if (this.currentMedia) {
            this.currentMedia.stop()
        }

        if (this.progressionTimer) {
            clearTimeout(this.progressionTimer)
            this.progressionTimer = null
        }

        debugLog('[Playlist] Paused')
    }

    /**
     * Stop playlist playback
     */
    stop() {
        this.pause()
        this.currentIndex = 0
        debugLog('[Playlist] Stopped')
    }

    /**
     * Move to next media item
     * @returns {Promise<boolean>} Success status
     */
    async next() {
        if (this.mediaItems.length === 0) return false

        const nextIndex = this.getNextIndex()
        if (nextIndex === -1) {
            return false // End reached, no loop
        }

        // Try fast restart for single-item loops
        if (await this.tryFastRestart(nextIndex)) {
            return true
        }

        // Standard load path
        const loaded = await this.loadMediaAtIndex(nextIndex)
        return loaded && this.isPlaying ? this.currentMedia.play() : loaded
    }

    /**
     * Get next index, handling loop logic
     * @returns {number} Next index or -1 if end reached
     * @private
     */
    getNextIndex() {
        let nextIndex = this.currentIndex + 1

        if (nextIndex >= this.mediaItems.length) {
            if (this.loop) {
                this.loopCounter++
                debugLog(`[Playlist] Looping back to first item (loop #${this.loopCounter})`)
                return 0
            } else {
                debugLog('[Playlist] Reached end, no loop')
                this.isPlaying = false
                return -1
            }
        }

        return nextIndex
    }

    /**
     * Try fast restart for single-item playlists
     * @param {number} nextIndex - Target index
     * @returns {Promise<boolean>} True if fast restart succeeded
     * @private
     */
    async tryFastRestart(nextIndex) {
        if (nextIndex === 0 && this.mediaItems.length === 1 && this.currentMedia) {
            const fastRestarted = this.currentMedia.fastLoopRestart()
            if (fastRestarted) {
                return true
            }
            debugLog('[Playlist] Fast restart failed, falling back to standard reload')
        }
        return false
    }

    /**
     * Handle media completion event
     * @param {Event} _event - Media completion event
     * @private
     */
    async handleMediaComplete(_event) {
        if (!this.isPlaying) return

        debugLog('[Playlist] Media completed, advancing to next')

        // Small delay before advancing to next
        this.progressionTimer = setTimeout(async () => {
            await this.next()
        }, 100)
    }

    /**
     * Get current media info
     * @returns {Object|null} Current media info
     */
    getCurrentMediaInfo() {
        if (!this.currentMedia || this.currentIndex >= this.mediaItems.length) {
            return null
        }

        return {
            index: this.currentIndex,
            total: this.mediaItems.length,
            media: this.mediaItems[this.currentIndex],
            remainingTime: this.currentMedia.getRemainingTime()
        }
    }

    /**
     * Get playlist status
     * @returns {Object} Playlist status
     */
    getStatus() {
        return {
            name: this.playlistData.name,
            isPlaying: this.isPlaying,
            currentIndex: this.currentIndex,
            totalItems: this.mediaItems.length,
            loop: this.loop,
            loopCounter: this.loopCounter,
            currentMedia: this.getCurrentMediaInfo()
        }
    }

    /**
     * Clean up playlist resources
     */
    destroy() {
        this.stop()

        if (this.currentMedia) {
            this.currentMedia.destroy()
            this.currentMedia = null
        }

        if (this._boundHandleMediaComplete) {
            this.container.removeEventListener('mediaComplete', this._boundHandleMediaComplete)
            this._boundHandleMediaComplete = null
        }
        this.container.innerHTML = ''

        debugLog(`[Playlist] Destroyed playlist: ${this.playlistData.name}`)
    }
}
