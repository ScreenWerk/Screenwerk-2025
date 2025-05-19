// Disclaimer: no semicolons, if unnecessary, are used in this project

import { ProgressBar } from '../ui/ProgressBar.js'
import { debugLog } from '../../../common/utils/debug-utils.js' // Updated path
import { checkMediaUrl, displayMediaDebugInfo } from '../utils/media-validator.js' // Import validation utilities
import { ENVIRONMENT, UI_VISIBILITY } from '../../../common/config/constants.js'

const DEFAULTS = {
    IMAGE_PLAYBACK_DURATION: 10
}

export class SwMedia {
    constructor(parent, dom_element, configuration) {
        this.parent = parent
        this.dom_element = dom_element
        this.type = configuration.mediaType
        
        // Debug logging for media initialization
        console.log(`Initializing media: ${configuration.name}, Type: ${this.type || 'undefined'}, File: ${configuration.fileDO || 'undefined'}`)
        
        // Will be set later during render when we validate the URL
        this.mediaIsValid = false
        
        if (this.type === 'Image') {
            this.duration = configuration.duration || DEFAULTS.IMAGE_PLAYBACK_DURATION
        }
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.id = configuration.playlistMediaEid
        this.name = configuration.name
        this.mediaEid = configuration.mediaEid
        this.fileDO = configuration.fileDO
        this.validFrom = configuration.validFrom
        this.validTo = configuration.validTo
        this.ordinal = configuration.ordinal
        this.mute = configuration.mute
        this.stretch = configuration.stretch
        this.progressBar = null // Initialize progress bar reference
        this.render()
    }
    render() {
        console.log(`Rendering media ${this.name} with type ${this.type}, file: ${this.fileDO}`)
        this.dom_element.id = this.mediaEid
        this.dom_element.setAttribute('name', this.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${this.mediaEid}`)
        this.dom_element.setAttribute('type', this.type)
        this.dom_element.setAttribute('file', this.fileDO)
        this.dom_element.setAttribute('validFrom', this.validFrom)
        this.dom_element.setAttribute('validTo', this.validTo)
        this.dom_element.setAttribute('ordinal', this.ordinal)
        this.dom_element.classList.add('media')
        if (this.stretch) {
            this.dom_element.classList.add('stretch')
        }
        this.parent.dom_element.appendChild(this.dom_element)

        // Display a loading indicator
        const loadingIndicator = document.createElement('div')
        loadingIndicator.style.position = 'absolute'
        loadingIndicator.style.top = '50%'
        loadingIndicator.style.left = '50%'
        loadingIndicator.style.transform = 'translate(-50%, -50%)'
        loadingIndicator.style.color = 'white'
        loadingIndicator.style.fontSize = '18px'
        loadingIndicator.textContent = 'Loading...'
        this.dom_element.appendChild(loadingIndicator)

        // Display debug info if in debug mode
        if (window.debugMode) {
            displayMediaDebugInfo(this.dom_element, {
                name: this.name,
                type: this.type,
                url: this.fileDO,
                width: this.parent.dom_element.style.width,
                height: this.parent.dom_element.style.height
            })
        }

        // Validate media URL and detect type
        checkMediaUrl(this.fileDO, this.type).then(result => {
            this.mediaIsValid = result.isValid
            
            if (!result.isValid) {
                loadingIndicator.textContent = `Error: Cannot load media at ${this.fileDO}`
                loadingIndicator.style.color = 'red'
                return
            }
            
            // Set the detected type
            if (result.detectedType && !this.type) {
                this.type = result.detectedType
                this.dom_element.setAttribute('type', this.type)
                console.log(`Updated media type for ${this.name} to: ${this.type}`)
                
                // Set default duration for image if it wasn't set before
                if (this.type === 'Image' && !this.duration) {
                    this.duration = DEFAULTS.IMAGE_PLAYBACK_DURATION
                }
            }
            
            // Proceed with rendering the media content
            if (this.type === 'Image') {
                const img = document.createElement('img')
                img.src = this.fileDO
                img.style.width = '100%'
                img.style.height = '100%'
                img.style.objectFit = 'fill' // Always use fill to not maintain aspect ratio
                img.style.position = 'absolute'
                img.style.top = '0'
                img.style.left = '0'
                
                // Add error/load handlers
                img.onerror = (e) => {
                    console.error(`Error loading image ${this.name}: ${e}`)
                    loadingIndicator.textContent = `Error loading image: ${this.name}`
                    loadingIndicator.style.color = 'red'
                }
                
                img.onload = () => {
                    // console.log(`Image loaded successfully: ${this.name}`)
                    loadingIndicator.style.display = 'none'
                }
                
                this.dom_element.appendChild(img)
            } else if (this.type === 'Video') {
                const video = document.createElement('video')
                video.src = this.fileDO
                video.style.width = '100%'
                video.style.height = '100%'
                video.style.objectFit = 'fill' // Always use fill to not maintain aspect ratio
                video.style.position = 'absolute'
                video.style.top = '0'
                video.style.left = '0'
                video.muted = this.mute
                video.loop = false  // Changed to false since we handle looping ourselves
                video.autoplay = false  // Changed to false for explicit control
                video.playsInline = true // Important for mobile devices
                video.crossOrigin = 'anonymous' // Add crossorigin for CORS media
                
                // console.log(`Creating video element in render() with source: ${this.fileDO}`)
                
                // Add error/load handlers
                video.onerror = (e) => {
                    console.error(`Error loading video ${this.name}: ${e.target.error ? e.target.error.code : 'unknown error'}`)
                    console.log(`Video element details: src=${video.src}, readyState=${video.readyState}, networkState=${video.networkState}`)
                    loadingIndicator.textContent = `Error loading video: ${this.name}`
                    loadingIndicator.style.color = 'red'
                }
                
                video.onloadeddata = () => {
                    // console.log(`Video loaded successfully: ${this.name}`)
                    loadingIndicator.style.display = 'none'
                }
                
                // Add canplay event for additional debugging
                video.addEventListener('canplay', () => {
                    console.log(`Video can play: ${this.name}, duration: ${video.duration}s`)
                })
                
                // Add stalled event for debugging network issues
                video.addEventListener('stalled', () => {
                    console.warn(`Video download stalled: ${this.name}`)
                })
                
                // Set up the ended event listener during initialization
                video.addEventListener('ended', () => {
                    const elapsed_ms = new Date().getTime() - this.dom_element.start_ms
                    console.log(`Video ${this.dom_element.id} ended after ${elapsed_ms} ms`)
                    this.dom_element.style.display = 'none'
                    
                    // Call .next() on the parent LinkedList 
                    const success = this.parent.next()
                    
                    // Get the current media after moving to next
                    const nextMedia = this.parent.getCurrent()
                    
                    if (success && nextMedia && typeof nextMedia.play === 'function') {
                        console.log(`Playing next media: ${nextMedia.name}`)
                        nextMedia.play()
                    } else {
                        debugLog('[SwMedia] Video ended but no next media to play')
                        console.error('Failed to get next media element after video. Attempting to restart playlist.')
                        
                        // Try to restart from beginning
                        if (this.parent.moveToBeginning()) {
                            const firstMedia = this.parent.getCurrent()
                            if (firstMedia) {
                                console.log('Restarting playlist from first item after video')
                                firstMedia.play()
                            }
                        }
                    }
                })
                
                this.dom_element.appendChild(video)
                video.pause()  // Ensure it's paused initially
            } else {
                // Show error for unknown media type
                console.error(`Unknown media type: ${this.type} for media ${this.name}`)
                loadingIndicator.textContent = `Unknown media type: ${this.type || 'undefined'}`
                loadingIndicator.style.color = 'red'
            }
        })

        // Add a progress bar to the media element
        this.progressBar = new ProgressBar(this.dom_element, {
            barColor: '#00a1ff',
            backgroundColor: 'rgba(0,0,0,0.3)',
            height: '4px'
        })
        // Hide progress bar if not allowed by UI_VISIBILITY
        const ui = (typeof UI_VISIBILITY !== 'undefined' && typeof ENVIRONMENT !== 'undefined')
            ? UI_VISIBILITY
            : { showProgress: true }
        if (!ui.showProgress) {
            const bars = this.dom_element.querySelectorAll('.media-progress-container')
            bars.forEach(bar => { bar.style.display = 'none' })
        }
    }
    play() {
        // console.log(`Playing media: ${this.name}, type: ${this.type}`)
        this.dom_element.style.display = 'block'
        this.dom_element.start_ms = new Date().getTime()
        // debugLog(`[SwMedia] play() called for ${this.name}, type: ${this.type}`)
        
        // Default to image if type is still undefined at this point
        if (!this.type) {
            console.log(`No type defined for media ${this.name}, defaulting to Image`)
            this.type = 'Image'
            this.duration = DEFAULTS.IMAGE_PLAYBACK_DURATION
        }
        
        if (this.type === 'Video') {
            const video_div = this.dom_element.querySelector('video')
            if (!video_div) {
                console.error(`Video element not found for ${this.name}`)
                
                // Fallback to image mode
                console.log(`Falling back to image mode for ${this.name}`)
                this.type = 'Image'
                this.duration = DEFAULTS.IMAGE_PLAYBACK_DURATION
                
                // Add an image as fallback
                const fallbackImg = document.createElement('img')
                fallbackImg.src = this.fileDO
                fallbackImg.style.width = '100%'
                fallbackImg.style.height = '100%'
                fallbackImg.style.objectFit = 'fill' // Always use fill to not maintain aspect ratio
                fallbackImg.style.position = 'absolute'
                fallbackImg.style.top = '0'
                fallbackImg.style.left = '0'
                this.dom_element.appendChild(fallbackImg)
                
                // Start progress bar for image duration
                this.progressBar.start(this.duration * 1000)
                
                // Setup timeout for next media
                setTimeout(() => {
                    this.dom_element.style.display = 'none'
                    
                    // Log the current state of the playlist before advancing
                    if (this.parent && typeof this.parent.debugPrintList === 'function') {
                        console.log('Playlist state before advancing:');
                        this.parent.debugPrintList();
                    }
                    
                    // Call next() and get the next media
                    const success = this.parent.next();
                    const nextMedia = this.parent.getCurrent();
                    
                    if (success && nextMedia && typeof nextMedia.play === 'function') {
                        console.log(`Playing next media: ${nextMedia.name}`);
                        nextMedia.play();
                    } else {
                        debugLog('[SwMedia] No next media to play or play() is not a function', nextMedia);
                        console.error('Failed to get next media. Trying to restart playlist.');
                        
                        // Try to restart playlist from beginning
                        if (this.parent.moveToBeginning()) {
                            const firstMedia = this.parent.getCurrent();
                            if (firstMedia) {
                                console.log('Restarting playlist from first item');
                                firstMedia.play();
                            }
                        }
                    }
                }, this.duration * 1000)
                
                return
            }
            
            debugLog(`[SwMedia] video_div.duration: ${video_div.duration}`)
            video_div.currentTime = 0 // rewind
            
            const promise = video_div.play()
            if (promise !== undefined) {
                promise.then(_ => {
                    // debugLog(`[SwMedia] ProgressBar.start called for video with duration: ${video_div.duration * 1000}`)
                    this.progressBar.start(video_div.duration * 1000)
                }).catch(error => {
                    console.error(`Autoplay failed for ${this.dom_element.id}: ${error}`)
                    console.log(`Video details: src=${video_div.src}, type=${this.type}, fileURL=${this.fileDO}`)
                    
                    // Create a play button for user interaction if autoplay fails
                    const playButton = document.createElement('button')
                    playButton.textContent = 'Play Video'
                    playButton.style.position = 'absolute'
                    playButton.style.top = '50%'
                    playButton.style.left = '50%'
                    playButton.style.transform = 'translate(-50%, -50%)'
                    playButton.style.zIndex = '100'
                    
                    playButton.onclick = () => {
                        console.log(`Manual play attempt for: ${video_div.src}`)
                        video_div.play()
                            .then(() => {
                                playButton.remove()
                                this.progressBar.start(video_div.duration * 1000)
                            })
                            .catch(e => {
                                console.error(`Play failed after button click: ${e}`)
                                
                                // Show more diagnostic information for the video error
                                const errorType = e.name || 'Unknown error';
                                const videoDetails = {
                                    error: video_div.error ? `code: ${video_div.error.code}, message: ${video_div.error.message}` : 'No error details',
                                    networkState: video_div.networkState,
                                    readyState: video_div.readyState,
                                    src: video_div.src,
                                    type: this.type
                                };
                                console.log(`Video error details: ${errorType}`, videoDetails);
                                
                                // Add visual error message to the player
                                const errorMsg = document.createElement('div');
                                errorMsg.className = 'media-error';
                                errorMsg.style.position = 'absolute';
                                errorMsg.style.top = '60%';
                                errorMsg.style.left = '50%';
                                errorMsg.style.transform = 'translateX(-50%)';
                                errorMsg.style.backgroundColor = 'rgba(0,0,0,0.7)';
                                errorMsg.style.color = 'red';
                                errorMsg.style.padding = '10px';
                                errorMsg.style.borderRadius = '5px';
                                errorMsg.textContent = `Video cannot be played (${errorType})`;
                                this.dom_element.appendChild(errorMsg);
                            })
                    }
                    
                    this.dom_element.appendChild(playButton)
                })
            }
        } else if (this.type === 'Image') {
            // debugLog(`[SwMedia] ProgressBar.start called for image with duration: ${this.duration * 1000}`)
            this.progressBar.start(this.duration * 1000)
            
            // Ensure the image is visible
            const img = this.dom_element.querySelector('img')
            if (img) {
                img.style.display = 'block'
            } else {
                console.log(`Image element not found for ${this.name}, creating one`)
                
                // Create an image element if it doesn't exist
                const fallbackImg = document.createElement('img')
                fallbackImg.src = this.fileDO
                fallbackImg.style.width = '100%'
                fallbackImg.style.height = '100%'
                fallbackImg.style.objectFit = 'fill' // Always use fill to not maintain aspect ratio
                fallbackImg.style.position = 'absolute'
                fallbackImg.style.top = '0'
                fallbackImg.style.left = '0'
                this.dom_element.appendChild(fallbackImg)
            }
            
            setTimeout(() => {
                this.dom_element.style.display = 'none'
                
                // Log the current state of the playlist before advancing
                if (this.parent && typeof this.parent.debugPrintList === 'function') {
                    console.log('Playlist state before advancing from image:');
                    this.parent.debugPrintList();
                }
                
                // Call .next() on the parent LinkedList
                const success = this.parent.next()
                
                // Get the current media after moving to next
                const nextMedia = this.parent.getCurrent()
                
                if (success && nextMedia && typeof nextMedia.play === 'function') {
                    console.log(`Playing next media: ${nextMedia.name}`)
                    nextMedia.play()
                } else {
                    debugLog('[SwMedia] No next media to play or play() is not a function', nextMedia)
                    console.error('Failed to get next media element. Attempting to restart playlist.')
                    
                    // Try to restart from beginning
                    if (this.parent.moveToBeginning()) {
                        const firstMedia = this.parent.getCurrent()
                        if (firstMedia) {
                            console.log('Restarting playlist from first item')
                            firstMedia.play()
                        }
                    }
                }
            }, this.duration * 1000)
        } else {
            console.error(`Cannot play media with unknown type: ${this.type}`)
            
            // Default to image mode
            console.log(`Defaulting to image mode for unknown type: ${this.name}`)
            this.type = 'Image'
            this.duration = DEFAULTS.IMAGE_PLAYBACK_DURATION
            
            // Add an image as fallback
            const fallbackImg = document.createElement('img')
            fallbackImg.src = this.fileDO
            fallbackImg.style.width = '100%'
            fallbackImg.style.height = '100%'
            fallbackImg.style.objectFit = 'fill' // Always use fill to not maintain aspect ratio
            fallbackImg.style.position = 'absolute'
            fallbackImg.style.top = '0'
            fallbackImg.style.left = '0'
            this.dom_element.appendChild(fallbackImg)
            
            // Start progress bar for image duration
            this.progressBar.start(this.duration * 1000)
            
            // Skip to next media after duration
            setTimeout(() => {
                this.dom_element.style.display = 'none'
                
                // Call .next() on the parent LinkedList
                const success = this.parent.next()
                
                // Get the current media after moving to next
                const nextMedia = this.parent.getCurrent()
                
                if (success && nextMedia && typeof nextMedia.play === 'function') {
                    // console.log(`Playing next media: ${nextMedia.name}`)
                    nextMedia.play()
                } else {
                    debugLog('[SwMedia] No next media to play or play() is not a function', nextMedia)
                    console.error('Failed to get next media element. Attempting to restart playlist.')
                    
                    // Try to restart from beginning
                    if (this.parent.moveToBeginning()) {
                        const firstMedia = this.parent.getCurrent()
                        if (firstMedia) {
                            console.log('Restarting playlist from first item')
                            firstMedia.play()
                        }
                    }
                }
            }, this.duration * 1000)
        }
    }
    resume() {
        this.dom_element.style.display = 'block'
        // debugLog(`[SwMedia] resume() called for ${this.name}, type: ${this.type}`)
        
        // Default to image if type is still undefined
        if (!this.type) {
            // TODO: false positive
            console.log(`No type defined for media ${this.name} during resume, defaulting to Image`)
            this.type = 'Image'
            this.duration = DEFAULTS.IMAGE_PLAYBACK_DURATION
        }
        
        if (this.type === 'Video') {
            const video = this.dom_element.querySelector('video')
            if (video) {
                const playPromise = video.play()
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error(`Resume failed for video ${this.name}: ${error}`)
                        
                        // If resume fails, show play button for user interaction
                        const playButton = document.createElement('button')
                        playButton.textContent = 'Play Video'
                        playButton.style.position = 'absolute'
                        playButton.style.top = '50%'
                        playButton.style.left = '50%'
                        playButton.style.transform = 'translate(-50%, -50%)'
                        playButton.style.zIndex = '100'
                        
                        playButton.onclick = () => {
                            video.play()
                                .then(() => {
                                    playButton.remove()
                                    this.progressBar.resume()
                                })
                                .catch(e => console.error(`Play failed after button click: ${e}`))
                        }
                        
                        this.dom_element.appendChild(playButton)
                    })
                }
                this.progressBar.resume()
            } else {
                console.log(`Cannot resume video ${this.name}: video element not found`)
                this.play() // Fallback to play which will recreate the video element
            }
        } else if (this.type === 'Image') {
            // If the image is hidden or progress bar is at 0%, restart playback
            const isHidden = this.dom_element.style.display === 'none'
            const progress = this.progressBar && this.progressBar.bar ? 
                parseFloat(this.progressBar.bar.style.width) : 0
                
            if (isHidden || progress === 0) {
                // debugLog(`[SwMedia] resume() restarting play() for image: ${this.name}`)
                this.play()
            } else {
                // console.log(`Resuming image: ${this.name}`)
                this.progressBar.resume()
            }
        } else {
            // console.log(`Defaulting to Image type for ${this.name} during resume`)
            this.type = 'Image'
            this.duration = DEFAULTS.IMAGE_PLAYBACK_DURATION
            this.play()
        }
    }
    pause() {
        if (this.type === 'Video') {
            const video = this.dom_element.querySelector('video')
            if (video) {
                video.pause()
                this.progressBar.pause()
            }
        } else if (this.type === 'Image') {
            // console.log(`Pausing image: ${this.name}`)
            this.progressBar.pause()
        }
    }
}