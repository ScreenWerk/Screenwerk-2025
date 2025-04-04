// Disclaimer: no semicolons, if unnecessary, are used in this project

import { LinkedList } from '../../common/utils/linked-list.js'
import { extendLinkedList } from './utils/linked-list-extensions.js'
import { getMediaListContainer, showError } from './utils/player-utils.js'
import { ImageMediaHandler } from './media/ImageMediaHandler.js'
import { VideoMediaHandler } from './media/VideoMediaHandler.js'
import { DebugPanel } from './ui/DebugPanel.js'
import { SwLayout } from './components/SwLayout.js'
import { debugLog } from '../../common/utils/debug-utils.js' // Updated path

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
        debugLog('Player initialized without starting playlists')

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
                    debugLog('Manually advancing to next media')
                } else {
                    debugLog('Manually looping to first media')
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
        debugLog('Player resumed')
        this.resumeMediaElements()
    }

    pause() {
        this.isPlaying = false
        debugLog('Player pause() called')
        if (this.layout) {
            this.layout.pauseMediaElements()
        }
        this.updateDebugStatus()
    }

    resumeMediaElements() {
        if (this.layout) {
            this.layout.resumeMediaElements()
        }
        this.updateDebugStatus()
    }    
}
