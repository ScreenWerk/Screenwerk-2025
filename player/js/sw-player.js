// Disclaimer: no semicolons, if unnecessary, are used in this project

import { LinkedList } from '../../common/utils/linked-list.js'
import { extendLinkedList } from './utils/linked-list-extensions.js'
import { getMediaListContainer, showError } from './utils/player-utils.js'
import { ImageMediaHandler } from './media/ImageMediaHandler.js'
import { VideoMediaHandler } from './media/VideoMediaHandler.js'
import { DebugPanel } from './ui/DebugPanel.js'
import { ProgressBar } from './ui/ProgressBar.js'
import { SwLayout } from './components/SwLayout.js'

// Extend LinkedList with additional methods
extendLinkedList(LinkedList)

const DEFAULTS = {
    IMAGE_PLAYBACK_DURATION: 10
}

/**
 * Main player class that manages the rendering and playback of ScreenWerk content
 */
export class EntuScreenWerkPlayer {
    /**
     * Creates a new ScreenWerk player instance
     * 
     * @param {HTMLElement} element - The container element where the player will be rendered
     * @param {Object} configuration - The player configuration containing schedules and media
     */
    constructor(element, configuration) {
        console.log('EntuScreenWerkPlayer initialized', configuration)
        this.element = element
        this.configuration = configuration
        this.currentScheduleIndex = 0
        this.mediaElements = {}
        this.isPlaying = false // Player needs to be started later intentionally
        this.debugMode = true // Enable debug mode
        
        // Set the configuration ID on the mini-player element
        if (configuration._id) {
            this.element.id = `config_${configuration._id}`
            this.element.setAttribute('data-entu-id', configuration._id)
            this.element.setAttribute('data-entu-type', 'configuration')
        }
        
        // Initialize media handlers
        this.mediaHandlers = {
            Image: new ImageMediaHandler(DEFAULTS),
            Video: new VideoMediaHandler()
        }
        
        this.initialize()
    }
    
    initialize() {
        // Validate configuration
        if (!this.configuration || !this.configuration.schedules) {
            this.showError('Invalid configuration: missing schedules')
            return
        }
        
        // Setup the player container
        this.element.style.position = 'relative'
        this.element.style.width = '100%'
        this.element.style.height = '100%'
        this.element.style.overflow = 'hidden'
        this.element.style.backgroundColor = '#000'
        this.element.style.aspectRatio = 16/9

        // Do not start playlists automatically
        this.debugLog('Player initialized without starting playlists')

        // Clear previous content
        this.element.innerHTML = ''

        // Add debug controls if in debug mode
        if (this.debugMode) {
            this.addDebugControls()
        }

        // Create layout container using SwLayout component
        const layoutContainerElement = document.createElement('div')
        const current_schedule = this.configuration.schedules[this.currentScheduleIndex]
        this.layout = new SwLayout(this, layoutContainerElement, current_schedule)
        this.element.appendChild(layoutContainerElement)
    }

    addDebugControls() {
        // Use DebugPanel class instead of directly creating elements
        this.debugPanel = new DebugPanel(this.element, {
            onTogglePlayback: () => this.togglePlayPause(),
            onNextMedia: () => this.forceNextMedia()
        })
    }
    
    updateDebugStatus() {
        if (this.debugPanel) {
            // Get the currently visible media element
            const visibleMedia = this.element.querySelector('.media-element[style*="display: block"]')
            this.debugPanel.updateStatus(this.isPlaying, visibleMedia)
        }
    }
    
    debugLog(message) {
        if (this.debugMode) {
            console.log(`%c[PLAYER DEBUG] ${message}`, 'background:#333; color:#bada55')
        }
    }

    getMediaListForElement(element) {
        return getMediaListContainer(element)
    }
    
    showError(message) {
        showError(this.element, message)
    }
    
    cleanup() {
        // Clear all progress intervals
        document.querySelectorAll('.media-element').forEach(element => {
            if (element.progressInterval) {
                clearInterval(element.progressInterval)
                element.progressInterval = null
            }
            if (element.imageTimeout) {
                clearTimeout(element.imageTimeout)
                element.imageTimeout = null
            }
        })
    }
    
    forceNextMedia() {
        const visibleMedia = this.element.querySelector('.media-element[style*="display: block"]')
        if (visibleMedia) {
            // Find parent container with mediaList
            const container = this.getMediaListContainer(visibleMedia)
            if (container && container.mediaList) {
                const mediaList = container.mediaList
                
                // Clean up current media
                if (visibleMedia.progressInterval) {
                    clearInterval(visibleMedia.progressInterval)
                    visibleMedia.progressInterval = null
                }
                if (visibleMedia.imageTimeout) {
                    clearTimeout(visibleMedia.imageTimeout)
                    visibleMedia.imageTimeout = null
                }
                
                // Advance to next or loop - simplified logic
                const hasNext = mediaList.next()
                if (hasNext) {
                    this.debugLog('Manually advancing to next media')
                } else {
                    this.debugLog('Manually looping to first media')
                }
                mediaList.getCurrent().play()
            }
        }
    }
    
