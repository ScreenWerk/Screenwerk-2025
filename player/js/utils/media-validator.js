// Utility functions to validate media resources

/**
 * Checks if a media URL exists and is accessible
 * @param {string} url - The URL to check
 * @param {string} type - The media type ('Image' or 'Video')
 * @returns {Promise<{isValid: boolean, detectedType: string}>} - Whether the URL is valid and its detected type
 */
export async function checkMediaUrl(url, type) {
    return new Promise((resolve) => {
        console.log(`Checking media URL: ${url}, type: ${type || 'undefined'}`)
        
        // For both image and video, we'll use fetch with HEAD request first
        fetch(url, { method: 'HEAD' })
            .then(response => {
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
                    resolve({ isValid: true, detectedType })
                } else {
                    console.error(`URL ${url} returned status ${response.status}`)
                    resolve({ isValid: false, detectedType: null })
                }
            })
            .catch(error => {
                console.error(`Error checking URL ${url}: ${error}`)
                resolve({ isValid: false, detectedType: null })
            })
    })
}

/**
 * Displays debug information about a media element
 * @param {HTMLElement} element - The media element to debug
 * @param {Object} mediaInfo - Information about the media
 */
export function displayMediaDebugInfo(element, mediaInfo) {
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
