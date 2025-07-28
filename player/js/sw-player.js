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
        // console.log('EntuScreenWerkPlayer initialized', configuration)
        this.element = element
        this.configuration = configuration
        this.currentScheduleIndex = 0
        this.mediaElements = {}
        this.isPlaying = false // Player needs to be started later intentionally
        this.debugMode = window.debugMode || false // Enable debug mode
        
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
       
        // Add a debug message for initialization
        if (this.debugMode) {
            const debugMsg = document.createElement('div')
            debugMsg.style.position = 'absolute'
            debugMsg.style.top = '10px'
            debugMsg.style.left = '10px'
            debugMsg.style.padding = '5px'
            debugMsg.style.backgroundColor = 'rgba(0,0,0,0.7)'
            debugMsg.style.color = 'white'
            debugMsg.style.zIndex = '9999'
            debugMsg.textContent = 'Player initializing...'
            this.element.appendChild(debugMsg)
            this.debugInitMsg = debugMsg
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (debugMsg.parentNode) {
                    debugMsg.parentNode.removeChild(debugMsg)
                }
            }, 5000)
        }
        
        this.initialize()
    }
    
    /**
     * Validates player configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfiguration() {
        if (!this.configuration || !this.configuration.schedules) {
            this.showError('Invalid configuration: missing schedules')
            return false
        }
        
        if (!this.configuration.schedules || this.configuration.schedules.length === 0) {
            this.showError('No schedules found in configuration')
            return false
        }
        
        const current_schedule = this.configuration.schedules[this.currentScheduleIndex]
        if (!current_schedule.layoutPlaylists || current_schedule.layoutPlaylists.length === 0) {
            this.showError('Schedule found but it has no layout playlists')
            return false
        }
        
        return true
    }
    
    /**
     * Sets up player container styles
     */
    setupPlayerContainer() {
        this.element.style.position = 'relative'
        this.element.style.overflow = 'hidden'
        this.element.style.backgroundColor = '#000'
        this.element.innerHTML = ''
    }
    
    /**
     * Creates and renders the layout
     */
    createLayout() {
        const layoutContainerElement = document.createElement('div')
        const current_schedule = this.configuration.schedules[this.currentScheduleIndex]
        
        // Log playlist information
        current_schedule.layoutPlaylists.forEach((_playlist, _idx) => {
            // console.log(`Playlist ${idx+1}: ${playlist.name} with ${playlist.playlistMedias ? playlist.playlistMedias.length : 0} media items`)
        })
        
        this.layout = new SwLayout(this, layoutContainerElement, current_schedule)
        this.element.appendChild(layoutContainerElement)
        
        // Update debug message if it exists
        if (this.debugInitMsg) {
            this.debugInitMsg.textContent = `Player initialized with ${current_schedule.layoutPlaylists.length} playlists`
        }
    }

    initialize() {
        // Validate configuration
        if (!this.validateConfiguration()) {
            return
        }
        
        // Setup the player container
        this.setupPlayerContainer()
        
        // Add debug controls if in debug mode
        if (this.debugMode) {
            this.addDebugControls()
        }
        
        // Create and render layout
        this.createLayout()
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
    
    /**
     * Finds visible media element in the player
     * @returns {Element|null} The visible media element or null
     */
    findVisibleMedia() {
        return this.element.querySelector('.media[style*="display: block"]')
    }

    /**
     * Finds the playlist container for a given media element
     * @param {Element} mediaElement - The media element
     * @returns {Element|null} The playlist container or null
     */
    findPlaylistContainer(mediaElement) {
        let playlistContainer = mediaElement.parentNode
        while (playlistContainer && !playlistContainer.classList.contains('playlist')) {
            playlistContainer = playlistContainer.parentNode
        }
        return playlistContainer
    }

    /**
     * Finds the playlist object from layout by container ID
     * @param {string} playlistId - The playlist container ID
     * @returns {Object|null} The playlist object or null
     */
    findPlaylistObject(playlistId) {
        if (!this.layout || !this.layout.playlists) return null
        return this.layout.playlists.find(p => p.dom_element.id === playlistId)
    }

    /**
     * Advances playlist to next media or restarts from beginning
     * @param {Object} playlist - The playlist object
     * @param {Element} visibleMedia - The currently visible media element
     * @returns {boolean} Success status
     */
    advancePlaylist(playlist, visibleMedia) {
        // Hide current media
        visibleMedia.style.display = 'none'
        
        // Clean up current media (stop any playing videos or timers)
        const currentMedia = playlist.getCurrent()
        if (currentMedia) {
            currentMedia.pause()
        }
        
        // Advance to next media
        const success = playlist.next()
        if (success) {
            const nextMedia = playlist.getCurrent()
            if (nextMedia) {
                nextMedia.play()
                return true
            }
        }
        
        // If next failed, try restarting from beginning
        playlist.moveToBeginning()
        const firstMedia = playlist.getCurrent()
        if (firstMedia) {
            firstMedia.play()
            return true
        }
        
        return false
    }

    forceNextMedia() {
        // Find visible media with the .media class
        const visibleMedia = this.findVisibleMedia()
        if (!visibleMedia) {
            console.error('Could not find visible media to advance')
            return false
        }
        
        // Find parent playlist container
        const playlistContainer = this.findPlaylistContainer(visibleMedia)
        if (!playlistContainer) {
            console.error('Could not find playlist container')
            return false
        }
        
        // Get the playlist object from layout
        const playlist = this.findPlaylistObject(playlistContainer.id)
        if (!playlist) {
            console.error('Could not find playlist object')
            return false
        }
        
        // Advance the playlist
        return this.advancePlaylist(playlist, visibleMedia)
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
        if (this.isPlaying) {
            debugLog('Player already playing')
            return false
        }
        this.isPlaying = true
        // debugLog('Player resumed')
        if (this.layout) {
            this.layout.resumeMediaElements()
        }
        this.updateDebugStatus()
        return true
    }

    pause() {
        if (!this.isPlaying) {
            // debugLog('Player already paused')
            return false
        }
        this.isPlaying = false
        // debugLog('Player pause() called')
        if (this.layout) {
            this.layout.pauseMediaElements()
        }
        this.updateDebugStatus()
        return true
    }
}
