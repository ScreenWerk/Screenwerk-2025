// filepath: /home/michelek/Documents/github/sw25/player/js/script.js
// Disclaimer: no semicolons, if unnecessary, are used in this project

import { fetchJSON } from '../../common/utils/utils.js'
import { SCREENWERK_PUBLISHER_API } from '../../common/config/constants.js' 
import { EntuScreenWerkPlayer } from './sw-player.js'
import { toDateTimeString } from '../../common/utils/common.js'
import { debugLog } from '../../common/utils/debug-utils.js' // Updated path

// Enable debug mode globally for development/troubleshooting
window.debugMode = true

const reportProblem = (message, with_link = false) => {
    console.error(message)
    document.getElementById('error').textContent = message
    document.getElementById('error').style.display = 'block'
    if (with_link) {
        const link = document.createElement('a')
        link.href = 'screen-select.html'
        link.textContent = 'Go to screen selection page'
        document.getElementById('error').appendChild(document.createElement('br'))
        document.getElementById('error').appendChild(link)
    }
}

// Check for screen ID in URL query parameters
const getScreenIdFromUrl = () => {
    if (!window.location.search) return null
    
    const urlParams = new URLSearchParams(window.location.search)
    const screen_id = urlParams.get('screen_id')
    
    if (!screen_id) {
        reportProblem('No screen_id in URL query', true)
        return null
    }

    // Sanity check the screen ID format
    const eid_re = /^[0-9a-f]{24}$/
    if (!eid_re.test(screen_id)) {
        reportProblem('Invalid screen_id in URL query', true)
        return null
    }
    
    return screen_id
}

// Save screen ID to localStorage and reload with clean URL
const saveScreenIdAndReload = (screen_id) => {
    // Save screen ID to localStorage
    localStorage.setItem(
        'selected_screen',
        JSON.stringify({ screen_id })
    )
    
    // Reload with clean URL
    const cleanUrl = new URL(window.location.href)
    cleanUrl.search = '' // Remove all query parameters
    window.location.href = cleanUrl.toString() // This will reload the page
}

// Get screen ID from localStorage
const getScreenIdFromStorage = () => {
    const screen_json = localStorage.getItem('selected_screen')
    if (!screen_json) {
        reportProblem('No screen ID provided in URL and none found in storage. Please select a screen.', true)
        return null
    }

    try {
        const stored_screen = JSON.parse(screen_json)
        const screen_id = stored_screen.screen_id
        
        if (!screen_id) {
            reportProblem('Invalid screen data in storage. Please select a screen again.', true)
            return null
        }
        
        return screen_id
    } catch (error) {
        reportProblem('Failed to parse stored screen data. Please select a screen again.', true)
        console.error(error)
        return null
    }
}

// Fetch configuration from API
const fetchConfiguration = async (screen_id) => {
    const u = `${SCREENWERK_PUBLISHER_API}${screen_id}.json`
    try {
        const sw_configuration = await fetchJSON(u)
        const configuration_id = sw_configuration.configurationEid
        
        // Clean up configuration
        const unset = ['screenEid', 'configurationEid', 'screenGroupEid']
        unset.forEach((key) => delete sw_configuration[key])
        
        return {
            configuration: sw_configuration,
            configuration_id
        }
    } catch (fetchError) {
        reportProblem(`Failed to fetch configuration for screen ID: ${screen_id}`, true)
        console.error(fetchError)
        return null
    }
}

// Initialize the UI with configuration data
const initializeUI = (screen_id, configuration) => {
    const screen_id_element = document.getElementById('screenId')
    screen_id_element.textContent = screen_id
    screen_id_element.setAttribute('href', `https://entu.app/piletilevi/${screen_id}`)

    document.getElementById('published').textContent = toDateTimeString(configuration.publishedAt)
    document.getElementById('configuration').textContent = JSON.stringify(configuration, null, 2)
}

// Register media for caching in service worker
const registerMediaForCaching = (configuration) => {
    // Medias are deeply nested under configuration.schedules[].layoutPlaylists[].playlistMedias[].file
    const mediaToCache = configuration.schedules
        .flatMap((schedule) => schedule.layoutPlaylists)
        .flatMap((layoutPlaylist) => layoutPlaylist.playlistMedias)
        .map((playlistMedia) => playlistMedia.fileDO)

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered with scope:', registration.scope)
                if (registration.active) {
                    registration.active.postMessage({
                        type: 'CACHE_URLS',
                        urls: mediaToCache
                    })
                }
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error)
            })
    }
}

// Initialize the player with configuration
const initializePlayer = (configuration) => {
    const player_element = document.getElementById('player')
    
    // Add debug information about what's being loaded
    console.log('Initializing player with configuration:', configuration)
    
    // Check if configuration contains media files
    if (configuration.schedules) {
        console.log(`Found ${configuration.schedules.length} schedules`)
        
        // Log details about playlists and media
        const mediaItems = configuration.schedules
            .flatMap((schedule) => schedule.layoutPlaylists)
            .flatMap((layoutPlaylist) => layoutPlaylist.playlistMedias)
            
        console.log(`Total media items found: ${mediaItems.length}`)
        
        // Log the first few media items to check their structure
        if (mediaItems.length > 0) {
            console.log('Sample media item:', mediaItems[0])
        }
    }
    
    const player = new EntuScreenWerkPlayer(player_element, configuration)
    player.resume() // Using resume() instead of play() as per the player implementation
}

window.onload = async () => {
    // 1. Check if there is a screen selected in URL query
    const urlScreenId = getScreenIdFromUrl()
    if (urlScreenId) {
        saveScreenIdAndReload(urlScreenId)
        return // Stop execution as page will reload
    }
    
    // 2. Check if screen ID is stored in browser
    const storedScreenId = getScreenIdFromStorage()
    if (!storedScreenId) {
        return // Error already reported in getScreenIdFromStorage
    }
    
    // 3. Fetch configuration from API
    const configData = await fetchConfiguration(storedScreenId)
    if (!configData) {
        return // Error already reported in fetchConfiguration
    }
    
    // 4. Initialize UI and player
    initializeUI(storedScreenId, configData.configuration)
    registerMediaForCaching(configData.configuration)
    initializePlayer(configData.configuration)
}

async function updateServiceWorker() {
    const registration = await navigator.serviceWorker.register('/service-worker.js')
    
    if (registration.waiting) {
        // If there's a waiting worker, activate it immediately
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    
    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && registration.active) {
                // If there's a new worker waiting, activate it
                newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
            if (newWorker.state === 'activated') {
                console.log('New service worker activated');
                window.location.reload();
            }
        });
    });
}

window.addEventListener('load', updateServiceWorker)
