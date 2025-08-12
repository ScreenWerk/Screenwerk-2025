/**
 * Image Media Handler - Displays image content
 * 
 * Handles image rendering with proper sizing, positioning, and error handling
 */

import { BaseMedia } from './BaseMedia.js'
import { debugLog } from '../../../../../shared/utils/debug-utils.js'

export class ImageMedia extends BaseMedia {
    /**
     * Create a new image media instance
     * @param {Object} mediaData - Image media configuration
     * @param {HTMLElement} container - Parent container element
     */
    constructor(mediaData, container) {
        super(mediaData, container)

        this.image = null
        this.loadPromise = null
        // Always use fill (stretch) behavior - stretch property removed from pipeline
    }

    /**
     * Get media type
     * @returns {string} Media type
     */
    getType() {
        return 'image'
    }

    /**
     * Validate image-specific data
     * @returns {boolean} Is valid
     */
    validate() {
        if (!super.validate()) return false

        // Check if URI looks like an image
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
        const hasImageExtension = imageExtensions.some(ext =>
            this.mediaData.uri.toLowerCase().includes(ext)
        )

        if (!hasImageExtension) {
            debugLog(`[ImageMedia] URI may not be an image: ${this.mediaData.uri}`)
            // Don't fail validation - URI might be dynamic or API endpoint
        }

        return true
    }

    /**
     * Create the image element
     * @returns {HTMLElement} Image container element
     */
    createElement() {
        const container = document.createElement('div')
        container.className = 'media-element image-media'
        container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
        `

        const img = document.createElement('img')
        img.style.cssText = this.getImageStyles()
        img.alt = this.mediaData.name || 'ScreenWerk Image'

        // Try to handle CORS issues
        img.crossOrigin = 'anonymous'

        // Error handling for display purposes
        img.addEventListener('error', (event) => {
            console.error(`[ImageMedia] Failed to load image: ${this.mediaData.uri}`)
            console.error('[ImageMedia] Error event:', event)
            console.error('[ImageMedia] Image src:', img.src)
            console.error('[ImageMedia] Image naturalWidth:', img.naturalWidth)
            console.error('[ImageMedia] Image naturalHeight:', img.naturalHeight)
            this.showErrorState(container)
        })

        // Success handling for display purposes
        img.addEventListener('load', () => {
            container.classList.add('loaded')
        })

        container.appendChild(img)
        this.image = img

        return container
    }

    /**
     * Get CSS styles for image - always use fill behavior
     * @returns {string} CSS styles
     * @private
     */
    getImageStyles() {
        const baseStyles = `
            max-width: 100%;
            max-height: 100%;
            display: block;
        `

        // Always stretch images to fill container exactly
        // stretch property removed from data pipeline - always use fill behavior
        return baseStyles + `
            width: 100%;
            height: 100%;
            object-fit: fill;
        `
    }

    /**
     * Show error state when image fails to load
     * @param {HTMLElement} container - Container element
     * @private
     */
    showErrorState(container) {
        container.innerHTML = `
            <div style="
                color: #ff6b6b;
                background: rgba(0,0,0,0.8);
                padding: 20px;
                text-align: center;
                border-radius: 8px;
                font-family: Arial, sans-serif;
            ">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div style="font-weight: bold; margin-bottom: 5px;">Image Load Failed</div>
                <div style="font-size: 12px; opacity: 0.8;">${this.mediaData.name}</div>
            </div>
        `
    }

    /**
     * Load and display the image
     * @returns {Promise<boolean>} Success status
     */
    async load() {
        try {
            if (!this.validate()) {
                return false
            }

            this.element = this.createElement()

            // Start loading the image
            this.loadPromise = this.loadImage()

            this.container.appendChild(this.element)
            this.isLoaded = true

            debugLog(`[ImageMedia] Loading image: ${this.mediaData.name}`)
            return true
        } catch (error) {
            console.error('[ImageMedia] Failed to load image:', error)
            return false
        }
    }

    /**
     * Load the image with promise
     * @returns {Promise<boolean>} Load success
     * @private
     */
    loadImage() {
        return new Promise((resolve, reject) => {
            if (!this.image) {
                reject(new Error('Image element not created'))
                return
            }

            const timeout = setTimeout(() => {
                reject(new Error('Image load timeout'))
            }, 30000) // 30 second timeout

            this.image.addEventListener('load', () => {
                clearTimeout(timeout)
                debugLog(`[ImageMedia] Image loaded successfully: ${this.mediaData.name}`)
                debugLog(`[ImageMedia] Image dimensions: ${this.image.naturalWidth}x${this.image.naturalHeight}`)
                resolve(true)
            }, { once: true })

            this.image.addEventListener('error', (event) => {
                clearTimeout(timeout)
                console.error('[ImageMedia] Promise-based load error:', event)
                reject(new Error('Image load error'))
            }, { once: true })

            // Use original URL without cache-busting
            // ScreenWerk media server doesn't support query parameters
            const imageUrl = this.mediaData.uri

            debugLog(`[ImageMedia] Setting image src: ${imageUrl}`)

            // Start loading
            this.image.src = imageUrl
        })
    }

    /**
     * Start playing the image (show for duration)
     * @returns {boolean} Success status
     */
    play() {
        if (!this.isLoaded) {
            console.error('[ImageMedia] Cannot play - image not loaded')
            return false
        }

        // Wait for image to load before starting timer
        if (this.loadPromise) {
            this.loadPromise
                .then(() => {
                    super.play()
                })
                .catch(() => {
                    console.error('[ImageMedia] Image failed to load, starting timer anyway')
                    super.play()
                })
        } else {
            super.play()
        }

        return true
    }

    /**
     * Clean up image resources
     */
    destroy() {
        if (this.image) {
            // Clear src first to stop any loading
            this.image.src = ''

            // Set a data URL to prevent fallback to current page
            this.image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

            this.image = null
        }

        this.loadPromise = null
        super.destroy()

        debugLog(`[ImageMedia] Image media destroyed: ${this.mediaData.name}`)
    }

    /**
     * Fast restart for single-item playlist loops
     * Reuses existing image element instead of destroy/recreate
     * @returns {boolean} Success status
     */
    fastLoopRestart() {
        if (!this.element || !this.isLoaded) {
            debugLog('[ImageMedia] Fast restart failed: image not ready')
            return false
        }

        try {
            // Reset completion flag
            this.completed = false

            // Clear any existing timeout
            if (this.timeoutId) {
                clearTimeout(this.timeoutId)
                this.timeoutId = null
            }

            // Restart playback state
            this.isPlaying = true
            this.startTime = Date.now()

            // Restart duration timer
            this.timeoutId = setTimeout(() => {
                this.onComplete()
            }, this.duration * 1000)

            debugLog(`[ImageMedia] Fast loop restart (single-item playlist): ${this.mediaData.name}`)
            return true

        } catch (error) {
            debugLog(`[ImageMedia] Fast restart error: ${error.message}`)
            return false
        }
    }
}
