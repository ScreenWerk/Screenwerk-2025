/**
 * Image Media Handler - Displays image content
 * 
 * Handles image rendering with proper sizing, positioning, and error handling
 */

import { BaseMedia } from './BaseMedia.js'
import { debugLog } from '../../../../../common/utils/debug-utils.js'

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
        this.stretch = mediaData.stretch || 'cover' // cover, contain, fill, none
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
        
        // Error handling
        img.addEventListener('error', () => {
            console.error(`[ImageMedia] Failed to load image: ${this.mediaData.uri}`)
            this.showErrorState(container)
        })

        img.addEventListener('load', () => {
            debugLog(`[ImageMedia] Image loaded successfully: ${this.mediaData.name}`)
            container.classList.add('loaded')
        })

        container.appendChild(img)
        this.image = img

        return container
    }

    /**
     * Get CSS styles for image based on stretch mode
     * @returns {string} CSS styles
     * @private
     */
    getImageStyles() {
        const baseStyles = `
            max-width: 100%;
            max-height: 100%;
            display: block;
        `

        switch (this.stretch) {
            case 'fill':
                return baseStyles + `
                    width: 100%;
                    height: 100%;
                    object-fit: fill;
                `
            case 'contain':
                return baseStyles + `
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                `
            case 'cover':
                return baseStyles + `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                `
            case 'none':
                return baseStyles + `
                    object-fit: none;
                `
            default:
                return baseStyles + `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                `
        }
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
                resolve(true)
            }, { once: true })

            this.image.addEventListener('error', () => {
                clearTimeout(timeout)
                reject(new Error('Image load error'))
            }, { once: true })

            // Start loading
            this.image.src = this.mediaData.uri
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
            this.image.src = '' // Stop loading
            this.image = null
        }
        
        this.loadPromise = null
        super.destroy()
    }
}
