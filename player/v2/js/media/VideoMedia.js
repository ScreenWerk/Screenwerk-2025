import { BaseMedia } from './BaseMedia.js'

/**
 * VideoMedia - Handles video content rendering and lifecycle
 * Extends BaseMedia with video-specific functionality
 */
export class VideoMedia extends BaseMedia {
    constructor(mediaData, container) {
        super(mediaData, container)
        this.videoElement = null
        this.isVideoReady = false
        this.loadStartTime = null
        this.autoplayAttempted = false
    }

    /**
     * Create and configure video element
     */
    createElement() {
        this.videoElement = document.createElement('video')
        
        // Apply video-specific properties
        this.videoElement.muted = this.mediaData.mute !== false // Default to muted for autoplay
        this.videoElement.loop = this.mediaData.loop === true
        this.videoElement.controls = false // Hide controls for digital signage
        this.videoElement.preload = 'auto'
        this.videoElement.playsInline = true // iOS compatibility
        
        // Apply standard media styles
        this.videoElement.style.width = '100%'
        this.videoElement.style.height = '100%'
        this.videoElement.style.objectFit = 'cover' // Default to cover mode
        this.videoElement.style.position = 'absolute'
        this.videoElement.style.top = '0'
        this.videoElement.style.left = '0'
        
        // Set video source
        this.videoElement.src = this.mediaData.url
        
        return this.videoElement
    }

    /**
     * Set up video-specific event listeners
     */
    setupEventListeners() {
        if (!this.videoElement) return

        // Video loading events
        this.videoElement.addEventListener('loadstart', () => {
            this.loadStartTime = Date.now()
            this.debug('Video load started')
        })

        this.videoElement.addEventListener('loadedmetadata', () => {
            this.debug(`Video metadata loaded - duration: ${this.videoElement.duration}s`)
            this.isVideoReady = true
        })

        this.videoElement.addEventListener('canplaythrough', () => {
            const loadTime = Date.now() - this.loadStartTime
            this.debug(`Video ready to play (loaded in ${loadTime}ms)`)
            this.handleVideoReady()
        })

        // Video playback events
        this.videoElement.addEventListener('play', () => {
            this.debug('Video playback started')
        })

        this.videoElement.addEventListener('pause', () => {
            this.debug('Video playback paused')
        })

        this.videoElement.addEventListener('ended', () => {
            this.debug('Video playback ended')
            this.handleMediaComplete()
        })

        // Error handling
        this.videoElement.addEventListener('error', (event) => {
            const error = this.videoElement.error
            this.handleError(`Video error: ${error?.message || 'Unknown error'}`, event)
        })

        this.videoElement.addEventListener('stalled', () => {
            this.debug('Video playback stalled - buffering')
        })

        this.videoElement.addEventListener('waiting', () => {
            this.debug('Video waiting for data')
        })
    }

    /**
     * Handle video ready state and attempt autoplay
     */
    async handleVideoReady() {
        if (this.autoplayAttempted) return
        this.autoplayAttempted = true

        try {
            // Attempt autoplay
            await this.videoElement.play()
            this.debug('Video autoplay successful')
        } catch (error) {
            this.debug(`Video autoplay failed: ${error.message}`)
            // Autoplay failed - this is common due to browser policies
            // For digital signage, we might need user interaction or muted playback
            if (!this.videoElement.muted) {
                this.debug('Retrying video playback with muted audio')
                this.videoElement.muted = true
                try {
                    await this.videoElement.play()
                    this.debug('Muted video autoplay successful')
                } catch (mutedError) {
                    this.handleError(`Video autoplay failed even when muted: ${mutedError.message}`)
                }
            }
        }
    }

    /**
     * Start video playback
     */
    async show() {
        if (!this.element) {
            this.debug('Creating video element')
            this.element = this.createElement()
            this.setupEventListeners()
            this.container.appendChild(this.element)
        }

        this.element.style.display = 'block'
        this.isVisible = true

        // Start loading if not already loaded
        if (!this.isVideoReady) {
            this.debug('Loading video content')
            this.videoElement.load()
        }

        // If video is ready, try to play
        if (this.isVideoReady && this.videoElement.paused) {
            try {
                await this.videoElement.play()
            } catch (error) {
                this.debug(`Video play failed: ${error.message}`)
            }
        }

        this.debug('Video media shown')
    }

    /**
     * Pause video and hide element
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none'
            if (this.videoElement && !this.videoElement.paused) {
                this.videoElement.pause()
            }
        }
        this.isVisible = false
        this.debug('Video media hidden')
    }

    /**
     * Clean up video resources
     */
    destroy() {
        if (this.videoElement) {
            this.videoElement.pause()
            this.videoElement.removeAttribute('src')
            this.videoElement.load() // This stops the download
        }
        
        super.destroy()
        
        this.videoElement = null
        this.isVideoReady = false
        this.autoplayAttempted = false
        this.debug('Video media destroyed')
    }

    /**
     * Get current video status for debugging
     */
    getStatus() {
        const baseStatus = super.getStatus()
        
        if (!this.videoElement) {
            return { ...baseStatus, videoStatus: 'not-created' }
        }

        return {
            ...baseStatus,
            videoStatus: {
                readyState: this.videoElement.readyState,
                networkState: this.videoElement.networkState,
                currentTime: this.videoElement.currentTime,
                duration: this.videoElement.duration,
                paused: this.videoElement.paused,
                muted: this.videoElement.muted,
                loop: this.videoElement.loop,
                autoplayAttempted: this.autoplayAttempted,
                isVideoReady: this.isVideoReady
            }
        }
    }

    /**
     * Debug helper with video-specific context
     */
    debug(message) {
        super.debug(`[VideoMedia] ${message}`)
    }
}
