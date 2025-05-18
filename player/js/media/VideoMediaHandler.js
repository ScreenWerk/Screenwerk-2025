// Disclaimer: no semicolons, if unnecessary, are used in this project

export class VideoMediaHandler {
    constructor() {
        // Constructor logic
    }

    createMediaElement(mediaItem, container) {
        const video = document.createElement('video')
        
        video.style.width = '100%'
        video.style.height = '100%'
        video.muted = mediaItem.mute !== false // Default to muted for mini-player
        video.loop = false // We handle looping ourselves
        video.style.objectFit = 'fill' // Always use fill to not maintain aspect ratio
        video.autoplay = false // We'll play explicitly
        video.playsInline = true // For iOS support
        video.controls = false // No controls for the player
        
        // Set src after handlers to catch errors
        video.src = mediaItem.source
        
        // Add error handler
        video.onerror = (e) => {
            console.error(`Failed to load video: ${mediaItem.source}`, e)
            container.innerHTML += `<div class="media-error">Failed to load video</div>`
        }
        
        return video
    }
    
    handlePlay(videoElement) {
        videoElement.currentTime = 0 // Rewind
        return videoElement.play()
    }
    
    handlePause(videoElement) {
        videoElement.pause()
        return true
    }
}
