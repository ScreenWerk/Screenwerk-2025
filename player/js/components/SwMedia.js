// Disclaimer: no semicolons, if unnecessary, are used in this project

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
    }
    play() {
        this.dom_element.style.display = 'block'
        this.dom_element.start_ms = new Date().getTime()
        if (this.type === 'Video') {
            const video_div = this.dom_element.querySelector('video')
            video_div.currentTime = 0 // rewind
            const promise = video_div.play()
            if (promise !== undefined) {
                promise.then(_ => {
                    // console.log(`Autoplay started for ${this.dom_element.id}`)
                }).catch(error => {
                    // console.log(`Autoplay failed for ${this.dom_element.id}: ${error}`)
                })
            }
        } else if (this.type === 'Image') {
            // console.log(`Image ${this.dom_element.id} started for ${this.duration} s`)
            setTimeout(() => {
                this.dom_element.style.display = 'none'
                const elapsed_ms = new Date().getTime() - this.dom_element.start_ms
                // console.log(`Image ${this.dom_element.id} ended after ${elapsed_ms} ms`)
                this.parent.next().play()
            }, this.duration * 1e3)
        }
    }
}