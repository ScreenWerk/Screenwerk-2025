// Disclaimer: no semicolons, if unnecessary, are used in this project

export class ImageMediaHandler {
    constructor(defaults) {
        this.defaults = defaults
    }

    createMediaElement(mediaItem, container) {
        const img = document.createElement('img')
        
        // Set attributes before appending to avoid empty display
        img.alt = mediaItem.name || 'Image'
        img.style.width = '100%'
        img.style.height = '100%'
        // Use object-fit: fill to not maintain aspect ratio instead of contain/cover
        img.style.objectFit = 'fill'
        
        // Add loading handler
        img.onload = () => {
            // console.log(`Image loaded successfully: ${mediaItem.name}`)
        }
        
        // Add error handler
        img.onerror = (e) => {
            console.error(`Failed to load image: ${mediaItem.source}`, e)
            container.innerHTML += `<div class="media-error">Failed to load image</div>`
        }
        
        // Set src after handlers to catch errors
        img.src = mediaItem.source
        
        return img
    }

    getDuration(mediaItem) {
        return mediaItem.duration || this.defaults.IMAGE_PLAYBACK_DURATION
    }
    
    handlePlay(mediaElement, options) {
        // Image playback is handled by the player via timeout
        return true
    }
    
    handlePause(mediaElement) {
        // Images don't need special pause handling
        return true
    }
}
