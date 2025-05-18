// Disclaimer: no semicolons, if unnecessary, are used in this project

import { ProgressBar } from '../ui/ProgressBar.js'
import { debugLog } from '../../../common/utils/debug-utils.js' // Updated path

const DEFAULTS = {
    IMAGE_PLAYBACK_DURATION: 10
}

export class SwMedia {
    constructor(parent, dom_element, configuration) {
        this.parent = parent
        this.dom_element = dom_element
        this.type = configuration.mediaType
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
        // console.log('rendering media', this)
        this.dom_element.id = this.mediaEid
        this.dom_element.setAttribute('name', this.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${this.mediaEid}`)
        this.dom_element.setAttribute('type', this.type)
        this.dom_element.setAttribute('file', this.fileDO)
        this.dom_element.setAttribute('validFrom', this.validFrom)
        this.dom_element.setAttribute('validTo', this.validTo)
        this.dom_element.setAttribute('ordinal', this.ordinal)
        this.dom_element.classList.add('media')
        this.parent.dom_element.appendChild(this.dom_element)

        if (this.type === 'Image') {
            const img = document.createElement('img')
            img.src = this.fileDO
            img.style.width = '100%'
            img.style.height = '100%'
            // img.style.objectFit = this.stretch ? 'cover' : 'contain'
            this.dom_element.appendChild(img)
        } else if (this.type === 'Video') {
            const video = document.createElement('video')
            video.src = this.fileDO
            video.style.width = '100%'
            video.style.height = '100%'
            video.muted = this.mute
            video.loop = false  // Changed to false since we handle looping ourselves
            video.autoplay = false  // Changed to false for explicit control
            // video.style.objectFit = this.stretch ? 'cover' : 'contain'
            
            // Set up the ended event listener during initialization
            video.addEventListener('ended', () => {
                const elapsed_ms = new Date().getTime() - this.dom_element.start_ms
                // console.log(`Video ${this.dom_element.id} ended after ${elapsed_ms} ms`)
                this.dom_element.style.display = 'none'
                this.parent.next().play()
            })
            
            this.dom_element.appendChild(video)
            video.pause()  // Ensure it's paused initially
        }

        // Add a progress bar to the media element
        this.progressBar = new ProgressBar(this.dom_element, {
            barColor: '#00a1ff',
            backgroundColor: 'rgba(0,0,0,0.3)',
            height: '4px'
        })
    }
    play() {
        this.dom_element.style.display = 'block'
        this.dom_element.start_ms = new Date().getTime()
        debugLog(`[SwMedia] play() called for ${this.name}, type: ${this.type}`)
        if (this.type === 'Video') {
            const video_div = this.dom_element.querySelector('video')
            debugLog(`[SwMedia] video_div.duration: ${video_div.duration}`)
            video_div.currentTime = 0 // rewind
            const promise = video_div.play()
            if (promise !== undefined) {
                promise.then(_ => {
                    debugLog(`[SwMedia] ProgressBar.start called for video with duration: ${video_div.duration * 1000}`)
                    this.progressBar.start(video_div.duration * 1000)
                }).catch(error => {
                    console.log(`Autoplay failed for ${this.dom_element.id}: ${error}`)
                })
            }
        } else if (this.type === 'Image') {
            debugLog(`[SwMedia] ProgressBar.start called for image with duration: ${this.duration * 1000}`)
            this.progressBar.start(this.duration * 1000)
            setTimeout(() => {
                this.dom_element.style.display = 'none'
                const nextMedia = this.parent.next()
                if (nextMedia && typeof nextMedia.play === 'function') {
                    nextMedia.play()
                } else {
                    debugLog('[SwMedia] No next media to play or play() is not a function', nextMedia)
                }
            }, this.duration * 1000)
        }
    }
    resume() {
        this.dom_element.style.display = 'block'
        debugLog(`[SwMedia] resume() called for ${this.name}, type: ${this.type}`)
        if (this.type === 'Video') {
            const video = this.dom_element.querySelector('video')
            if (video) {
                video.play()
                this.progressBar.resume()
            }
        } else if (this.type === 'Image') {
            // If the image is hidden or progress bar is at 0%, restart playback
            const isHidden = this.dom_element.style.display === 'none'
            const progress = parseFloat(this.progressBar.bar.style.width)
            if (isHidden || progress === 0) {
                debugLog(`[SwMedia] resume() restarting play() for image: ${this.name}`)
                this.play()
            } else {
                console.log(`Resuming image: ${this.name}`)
                this.progressBar.resume()
            }
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
            console.log(`Pausing image: ${this.name}`)
            this.progressBar.pause()
        }
    }
}