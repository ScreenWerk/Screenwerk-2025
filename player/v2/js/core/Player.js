/**
 * Clean ScreenWerk Player - Pure Content Renderer
 * 
 * Focused solely on content delivery: Layout → Regions → Playlists → Media
 * No administrative concerns, no configuration management
 */

import { debugLog } from '../../../common/utils/debug-utils.js'

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

        // Initialize container
        this.initializeContainer()

        debugLog('[Player] Clean ScreenWerk Player initialized')
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
     * @returns {boolean} Success status
     */
    loadLayout(layout) {
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

            // Set container dimensions
            this.setDimensions(layout.width, layout.height)

            // Store current layout
            this.currentLayout = layout

            // Create regions
            this.createRegions(layout.regions)

            debugLog(`[Player] Layout loaded successfully: ${layout.name}`)
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
     * Set container dimensions
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     * @private
     */
    setDimensions(width, height) {
        if (width && height) {
            this.container.style.width = `${width}px`
            this.container.style.height = `${height}px`
            debugLog(`[Player] Set dimensions: ${width}x${height}`)
        }
    }

    /**
     * Create regions from layout data
     * @param {Array} regionsData - Array of region objects
     * @private
     */
    createRegions(regionsData) {
        regionsData.forEach((regionData, index) => {
            try {
                const regionElement = this.createRegionElement(regionData, index)
                this.container.appendChild(regionElement)
                this.regions.set(regionData.id || `region_${index}`, {
                    element: regionElement,
                    data: regionData
                })
                debugLog(`[Player] Created region: ${regionData.id || `region_${index}`}`)
            } catch (error) {
                console.error(`[Player] Failed to create region ${index}:`, error)
            }
        })
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
        this.setRegionContent(regionElement, regionData, index)

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
        element.style.left = `${regionData.left || 0}px`
        element.style.top = `${regionData.top || 0}px`
        element.style.width = `${regionData.width || 100}px`
        element.style.height = `${regionData.height || 100}px`
        element.style.zIndex = regionData.zindex || 0
        
        // Add debug styling in development mode
        if (window.debugMode) {
            element.style.border = '2px dashed rgba(0,255,0,0.5)'
            element.style.backgroundColor = 'rgba(0,255,0,0.1)'
        }
    }

    /**
     * Set region content
     * @param {HTMLElement} element - Region element
     * @param {Object} regionData - Region configuration
     * @param {number} index - Region index
     * @private
     */
    setRegionContent(element, regionData, index) {
        const regionId = regionData.id || `region_${index}`
        const playlistName = regionData.playlist?.name || 'Unknown'
        const mediaCount = regionData.playlist?.media?.length || 0

        element.innerHTML = `
            <div class="region-info" style="color: white; background: rgba(0,0,0,0.7); padding: 5px; font-size: 12px;">
                Region: ${regionId}<br>
                Playlist: ${playlistName}<br>
                Media: ${mediaCount} items
            </div>
        `
    }

    /**
     * Start playback
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

        this.isPlaying = true
        debugLog('[Player] Playback started')
        
        // TODO: Implement actual media playback logic
        // For now, just mark as playing
        
        return true
    }

    /**
     * Pause playback
     * @returns {boolean} Success status
     */
    pause() {
        if (this.destroyed) {
            console.error('[Player] Cannot pause - player is destroyed')
            return false
        }

        this.isPlaying = false
        debugLog('[Player] Playback paused')
        
        // TODO: Implement actual media pause logic
        
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
     * Clean up current layout
     * @private
     */
    cleanup() {
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
        this.container.style.width = ''
        this.container.style.height = ''
        
        this.destroyed = true
        
        debugLog('[Player] Player destroyed')
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