    // Helper to find the container with mediaList
    getMediaListContainer(element) {
        let current = element
        while (current && !current.mediaList) {
            current = current.parentNode
        }
        return current
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause()
        } else {
            this.resume()
        }
    }
    
    resume() {
        this.isPlaying = true
        this.debugLog('Player resumed')
        this.resumeMediaElements()
    }

    pause() {
        this.isPlaying = false
        this.debugLog('Player pause() called')
        
        // Pause all videos and stop progress updates
        const mediaElements = this.element.querySelectorAll('.media-element')
        mediaElements.forEach(element => {
            const video = element.querySelector('video')
            if (video) {
                video.pause()
            }
            
            // Pause all image timeouts by storing their current state
            if (element.imageTimeout) {
                clearTimeout(element.imageTimeout)
                // Make sure we have a valid startTime before calculating pausedTime
                if (element.startTime && typeof element.startTime === 'number') {
                    element.pausedTime = Date.now() - element.startTime
                    this.debugLog(`Image paused with ${element.pausedTime}ms remaining from ${element.originalDuration}ms total`)
                } else {
                    this.debugLog(`Cannot pause image: missing startTime`)
                }
            }
            
            // Pause the progress updates
            if (element.progressInterval) {
                clearInterval(element.progressInterval)
                element.progressInterval = null
            }
        })
        
        this.updateDebugStatus()
    }

    resumeMediaElements() {
        // Resume all videos that were visible
        const videos = this.element.querySelectorAll('video:not([style*="display: none"])')
        videos.forEach(video => {
            video.play()
        })
        
        // Resume all image timeouts - improved implementation with proper checks
        const mediaElements = this.element.querySelectorAll('.media-element[style*="display: block"]')
        
        mediaElements.forEach(element => {
            this.debugLog(`Resuming media element: ${element.id || 'unknown'}`)
            
            // Check if we have the necessary timing information
            if (element.querySelector('img') && 
                typeof element.originalDuration === 'number' && 
                typeof element.pausedTime === 'number') {
                
                const remainingTime = element.originalDuration - element.pausedTime
                
                if (remainingTime > 0) {
                    this.debugLog(`Resuming image with ${remainingTime}ms remaining`)
                    element.startTime = Date.now()
                    
                    // Restart the progress bar interval
                    if (element.progressBarComponent) {
                        if (element.progressInterval) clearInterval(element.progressInterval)
                        
                        element.progressInterval = setInterval(() => {
                            const elapsedTime = Date.now() - element.startTime
                            const progress = Math.min(100, ((element.pausedTime + elapsedTime) / element.originalDuration) * 100)
                            element.progressBarComponent.setProgress(progress)
                        }, 50)
                    }
                    
                    // Get the parent container and its mediaList
                    const container = element.parentNode
                    if (container && container.mediaList) {
                        const mediaList = container.mediaList
                        
                        element.imageTimeout = setTimeout(() => {
                            this.debugLog('Resumed image timeout complete')
                            
                            if (element.progressInterval) {
                                clearInterval(element.progressInterval)
                                element.progressInterval = null
                            }
                            
                            // Find the current media item and advance
                            const hasNext = mediaList.next()
                            const currentMedia = mediaList.getCurrent()
                            if (hasNext && currentMedia && typeof currentMedia.play === 'function') {
                                currentMedia.play()
                            } else if (mediaList.shouldLoop && currentMedia && typeof currentMedia.play === 'function') {
                                mediaList.first()
                                mediaList.getCurrent().play()
                            } else {
                                this.debugLog('No valid media to play after timeout')
                            }
                        }, remainingTime)
                    }
                    
                    element.pausedTime = null
                } else {
                    this.debugLog(`Cannot resume image: remaining time is ${remainingTime}ms`)
                    // Force advancing to next item if remaining time is invalid
                    this.forceNextMedia()
                }
            } else {
                // Handle case where timing information is missing
                this.debugLog(`Cannot resume media: missing timing information`)
                if (element.querySelector('img')) {
                    this.debugLog(`Restarting image from beginning`)
                    // Restart the image from the beginning
                    element.startTime = Date.now()
                    element.originalDuration = element.originalDuration || DEFAULTS.IMAGE_PLAYBACK_DURATION * 1000
                    element.pausedTime = 0
                    
                    // Restart the progress bar interval
                    if (element.progressBarComponent) {
                        if (element.progressInterval) clearInterval(element.progressInterval)
                        
                        element.progressInterval = setInterval(() => {
                            const elapsedTime = Date.now() - element.startTime
                            const progress = Math.min(100, (elapsedTime / element.originalDuration) * 100)
                            element.progressBarComponent.setProgress(progress)
                        }, 50)
                    }
                    
                    // Restart the timeout for the image
                    const container = element.parentNode
                    if (container && container.mediaList) {
                        const mediaList = container.mediaList
                        
                        element.imageTimeout = setTimeout(() => {
                            this.debugLog('Image timeout complete after restart')
                            
                            if (element.progressInterval) {
                                clearInterval(element.progressInterval)
                                element.progressInterval = null
                            }
                            
                            // Move to the next media item
                            const hasNext = mediaList.next()
                            const currentMedia = mediaList.getCurrent()
                            if (hasNext && currentMedia && typeof currentMedia.play === 'function') {
                                currentMedia.play()
                            } else if (mediaList.shouldLoop && currentMedia && typeof currentMedia.play === 'function') {
                                mediaList.first()
                                mediaList.getCurrent().play()
                            } else {
                                this.debugLog('No valid media to play after restart')
                            }
                        }, element.originalDuration)
                    }
                }
            }
        })
        
        this.updateDebugStatus()
    }    
}
