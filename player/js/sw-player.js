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

        // Do not start playlists automatically
        this.debugLog('Player initialized without starting playlists')
    }
    
    getLayoutDimensions() {
        // Get dimensions from the active schedule
        const activeSchedule = this.configuration.schedules[this.currentScheduleIndex]
        if (activeSchedule) {
            return {
                width: activeSchedule.width || 1920,
                height: activeSchedule.height || 1080
            }
        }
        return { width: 1920, height: 1080 } // Default dimensions
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
        
        // Create layout container using SwLayout component
        const layoutContainerElement = document.createElement('div')
        layoutContainerElement.className = 'layout-container'
        layoutContainerElement.style.position = 'relative'
        layoutContainerElement.style.width = '100%'
        layoutContainerElement.style.height = '100%'
        layoutContainerElement.style.overflow = 'hidden'
        
        // Use SwLayout to handle layout rendering
        this.layout = new SwLayout(this, layoutContainerElement, activeSchedule)
        
        this.element.appendChild(layoutContainerElement)
        
        // Process layout playlists
        if (activeSchedule.layoutPlaylists && activeSchedule.layoutPlaylists.length > 0) {
            activeSchedule.layoutPlaylists.forEach(playlist => {
                // Now add playlists to the layout container instead of directly to the element
                this.createPlaylistContainer(layoutContainerElement, playlist)
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
    
    resume() {
        this.isPlaying = true
        this.debugLog('Player resume() called')
        
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
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause()
        } else {
            this.resume()
        }
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

        // Removed automatic playback of the first item
        this.debugLog('Playlist created but not started automatically')
    }
    
    playMediaItem(media_element, mediaItem, mediaList) {
        this.hideOtherMediaElements(media_element)

        media_element.style.display = 'block'
        this.debugLog(`Playing media: ${mediaItem.name || mediaItem.mediaEid}`)

        if (mediaItem.type === 'Image') {
            this.handleImagePlayback(media_element, mediaItem, mediaList)
        } else if (mediaItem.type === 'Video') {
            this.handleVideoPlayback(media_element, mediaItem, mediaList)
        }

        this.updateDebugStatus()
    }

    hideOtherMediaElements(media_element) {
        const playlist_container = media_element.parentNode
        Array.from(playlist_container.children).forEach(child => {
            if (child !== media_element && child.classList.contains('media-element')) {
                child.style.display = 'none'
            }
        })
    }

    handleImagePlayback(media_element, mediaItem, mediaList) {
        const duration = mediaItem.duration || DEFAULTS.IMAGE_PLAYBACK_DURATION
        media_element.startTime = Date.now()
        media_element.originalDuration = duration * 1000

        this.clearMediaTimers(media_element)
        this.updateImageProgress(media_element)

        if (this.isPlaying) {
            this.startImageProgressUpdates(media_element)
            this.setImageTimeout(media_element, mediaItem, mediaList, duration)
        }
    }

    startImageProgressUpdates(media_element) {
        media_element.progressInterval = setInterval(() => {
            this.updateImageProgress(media_element)
        }, 33) // Update every 33ms for smoother animation
    }

    setImageTimeout(media_element, mediaItem, mediaList, duration) {
        media_element.imageTimeout = setTimeout(() => {
            this.debugLog(`Image timeout complete: ${mediaItem.name}`)
            this.clearMediaTimers(media_element)
            this.advanceMediaList(mediaList)
        }, duration * 1000)
    }

    handleVideoPlayback(media_element, mediaItem, mediaList) {
        const video = media_element.querySelector('video')
        if (!video) {
            this.debugLog(`No video element found for ${mediaItem.name}`)
            return
        }

        video.currentTime = 0
        this.startVideoProgressUpdates(media_element, video)

        const playPromise = video.play()
        if (playPromise !== undefined) {
            playPromise
                .then(() => this.debugLog(`Video playback started for ${mediaItem.name}`))
                .catch(error => this.handleVideoPlaybackError(media_element, mediaList, error, mediaItem))
        }

        video.addEventListener('ended', () => {
            this.debugLog(`Video ended: ${mediaItem.name}`)
            this.clearMediaTimers(media_element)
            this.advanceMediaList(mediaList)
        })
    }

    startVideoProgressUpdates(media_element, video) {
        media_element.progressInterval = setInterval(() => {
            if (video.duration) {
                const progress = (video.currentTime / video.duration) * 100
                if (media_element.progressBarComponent) {
                    media_element.progressBarComponent.ensureVisible()
                    media_element.progressBarComponent.setProgress(progress)
                }
            }
        }, 33) // Update every 33ms for smoother animation
    }

    handleVideoPlaybackError(media_element, mediaList, error, mediaItem) {
        console.error(`Error playing video: ${error}`)
        this.clearMediaTimers(media_element)
        setTimeout(() => {
            if (mediaList.next()) {
                mediaList.getCurrent().play()
            }
        }, (mediaItem.duration || DEFAULTS.IMAGE_PLAYBACK_DURATION) * 1000)
    }

    clearMediaTimers(media_element) {
        if (media_element.progressInterval) {
            clearInterval(media_element.progressInterval)
            media_element.progressInterval = null
        }
        if (media_element.imageTimeout) {
            clearTimeout(media_element.imageTimeout)
            media_element.imageTimeout = null
        }
    }

    advanceMediaList(mediaList) {
        const hasNext = mediaList.next()
        if (hasNext) {
            this.debugLog(`Moving to next item: ${mediaList.getCurrent().mediaItem.name}`)
        } else {
            this.debugLog(`Looping back to first item: ${mediaList.getCurrent().mediaItem.name}`)
        }
        mediaList.getCurrent().play()
    }
    
    // New helper method to update image progress
    updateImageProgress(element) {
        if (!element.startTime) return
           
        const elapsedTime = Date.now() - element.startTime
        const progress = Math.min(100, (elapsedTime / element.originalDuration) * 100)
        
        // Use the ProgressBar component if available
        if (element.progressBarComponent) {
            element.progressBarComponent.ensureVisible() // Make sure it's visible
            element.progressBarComponent.setProgress(progress)
            // Force a browser reflow to ensure the progress bar updates
            // This is a performance hack but helps with rendering issues
            void element.progressBarComponent.bar.offsetWidth
        }
        
        // More frequent logging for debugging
        if (this.debugMode && progress % 10 < 1) {
            this.debugLog(`Progress ${Math.floor(progress)}% for ${element.getAttribute('data-media-eid') || 'media'}`)
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
        
        // Determine media type (fix: use mediaItem.type instead of undefined mediaType)
        const mediaType = mediaItem.type || mediaItem.mediaType
        
        // Create progress bar using ProgressBar class
        const progressBar = new ProgressBar(element, {
            height: '4px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            barColor: '#00a1ff',
            zIndex: '5'
        })
        
        // Store progress bar reference on element for updates
        element.progressBarComponent = progressBar
        
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
