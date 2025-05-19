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
        video.crossOrigin = 'anonymous' // Add crossorigin for CORS media
        
        // Log the video source for debugging
        // console.log(`Creating video element with source: ${mediaItem.source}`)
        
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
        
        console.log(`Playing video: ${videoElement.src}`)
        
        // Add canplay event listener to ensure video is ready
        videoElement.addEventListener('canplay', () => {
            console.log(`Video can play: ${videoElement.src}`)
        }, { once: true })
        
        // Return the play promise for handling by the caller
        return videoElement.play()
            .catch(error => {
                console.error(`Video play error: ${error.name} - ${error.message}`)
                
                // Check if the error is format-related
                if (error.name === 'NotSupportedError') {
                    console.log('Video format may not be supported - adding debug info');
                    
                    // Show more detailed info about video element
                    console.log('Video element details:', {
                        src: videoElement.src,
                        networkState: videoElement.networkState,
                        readyState: videoElement.readyState,
                        error: videoElement.error ? videoElement.error.code : 'none'
                    });
                }
                
                // Re-throw the error for the caller to handle
                throw error
            })
    }
    
    handlePause(videoElement) {
        videoElement.pause()
        return true
    }
}
