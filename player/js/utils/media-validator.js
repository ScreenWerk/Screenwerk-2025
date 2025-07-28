// Utility functions to validate media resources

import { ENVIRONMENT, UI_VISIBILITY } from '../../../common/config/constants.js'

/**
 * Checks if a media URL exists and is accessible
 * @param {string} url - The URL to check
 * @param {string} type - The media type ('Image' or 'Video')
 * @returns {Promise<{isValid: boolean, detectedType: string}>} - Whether the URL is valid and its detected type
 */
export async function checkMediaUrl(url, type) {
    return new Promise(async (resolve) => {
        console.log(`Checking media URL: ${url}, type: ${type || 'undefined'}`)
        
        // For both image and video, we'll use fetch with HEAD request first
        try {
            const response = await fetch(url, { method: 'HEAD' })
            
            if (response.ok) {
                console.log(`URL ${url} is accessible (status ${response.status})`)
                
                // Try to detect type from content-type header
                const contentType = response.headers.get('content-type')
                let detectedType = type
                
                if (!detectedType && contentType) {
                    console.log(`Content-Type for ${url}: ${contentType}`)
                    if (contentType.startsWith('image/')) {
                        detectedType = 'Image'
                    } else if (contentType.startsWith('video/')) {
                        detectedType = 'Video'
                    }
                }
                
                // If still no type, try to infer from URL extension
                if (!detectedType) {
                    const fileUrl = url.toLowerCase()
                    if (fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg') || 
                        fileUrl.endsWith('.png') || fileUrl.endsWith('.gif') || 
                        fileUrl.endsWith('.webp')) {
                        detectedType = 'Image'
                    } else if (fileUrl.endsWith('.mp4') || fileUrl.endsWith('.webm') || 
                            fileUrl.endsWith('.mov') || fileUrl.endsWith('.avi')) {
                        detectedType = 'Video'
                    }
                }
                
                // Default to image if still undefined
                if (!detectedType) {
                    console.log(`No media type detected for ${url}, defaulting to Image`)
                    detectedType = 'Image'
                }
                
                console.log(`Detected media type for ${url}: ${detectedType}`)
                
                // For videos, do an additional check to verify format support
                if (detectedType === 'Video') {
                    console.log(`Checking video format support for ${url}...`)
                    const videoCheck = await checkVideoSupport(url)
                    
                    if (!videoCheck.isSupported) {
                        console.warn(`Video format not supported: ${url}`, videoCheck.details)
                        // We still return isValid true since the URL is accessible, but we'll log the format issue
                    }
                }
                
                resolve({ isValid: true, detectedType })
            } else {
                console.error(`URL ${url} returned status ${response.status}`)
                resolve({ isValid: false, detectedType: null })
            }
        } catch (error) {
            console.error(`Error checking URL ${url}: ${error}`)
            // For cross-origin errors, we'll still try to proceed if we have a known type
            if (error.name === 'TypeError' && error.message.includes('cross-origin') && type) {
                console.log(`URL ${url} has cross-origin issues but we'll still try with type: ${type}`)
                resolve({ isValid: true, detectedType: type })
            } else {
                resolve({ isValid: false, detectedType: null })
            }
        }
    })
}

/**
 * Displays debug information about a media element
 * @param {HTMLElement} element - The media element to debug
 * @param {Object} mediaInfo - Information about the media
 */
export function displayMediaDebugInfo(element, mediaInfo) {
    // Only show if allowed by UI_VISIBILITY
    const ui = (typeof UI_VISIBILITY !== 'undefined' && typeof ENVIRONMENT !== 'undefined')
        ? UI_VISIBILITY
        : { showMediaDebugInfo: true }
    if (!ui.showMediaDebugInfo) return

    const debugInfo = document.createElement('div')
    debugInfo.className = 'media-debug-info'
    debugInfo.style.position = 'absolute'
    debugInfo.style.top = '10px'
    debugInfo.style.left = '10px'
    debugInfo.style.backgroundColor = 'rgba(0,0,0,0.7)'
    debugInfo.style.color = 'white'
    debugInfo.style.padding = '5px'
    debugInfo.style.fontSize = '10px'
    debugInfo.style.zIndex = '1000'
    
    debugInfo.innerHTML = `
        <div>Name: ${mediaInfo.name || 'Unknown'}</div>
        <div>Type: ${mediaInfo.type || 'Unknown'}</div>
        <div>Size: ${mediaInfo.width || '?'} x ${mediaInfo.height || '?'}</div>
        <div>URL: ${mediaInfo.url ? (mediaInfo.url.substring(0, 30) + '...') : 'None'}</div>
    `
    
    element.appendChild(debugInfo)
}

/**
 * Checks if a video format is supported by the browser
 * @param {string} url - The URL of the video to check
 * @returns {Promise<Object>} - Object with isSupported and details properties
 */
export function checkVideoSupport(url) {
    return new Promise((resolve) => {
        const video = document.createElement('video')
        video.style.display = 'none'
        video.crossOrigin = 'anonymous'
        
        // Set up error listener
        video.addEventListener('error', () => {
            const error = video.error
            const details = {
                code: error ? error.code : 'No error code',
                message: error ? error.message : 'No error message',
                mediaError: error ? getMediaErrorName(error.code) : 'Unknown',
                url: url
            }
            
            console.log(`Video support check failed for ${url}:`, details)
            resolve({ isSupported: false, details })
            
            // Clean up
            document.body.removeChild(video)
        }, { once: true })
        
        // Set up success listener
        video.addEventListener('canplay', () => {
            const details = {
                duration: video.duration,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                url: url
            }
            
            console.log(`Video support check passed for ${url}:`, details)
            resolve({ isSupported: true, details })
            
            // Clean up
            document.body.removeChild(video)
        }, { once: true })
        
        // Attach to DOM (needed for some browsers)
        document.body.appendChild(video)
        
        // Set source and load
        video.src = url
        video.load()
    })
}

/**
 * Get human-readable MediaError name from error code
 * @param {number} code - The MediaError code
 * @returns {string} - Human-readable error name
 */
function getMediaErrorName(code) {
    switch(code) {
        case 1: return 'MEDIA_ERR_ABORTED - Fetching process aborted by user'
        case 2: return 'MEDIA_ERR_NETWORK - Network error'
        case 3: return 'MEDIA_ERR_DECODE - Media decoding error'
        case 4: return 'MEDIA_ERR_SRC_NOT_SUPPORTED - Format not supported'
        default: return `Unknown error code: ${code}`
    }
}
