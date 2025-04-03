// Disclaimer: no semicolons, if unnecessary, are used in this project

import { SwLayout } from './components/SwLayout.js'
import { LinkedList } from '../../common/utils/linked-list.js'
import { extendLinkedList } from './utils/linked-list-extensions.js'
import { getMediaListContainer, showError } from './utils/player-utils.js'
import { ConfigValidator } from './utils/ConfigValidator.js'
import { DebugPanel } from './ui/DebugPanel.js'
import { ProgressBar } from './ui/ProgressBar.js'
import { ImageMediaHandler } from './media/ImageMediaHandler.js'
import { VideoMediaHandler } from './media/VideoMediaHandler.js'

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
        this.isPlaying = true // Set to true by default so first image shows progress
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
        this.setupContainer()
    }
    
    setupContainer() {
        // Set up the container with the proper dimensions
        const { width, height } = this.getLayoutDimensions()
        this.element.style.position = 'relative'
        this.element.style.width = '100%'
        this.element.style.height = '100%'
        this.element.style.overflow = 'hidden'
        this.element.style.backgroundColor = '#000'
        
        // Create an aspect ratio container if dimensions are provided
        if (width && height) {
            this.element.style.aspectRatio = `${width}/${height}`
        }
    }
    
    getLayoutDimensions() {
        // Get dimensions from the active schedule
        const activeSchedule = this.getActiveSchedule()
        if (activeSchedule) {
            return {
                width: activeSchedule.width || 1920,
                height: activeSchedule.height || 1080
            }
        }
        return { width: 1920, height: 1080 } // Default dimensions
    }
    
    getActiveSchedule() {
        if (!this.configuration.schedules || this.configuration.schedules.length === 0) {
            return null
        }
        
        // Use the Cron class to determine the current schedule
        // For now, just return the first schedule
        return this.configuration.schedules[this.currentScheduleIndex]
    }
    
    play() {
        this.isPlaying = true
        this.debugLog('Player play() called')
        
        const activeSchedule = this.getActiveSchedule()
        if (!activeSchedule) {
            this.showError('No active schedule found')
            return
        }
        
        // Clear previous content
        this.element.innerHTML = ''
        
        // Add debug controls if in debug mode
        if (this.debugMode) {
            this.addDebugControls()
        }
        
        // Create layout container - this was missing before
        const layoutContainer = document.createElement('div')
        layoutContainer.className = 'layout-container'
        layoutContainer.style.position = 'relative'
        layoutContainer.style.width = '100%'
        layoutContainer.style.height = '100%'
        layoutContainer.style.overflow = 'hidden'
        
        // Add ID and attributes to layout container
        if (activeSchedule._id) {
            layoutContainer.id = `layout_${activeSchedule._id}`
            layoutContainer.setAttribute('data-entu-id', activeSchedule._id)
            layoutContainer.setAttribute('data-entu-type', 'schedule')
        }
        if (activeSchedule.layoutEid) {
            layoutContainer.setAttribute('data-layout-eid', activeSchedule.layoutEid)
        }
        if (activeSchedule.name) {
            layoutContainer.setAttribute('name', activeSchedule.name)
        }
        
        this.element.appendChild(layoutContainer)
        
        // Process layout playlists
        if (activeSchedule.layoutPlaylists && activeSchedule.layoutPlaylists.length > 0) {
            activeSchedule.layoutPlaylists.forEach(playlist => {
                // Now add playlists to the layout container instead of directly to the element
                this.createPlaylistContainer(layoutContainer, playlist)
            })
        } else {
            this.showError('No playlists in the active schedule')
        }
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
                element.pausedTime = Date.now() - element.startTime
                this.debugLog(`Image paused with ${element.pausedTime}ms remaining`)
            }
            
            // Pause the progress updates
            if (element.progressInterval) {
                clearInterval(element.progressInterval)
                element.progressInterval = null
            }
        })
        
        this.updateDebugStatus()
    }
    
    resume() {
        this.isPlaying = true
        this.debugLog('Player resume() called')
        
        // Resume all videos that were visible
        const videos = this.element.querySelectorAll('video:not([style*="display: none"])')
        videos.forEach(video => {
            video.play()
        })
        
        // Resume all image timeouts - improved implementation
        const mediaElements = this.element.querySelectorAll('.media-element[style*="display: block"]')
        
        mediaElements.forEach(element => {
            if (element.pausedTime && element.querySelector('img')) {
                const remainingTime = element.originalDuration - element.pausedTime
                
                if (remainingTime > 0) {
                    this.debugLog(`Resuming image with ${remainingTime}ms remaining`)
                    element.startTime = Date.now()
                    
                    // Restart the progress bar interval
                    const progressBar = element.querySelector('.media-progress-bar')
                    if (progressBar) {
                        if (element.progressInterval) clearInterval(element.progressInterval)
                        
                        element.progressInterval = setInterval(() => {
                            const elapsedTime = Date.now() - element.startTime
                            const progress = Math.min(100, ((element.pausedTime + elapsedTime) / element.originalDuration) * 100)
                            progressBar.style.width = `${progress}%`
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
                            if (hasNext) {
                                mediaList.current.play()
                            } else if (mediaList.shouldLoop) {
                                mediaList.first()
                                mediaList.current.play()
                            }
                        }, remainingTime)
                    }
                    
                    element.pausedTime = null
                }
            }
        })
        
        this.updateDebugStatus()
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause()
        } else {
            this.resume()
        }
    }
    
    addDebugControls() {
        // Create debug panel
        const debugPanel = document.createElement('div')
        debugPanel.className = 'debug-panel'
        debugPanel.style.position = 'absolute'
        debugPanel.style.top = '0'
        debugPanel.style.left = '0'
        debugPanel.style.padding = '5px'
        debugPanel.style.background = 'rgba(0,0,0,0.5)'
        debugPanel.style.color = 'white'
        debugPanel.style.fontSize = '10px'
        debugPanel.style.zIndex = '9999'
        
        // Add play/pause button
        const playPauseBtn = document.createElement('button')
        playPauseBtn.textContent = '⏯️'
        playPauseBtn.style.marginRight = '5px'
        playPauseBtn.addEventListener('click', () => this.togglePlayPause())
        
        // Add next button
        const nextBtn = document.createElement('button')
        nextBtn.textContent = '⏭️'
        nextBtn.style.marginRight = '5px'
        nextBtn.addEventListener('click', () => this.forceNextMedia())
        
        // Add status indicator
        const statusIndicator = document.createElement('span')
        statusIndicator.className = 'debug-status'
        statusIndicator.textContent = '▶️ Playing'
        
        // Add info display
        const infoDisplay = document.createElement('div')
        infoDisplay.className = 'debug-info'
        infoDisplay.style.fontSize = '8px'
        
        // Assemble debug panel
        debugPanel.appendChild(playPauseBtn)
        debugPanel.appendChild(nextBtn)
        debugPanel.appendChild(statusIndicator)
        debugPanel.appendChild(infoDisplay)
        
        this.element.appendChild(debugPanel)
    }
    
    updateDebugStatus() {
        const statusIndicator = this.element.querySelector('.debug-status')
        if (statusIndicator) {
            statusIndicator.textContent = this.isPlaying ? '▶️ Playing' : '⏸️ Paused'
        }
        
        const infoDisplay = this.element.querySelector('.debug-info')
        if (infoDisplay) {
            // Show currently playing media
            const visibleMedia = this.element.querySelector('.media-element[style*="display: block"]')
            if (visibleMedia) {
                const mediaId = visibleMedia.getAttribute('data-media-eid')
                const mediaType = visibleMedia.querySelector('video') ? 'Video' : 'Image'
                infoDisplay.textContent = `Current: ${mediaType} (${mediaId})`
            } else {
                infoDisplay.textContent = 'No media playing'
            }
        }
    }
    
    debugLog(message) {
        if (this.debugMode) {
            console.log(`%c[PLAYER DEBUG] ${message}`, 'background:#333; color:#bada55')
        }
    }
    
    createPlaylistContainer(layoutContainer, layoutPlaylist) {
        const container = document.createElement('div')
        container.className = 'playlist-container'
        container.style.position = 'absolute'
        container.style.left = `${layoutPlaylist.left}${layoutPlaylist.inPixels ? 'px' : '%'}`
        container.style.top = `${layoutPlaylist.top}${layoutPlaylist.inPixels ? 'px' : '%'}`
        container.style.width = `${layoutPlaylist.width}${layoutPlaylist.inPixels ? 'px' : '%'}`
        container.style.height = `${layoutPlaylist.height}${layoutPlaylist.inPixels ? 'px' : '%'}`
        container.style.zIndex = layoutPlaylist.zindex || 1
        
        // Add Entu ID to playlist container
        if (layoutPlaylist._id) {
            container.id = `playlist_${layoutPlaylist._id}`
            container.setAttribute('data-entu-id', layoutPlaylist._id)
            container.setAttribute('data-entu-type', 'layout_playlist')
        }
        if (layoutPlaylist.eid) {
            container.setAttribute('data-eid', layoutPlaylist.eid)
        }
        if (layoutPlaylist.playlistEid) {
            container.setAttribute('data-playlist-eid', layoutPlaylist.playlistEid)
        }
        
        // Store original loop setting as attribute for reference only
        container.setAttribute('data-original-loop', layoutPlaylist.loop)
        
        // Add to layout container instead of this.element
        layoutContainer.appendChild(container)
        
        // Start playing media in the playlist - removed loop parameter since we always loop
        if (layoutPlaylist.playlistMedias && layoutPlaylist.playlistMedias.length > 0) {
            this.playMediaSequence(container, layoutPlaylist.playlistMedias)
        }
    }
    
    playMediaSequence(container, mediaItems) {
        // Create a linked list structure for media items
        const mediaList = new LinkedList()

        // Store the list by container reference for later use
        container.mediaList = mediaList

        this.debugLog(`Creating playlist with ${mediaItems.length} items`)

        // Always set shouldLoop to true - we always want playlists to loop
        mediaList.shouldLoop = true

        // Add each media item to the list
        mediaItems.forEach(mediaItem => {
            // Create the media element
            const mediaElement = document.createElement('div')
            mediaElement.className = 'media-element'
            mediaElement.style.display = 'none'
            mediaElement.style.width = '100%'
            mediaElement.style.height = '100%'
            mediaElement.style.position = 'absolute'

            // Load the media content
            this.loadMedia(mediaItem, mediaElement)

            // Add it to the container
            container.appendChild(mediaElement)

            // Add to the linked list - removed loop parameter from play method
            mediaList.add({
                element: mediaElement,
                mediaItem: mediaItem,
                container: container,
                play: () => this.playMediaItem(mediaElement, mediaItem, mediaList)
            })
        })

        // Store loop property directly on the list
        mediaList.shouldLoop = true

        // Start playing the first item if there are any
        if (mediaList.first()) {
            this.debugLog(`Starting playback with first item: ${mediaList.getCurrent().mediaItem.name}`)
            mediaList.getCurrent().play()
        } else {
            this.debugLog('No media items to play')
        }
    }
    
    playMediaItem(element, mediaItem, mediaList) {
        // Hide all other media elements in the same container
        const container = element.parentNode
        Array.from(container.children).forEach(child => {
            if (child !== element && child.classList.contains('media-element')) {
                child.style.display = 'none'
            }
        })
        
        // Show this element
        element.style.display = 'block'
        this.debugLog(`Playing media: ${mediaItem.name || mediaItem.mediaEid}`)
        
        const duration = mediaItem.duration || DEFAULTS.IMAGE_PLAYBACK_DURATION
        
        // Reset progress bar
        const progressBar = element.querySelector('.media-progress-bar')
        if (progressBar) {
            progressBar.style.width = '0%'
        }
        
        // For images, use setTimeout to move to next item
        if (mediaItem.type === 'Image') {
            element.startTime = Date.now()
            element.originalDuration = duration * 1000
            
            // Clear any existing timeout and interval
            if (element.imageTimeout) {
                clearTimeout(element.imageTimeout)
                element.imageTimeout = null
            }
            if (element.progressInterval) {
                clearInterval(element.progressInterval)
                element.progressInterval = null
            }
            
            // Always update progress initially even if paused later
            this.updateImageProgress(element, progressBar)
            
            if (this.isPlaying) {
                // Start progress update interval for images
                element.progressInterval = setInterval(() => {
                    this.updateImageProgress(element, progressBar)
                }, 50) // Update every 50ms
                
                this.debugLog(`Setting timeout for ${duration}s for ${mediaItem.name}`)
                element.imageTimeout = setTimeout(() => {
                    this.debugLog(`Image timeout complete: ${mediaItem.name}`)
                    
                    // Clear the progress interval
                    if (element.progressInterval) {
                        clearInterval(element.progressInterval)
                        element.progressInterval = null
                    }
                    
                    // Move to next item or loop back to start - simplified logic since we always loop
                    const hasNext = mediaList.next()
                    if (hasNext) {
                        this.debugLog(`Moving to next item: ${mediaList.getCurrent().mediaItem.name}`)
                    } else {
                        // This branch should never execute since mediaList.shouldLoop is always true,
                        // but keeping it as a fallback
                        this.debugLog(`Looping back to first item: ${mediaList.getCurrent().mediaItem.name}`)
                    }
                    mediaList.getCurrent().play()
                }, duration * 1000)
            }
        } else if (mediaItem.type === 'Video') {
            // Try to play the video
            const video = element.querySelector('video')
            if (video) {
                video.currentTime = 0 // Ensure we start from the beginning
                
                // Set up progress update for video
                if (element.progressInterval) {
                    clearInterval(element.progressInterval)
                }
                
                element.progressInterval = setInterval(() => {
                    if (video.duration) {
                        const progress = (video.currentTime / video.duration) * 100
                        if (progressBar) {
                            progressBar.style.width = `${progress}%`
                        }
                    }
                }, 50) // Update every 50ms
                
                if (this.isPlaying) {
                    const playPromise = video.play()
                    
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.error(`Error playing video: ${error}`)
                            // Clear the progress interval
                            if (element.progressInterval) {
                                clearInterval(element.progressInterval)
                                element.progressInterval = null
                            }
                            
                            // If autoplay fails, move to next item after duration
                            setTimeout(() => {
                                if (mediaList.next() || loop) {
                                    mediaList.current.play()
                                }
                            }, duration * 1000)
                        })
                    }
                    
                    // Add event listener to stop the progress interval when video ends - simplified logic
                    video.addEventListener('ended', () => {
                        this.debugLog(`Video ended: ${mediaItem.name}`)
                
                        if (element.progressInterval) {
                            clearInterval(element.progressInterval)
                            element.progressInterval = null
                        }
                        
                        // Move to next item or loop back to start - simplified logic
                        const hasNext = mediaList.next()
                        if (hasNext) {
                            this.debugLog(`Moving to next item: ${mediaList.getCurrent().mediaItem.name}`)
                        } else {
                            this.debugLog(`Looping back to first item: ${mediaList.getCurrent().mediaItem.name}`)
                        }
                        mediaList.getCurrent().play()
                    })
                }
            }
        }
        
        this.updateDebugStatus()
    }
    
    // New helper method to update image progress
    updateImageProgress(element, progressBar) {
        if (!element.startTime) return
        
        const elapsedTime = Date.now() - element.startTime
        const progress = Math.min(100, (elapsedTime / element.originalDuration) * 100)
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`
            // Debug info in data attribute for easy inspection
            progressBar.setAttribute('data-progress', `${Math.round(progress)}%`)
        }
        
        // Log progress at 25%, 50%, 75% to help with debugging
        if (progress >= 25 && !element.progress25) {
            element.progress25 = true
            this.debugLog(`Progress 25% for ${element.getAttribute('data-media-eid')}`)
        }
        if (progress >= 50 && !element.progress50) {
            element.progress50 = true
            this.debugLog(`Progress 50% for ${element.getAttribute('data-media-eid')}`)
        }
        if (progress >= 75 && !element.progress75) {
            element.progress75 = true
            this.debugLog(`Progress 75% for ${element.getAttribute('data-media-eid')}`)
        }
    }
    
    loadMedia(mediaItem, element) {
        console.log('Loading media item:', mediaItem)
        
        // Store reference to media elements
        this.mediaElements[mediaItem.mediaEid] = element
        
        // Add Entu ID to media element
        if (mediaItem._id) {
            element.id = `media_${mediaItem._id}`
            element.setAttribute('data-entu-id', mediaItem._id)
            element.setAttribute('data-entu-type', 'media')
        }
        if (mediaItem.mediaEid) {
            element.setAttribute('data-media-eid', mediaItem.mediaEid)
        }
        if (mediaItem.playlistMediaEid) {
            element.setAttribute('data-playlist-media-eid', mediaItem.playlistMediaEid)
        }
        
        // Check if we have a valid media source
        const mediaSource = mediaItem.fileDO || mediaItem.file
        if (!mediaSource) {
            console.error(`Missing media source for ${mediaItem.name || mediaItem.mediaEid}`)
            element.innerHTML = `<div class="media-error">Missing media source</div>`
            return
        }
        
        // Determine media type
        const mediaType = mediaItem.mediaType || mediaItem.type
        
        // Create progress bar container
        const progressContainer = document.createElement('div')
        progressContainer.className = 'media-progress-container'
        progressContainer.style.position = 'absolute'
        progressContainer.style.bottom = '0'
        progressContainer.style.left = '0'
        progressContainer.style.width = '100%'
        progressContainer.style.height = '4px'
        progressContainer.style.backgroundColor = 'rgba(0,0,0,0.3)'
        progressContainer.style.zIndex = '5'
        
        const progressBar = document.createElement('div')
        progressBar.className = 'media-progress-bar'
        progressBar.style.height = '100%'
        progressBar.style.width = '0%'
        progressBar.style.backgroundColor = '#00a1ff'
        progressBar.style.transition = 'width 0.1s linear'
        
        progressContainer.appendChild(progressBar)
        element.appendChild(progressContainer)
        
        if (mediaType === 'Image') {
            const img = document.createElement('img')
            console.log(`Creating image with source: ${mediaSource}`)
            
            // Set attributes before appending to avoid empty display
            img.alt = mediaItem.name || 'Image'
            img.style.width = '100%'
            img.style.height = '100%'
            img.style.objectFit = mediaItem.stretch ? 'cover' : 'contain'
            
            // Add loading handler
            img.onload = () => {
                console.log(`Image loaded successfully: ${mediaItem.name}`)
            }
            
            // Add error handler
            img.onerror = (e) => {
                console.error(`Failed to load image: ${mediaSource}`, e)
                element.innerHTML += `<div class="media-error">Failed to load image</div>`
            }
            
            // Set src after handlers to catch errors
            img.src = mediaSource
            
            element.appendChild(img)
            
            // Add ended event to clean up progress interval
            element.addEventListener('removed', () => {
                if (element.progressInterval) {
                    clearInterval(element.progressInterval)
                    element.progressInterval = null
                }
            })
        } else if (mediaType === 'Video') {
            const video = document.createElement('video')
            console.log(`Creating video with source: ${mediaSource}`)
            
            video.style.width = '100%'
            video.style.height = '100%'
            video.muted = mediaItem.mute !== false // Default to muted for mini-player
            video.loop = false // We handle looping ourselves
            video.style.objectFit = mediaItem.stretch ? 'cover' : 'contain'
            video.autoplay = true // Auto-play when shown
            video.playsInline = true // For iOS support
            video.controls = false // No controls for the player
            
            // Add ended event to clean up progress interval and move to next item
            video.addEventListener('ended', () => {
                if (element.progressInterval) {
                    clearInterval(element.progressInterval)
                    element.progressInterval = null
                }
                
                const mediaList = this.getMediaListForElement(element)
                if (mediaList && (mediaList.next() || mediaItem.loop)) {
                    mediaList.current.play()
                }
            })
            
            // Add error handler
            video.onerror = (e) => {
                console.error(`Failed to load video: ${mediaSource}`, e)
                element.innerHTML += `<div class="media-error">Failed to load video</div>`
            }
            
            // Set src after handlers to catch errors
            video.src = mediaSource
            
            element.appendChild(video)
        } else {
            console.error(`Unknown media type: ${mediaType}`)
            element.innerHTML = `<div class="media-error">Unknown media type: ${mediaType}</div>`
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
}
