/**
 * Clean ScreenWerk Player - Pure Content Renderer
 * 
 * Focused solely on content delivery: Layout → Regions → Playlists → Media
 * Assumes all media is preloaded and cached by Scheduler
 */

import { debugLog } from '../../../../common/utils/debug-utils.js'
import { Playlist } from '../media/Playlist.js'

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
    async createRegions(regionsData) {
        const regionPromises = regionsData.map(async (regionData, index) => {
            try {
                const regionElement = this.createRegionElement(regionData, index)
                this.container.appendChild(regionElement)
                
                const regionId = regionData.id || `region_${index}`
                this.regions.set(regionId, {
                    element: regionElement,
                    data: regionData,
                    playlist: null // Will be set by setRegionContent
                })
                
                // Set region content (async) ONLY here (createRegionElement no longer calls it)
                await this.setRegionContent(regionElement, regionData, index)
                
                debugLog(`[Player] Created region: ${regionId}`)
            } catch (error) {
                console.error(`[Player] Failed to create region ${index}:`, error)
            }
        })

        // Wait for all regions to be created
        await Promise.all(regionPromises)
        debugLog('[Player] All regions created')
    }

    /**
     * Create a single region element
     * @param {Object} regionData - Region configuration
     * @param {number} index - Region index
     * @returns {HTMLElement} Region DOM element
     * @private
     */
    createRegionElement(regionData, index) {
        const regionElement = document.createElement('div')
        regionElement.className = 'screenwerk-region'
        regionElement.id = `region_${regionData.id || index}`
        
        this.setRegionStyles(regionElement, regionData)

        return regionElement
    }

    /**
     * Set region positioning and styling
     * @param {HTMLElement} element - Region element
     * @param {Object} regionData - Region configuration
     * @private
     */
    setRegionStyles(element, regionData) {
        element.style.position = 'absolute'
        
        // Use percentage positioning if available, otherwise fallback to pixels
        if (regionData.isPercentage) {
            element.style.left = `${regionData.left}%`
            element.style.top = `${regionData.top}%`
            element.style.width = `${regionData.width}%`
            element.style.height = `${regionData.height}%`
        } else {
            element.style.left = `${regionData.left}px`
            element.style.top = `${regionData.top}px`
            element.style.width = `${regionData.width}px`
            element.style.height = `${regionData.height}px`
        }
        
        element.style.zIndex = regionData.zindex
        
        // Add debug styling in development mode
        if (window.debugMode) {
            element.style.border = '2px dashed rgba(0,255,0,0.5)'
            element.style.backgroundColor = 'rgba(0,255,0,0.1)'
        }
    }

    /**
     * Set region content with actual playlist rendering
     * @param {HTMLElement} element - Region element
     * @param {Object} regionData - Region configuration
     * @param {number} index - Region index
     * @private
     */
    async setRegionContent(element, regionData, index) {
        const regionId = regionData.id || `region_${index}`
        
        try {
            if (regionData.playlist && regionData.playlist.mediaItems && regionData.playlist.mediaItems.length > 0) {
                // Create and load playlist with actual media
                const playlist = new Playlist(regionData.playlist, element)
                const loaded = await playlist.load()
                
                if (loaded) {
                    // Store playlist reference for later control
                    this.regions.get(regionId).playlist = playlist
                    debugLog(`[Player] Loaded playlist for region ${regionId}: ${regionData.playlist.name}`)
                } else {
                    this.showRegionError(element, regionId, 'Failed to load playlist')
                }
            } else {
                // No media - show empty state
                this.showEmptyRegion(element, regionId)
            }
        } catch (error) {
            console.error(`[Player] Error setting content for region ${regionId}:`, error)
            this.showRegionError(element, regionId, error.message)
        }
    }

    /**
     * Show empty region state
     * @param {HTMLElement} element - Region element
     * @param {string} regionId - Region identifier
     * @private
     */
    showEmptyRegion(element, regionId) {
        element.innerHTML = `
            <div class="region-empty" style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #666;
                background: rgba(0,0,0,0.1);
                font-family: Arial, sans-serif;
                text-align: center;
            ">
                <div>
                    <div style="font-size: 24px; margin-bottom: 10px;">📋</div>
                    <div style="font-weight: bold;">Empty Region</div>
                    <div style="font-size: 12px; margin-top: 5px;">${regionId}</div>
                </div>
            </div>
        `
    }

    /**
     * Show region error state
     * @param {HTMLElement} element - Region element
     * @param {string} regionId - Region identifier
     * @param {string} error - Error message
     * @private
     */
    showRegionError(element, regionId, error) {
        element.innerHTML = `
            <div class="region-error" style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #ff6b6b;
                background: rgba(255,0,0,0.1);
                font-family: Arial, sans-serif;
                text-align: center;
            ">
                <div>
                    <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                    <div style="font-weight: bold;">Region Error</div>
                    <div style="font-size: 12px; margin-top: 5px;">${regionId}</div>
                    <div style="font-size: 10px; margin-top: 5px; opacity: 0.8;">${error}</div>
                </div>
            </div>
        `
    }

    /**
     * Start playback of all playlists
     * @returns {boolean} Success status
     */
    play() {
        if (this.destroyed) {
            console.error('[Player] Cannot play - player is destroyed')
            return false
        }

        if (!this.currentLayout) {
            console.error('[Player] Cannot play - no layout loaded')
            return false
        }
            // Idempotent guard
            if (this.isPlaying) {
                // Already playing, skip restarting playlists
                return true
            }

        this.isPlaying = true
        let playlistsStarted = 0
        
        // Start all playlists in regions
        this.regions.forEach((regionInfo, regionId) => {
            if (regionInfo.playlist) {
                const started = regionInfo.playlist.play()
                if (started) {
                    playlistsStarted++
                    debugLog(`[Player] Started playlist in region: ${regionId}`)
                }
            }
        })
        
        debugLog(`[Player] Playback started - ${playlistsStarted} playlists playing`)
        if (playlistsStarted > 0) {
            this.emit('player:play')
            this.emit('player:stateChange')
        }
        return playlistsStarted > 0
    }

    /**
     * Pause playback of all playlists
     * @returns {boolean} Success status
     */
    pause() {
        if (this.destroyed) {
            console.error('[Player] Cannot pause - player is destroyed')
            return false
        }

        this.isPlaying = false
        
        // Pause all playlists in regions
        this.regions.forEach((regionInfo, regionId) => {
            if (regionInfo.playlist) {
                regionInfo.playlist.pause()
                debugLog(`[Player] Paused playlist in region: ${regionId}`)
            }
        })
        
        debugLog('[Player] Playback paused')
    this.emit('player:pause')
    this.emit('player:stateChange')
        return true
    }

    /**
     * Resume playback
     * @returns {boolean} Success status
     */
    resume() {
        return this.play()
    }

    /**
     * Clean up current layout and destroy playlists
     * @private
     */
    cleanup() {
        // Destroy all playlists first
        this.regions.forEach((regionInfo, regionId) => {
            if (regionInfo.playlist) {
                regionInfo.playlist.destroy()
                debugLog(`[Player] Destroyed playlist in region: ${regionId}`)
            }
        })
        
        // Clear regions
        this.regions.clear()
        
        // Clear container
        this.container.innerHTML = ''
        
        // Reset layout
        this.currentLayout = null
        
        debugLog('[Player] Cleanup completed')
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @private
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="player-error" style="
                color: red; 
                background: rgba(255,0,0,0.1); 
                border: 2px solid red; 
                padding: 20px; 
                text-align: center;
                font-family: Arial, sans-serif;
            ">
                <h3>Player Error</h3>
                <p>${message}</p>
            </div>
        `
    }

    /**
     * Destroy the player and clean up resources
     */
    destroy() {
        if (this.destroyed) {
            return
        }

        this.pause()
        this.cleanup()
        
        this.container.classList.remove('screenwerk-player')
        this.container.style.position = ''
        this.container.style.overflow = ''
        
        this.destroyed = true
        
        debugLog('[Player] Player destroyed')
    this.emit('player:destroyed')
    this.emit('player:stateChange')
    }

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
