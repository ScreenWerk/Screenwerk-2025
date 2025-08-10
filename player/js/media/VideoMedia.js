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
    this.endedHandled = false
    }

    /**
     * Report correct media type
     */
    getType() {
        return 'video'
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
        
    // Set video source (prefer uri, fall back to url)
    this.videoElement.src = this.mediaData.uri || this.mediaData.url || ''
        
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
            // Browser fires pause before ended; suppress if ended
            if (this.videoElement.ended || this.completed) return
            this.debug('Video playback paused')
        })

        // When video ends naturally, notify playlist for progression.
        // We KEEP the listener attached permanently so fastLoopRestart() can reuse it.
        // Duplicate handling is prevented via the endedHandled flag which is reset
        // at each play()/fastLoopRestart() invocation.
        this._onEnded = () => {
            if (this.endedHandled) return
            this.endedHandled = true
            if (!this.completed) {
                this.debug('Video playback ended (natural)')
                this.onComplete()
            }
            // Listener intentionally retained; guard above prevents double firing across loops.
        }
        this.videoElement.addEventListener('ended', this._onEnded)

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
            if (this._onEnded) {
                this.videoElement.removeEventListener('ended', this._onEnded)
            }
        }
        
        super.destroy()
        
        this.videoElement = null
        this.isVideoReady = false
        this.autoplayAttempted = false
        this.debug('Video media destroyed')
    }

    /**
     * Override load to integrate video readiness
     */
    async load() {
        try {
            if (!this.validate()) return false
            if (!this.element) {
                this.element = this.createElement()
                this.setupEventListeners()
                this.container.appendChild(this.element)
            }
            this.isLoaded = true
            this.debug('Video media load initiated')
            // Start load explicitly
            this.videoElement.load()
            return true
        } catch (e) {
            this.handleError(`Load failure: ${e.message}`)
            return false
        }
    }

    /**
     * Override play to sync with video playback instead of fixed timeout unless duration forced
     */
    play() {
        if (!this.isLoaded) {
            this.debug('Video not loaded yet, cannot play')
            return false
        }
        // Reset ended flag so the persistent 'ended' listener can fire again for this cycle
        this.endedHandled = false
        // Cancel any existing timeout from BaseMedia (not used here)
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
        if (this.videoElement && this.videoElement.paused) {
            this.videoElement.play().catch(err => {
                this.debug(`Play request failed: ${err.message}`)
            })
        }
        this.isPlaying = true
        this.startTime = Date.now()
        // Only enforce artificial cutoff if explicitly flagged
        if (this.mediaData.forceDuration === true && this.mediaData.duration && this.mediaData.duration > 0) {
            this.timeoutId = setTimeout(() => {
                this.debug('Forced completion due to configured duration')
                this.handleMediaComplete()
            }, this.mediaData.duration * 1000)
        }
    this.debug('Video play invoked')
        return true
    }

    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
        if (this.videoElement && !this.videoElement.paused) {
            this.videoElement.pause()
        }
        this.isPlaying = false
        if (!this.completed) {
            this.debug('Video stopped')
        }
    this.endedHandled = true
    }

    /**
     * Map ended event to BaseMedia completion flow
     */
    handleMediaComplete() {
    // Use BaseMedia pipeline
    this.onComplete()
    }

    /**
     * Centralized error handler
     */
    handleError(message, originalEvent) {
        console.error('[VideoMedia] ' + message, originalEvent || '')
        // Fail fast: mark as complete so playlist can advance
        this.handleMediaComplete()
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

    /**
     * Fast restart for single-item playlist loops
     * Reuses existing video element instead of destroy/recreate
     * @returns {boolean} Success status
     */
    fastLoopRestart() {
        if (!this.videoElement || !this.isLoaded) {
            return false
        }

    // Reset completion flags and restart playback (allow 'ended' listener to trigger again)
    this.completed = false
    this.endedHandled = false
        this.isPlaying = true
        this.startTime = Date.now()

        // Clear any existing timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }

        // Reset video position to beginning (essential for ended videos)
        this.videoElement.currentTime = 0

        // Restart BaseMedia timer if forceDuration is active
        if (this.mediaData.forceDuration === true && this.mediaData.duration && this.mediaData.duration > 0) {
            this.timeoutId = setTimeout(() => {
                this.onComplete()
            }, this.mediaData.duration * 1000)
        }

        // Restart playback
        this.videoElement.play()

        this.debug('Fast loop restart (single-item playlist)')
        return true
    }

}
