// Utility functions to validate media resources

import { ENVIRONMENT, UI_VISIBILITY } from '../../../common/config/constants.js'

/**
 * Detects media type from content-type header
 * @param {string} contentType - The content-type header value
 * @returns {string|null} - The detected media type or null
 */
function detectTypeFromContentType(contentType) {
    if (!contentType) return null
    
    if (contentType.startsWith('image/')) {
        return 'Image'
    }
    if (contentType.startsWith('video/')) {
        return 'Video'
    }
    return null
}

/**
 * Detects media type from URL file extension
 * @param {string} url - The URL to analyze
 * @returns {string|null} - The detected media type or null
 */
function detectTypeFromUrl(url) {
    const fileUrl = url.toLowerCase()
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi']
    
    if (imageExtensions.some(ext => fileUrl.endsWith(ext))) {
        return 'Image'
    }
    if (videoExtensions.some(ext => fileUrl.endsWith(ext))) {
        return 'Video'
    }
    return null
}

/**
 * Determines the final media type using multiple detection methods
 * @param {string} url - The URL being checked
 * @param {string} providedType - The type provided by caller
 * @param {string} contentType - The content-type header from response
 * @returns {string} - The determined media type
 */
function determineMediaType(url, providedType, contentType) {
    console.log(`Content-Type for ${url}: ${contentType || 'none'}`)
    
    let detectedType = providedType || detectTypeFromContentType(contentType) || detectTypeFromUrl(url)
    
    if (!detectedType) {
        console.log(`No media type detected for ${url}, defaulting to Image`)
        detectedType = 'Image'
    }
    
    console.log(`Detected media type for ${url}: ${detectedType}`)
    return detectedType
}

/**
 * Handles validation for successful HTTP response
 * @param {Response} response - The fetch response object
 * @param {string} url - The URL being checked
 * @param {string} type - The provided media type
 * @returns {Promise<{isValid: boolean, detectedType: string}>}
 */
async function handleSuccessfulResponse(response, url, type) {
    console.log(`URL ${url} is accessible (status ${response.status})`)
    
    const contentType = response.headers.get('content-type')
    const detectedType = determineMediaType(url, type, contentType)
    
    // For videos, do an additional check to verify format support
    if (detectedType === 'Video') {
        console.log(`Checking video format support for ${url}...`)
        const videoCheck = await checkVideoSupport(url)
        
        if (!videoCheck.isSupported) {
            console.warn(`Video format not supported: ${url}`, videoCheck.details)
            // We still return isValid true since the URL is accessible, but we'll log the format issue
        }
    }
    
    return { isValid: true, detectedType }
}

/**
 * Handles errors that occur during URL validation
 * @param {Error} error - The error that occurred
 * @param {string} url - The URL being checked
 * @param {string} type - The provided media type
 * @returns {{isValid: boolean, detectedType: string|null}}
 */
function handleValidationError(error, url, type) {
    console.error(`Error checking URL ${url}: ${error}`)
    
    // For cross-origin errors, we'll still try to proceed if we have a known type
    if (error.name === 'TypeError' && error.message.includes('cross-origin') && type) {
        console.log(`URL ${url} has cross-origin issues but we'll still try with type: ${type}`)
        return { isValid: true, detectedType: type }
    }
    
    return { isValid: false, detectedType: null }
}

/**
 * Checks if a media URL exists and is accessible
 * @param {string} url - The URL to check
 * @param {string} type - The media type ('Image' or 'Video')
 * @returns {Promise<{isValid: boolean, detectedType: string}>} - Whether the URL is valid and its detected type
 */
export async function checkMediaUrl(url, type) {
    console.log(`Checking media URL: ${url}, type: ${type || 'undefined'}`)
    
    try {
        const response = await fetch(url, { method: 'HEAD' })
        
        if (response.ok) {
            return await handleSuccessfulResponse(response, url, type)
        } else {
            console.error(`URL ${url} returned status ${response.status}`)
            return { isValid: false, detectedType: null }
        }
    } catch (error) {
        return handleValidationError(error, url, type)
    }
}

/**
 * Creates styled debug info element
 * @returns {HTMLDivElement} - The styled debug info element
 */
function createDebugInfoElement() {
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
    return debugInfo
}

/**
 * Generates debug info HTML content
 * @param {Object} mediaInfo - Information about the media
 * @returns {string} - The HTML content for debug info
 */
function generateDebugInfoContent(mediaInfo) {
    const name = mediaInfo.name || 'Unknown'
    const type = mediaInfo.type || 'Unknown'
    const size = `${mediaInfo.width || '?'} x ${mediaInfo.height || '?'}`
    const url = mediaInfo.url ? (mediaInfo.url.substring(0, 30) + '...') : 'None'
    
    return `
        <div>Name: ${name}</div>
        <div>Type: ${type}</div>
        <div>Size: ${size}</div>
        <div>URL: ${url}</div>
    `
}

/**
 * Checks if debug info should be displayed
 * @returns {boolean} - Whether to show debug info
 */
function shouldShowDebugInfo() {
    const ui = (typeof UI_VISIBILITY !== 'undefined' && typeof ENVIRONMENT !== 'undefined')
        ? UI_VISIBILITY
        : { showMediaDebugInfo: true }
    return ui.showMediaDebugInfo
}

/**
 * Displays debug information about a media element
 * @param {HTMLElement} element - The media element to debug
 * @param {Object} mediaInfo - Information about the media
 */
export function displayMediaDebugInfo(element, mediaInfo) {
    if (!shouldShowDebugInfo()) return

    const debugInfo = createDebugInfoElement()
    debugInfo.innerHTML = generateDebugInfoContent(mediaInfo)
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
