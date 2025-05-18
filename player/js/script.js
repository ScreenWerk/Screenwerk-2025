// filepath: /home/michelek/Documents/github/sw25/player/js/script.js
// Disclaimer: no semicolons, if unnecessary, are used in this project

import { fetchJSON } from '../../common/utils/utils.js'
import { SCREENWERK_PUBLISHER_API, CONFIG_POLLING_INTERVAL } from '../../common/config/constants.js' 
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

// Global variables to track configuration and player instance
let currentPlayer = null;
let currentPublishedAt = null;
let configPollingInterval = null;

// Initialize the player with configuration
const initializePlayer = (configuration) => {
    const player_element = document.getElementById('player')
    
    // Add debug information about what's being loaded
    console.log('Initializing player with configuration:', configuration)
    
    // Store the current publishedAt timestamp for comparison in polling
    currentPublishedAt = new Date(configuration.publishedAt).getTime();
    console.log(`Current configuration published at: ${configuration.publishedAt}`);
    
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
    
    // Cleanup existing player if it exists
    if (currentPlayer) {
        console.log('Cleaning up existing player before creating a new one');
        currentPlayer.cleanup();
    }
    
    // Create new player instance
    currentPlayer = new EntuScreenWerkPlayer(player_element, configuration)
    currentPlayer.resume() // Using resume() instead of play() as per the player implementation
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
    startConfigPolling(storedScreenId, CONFIG_POLLING_INTERVAL) // Start polling with defined interval
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

// Periodically check for new configuration updates
const startConfigPolling = (screenId, interval = CONFIG_POLLING_INTERVAL) => { // Use default from constants
    // Clear any existing interval
    if (configPollingInterval) {
        clearInterval(configPollingInterval);
    }
    
    console.log(`Starting configuration polling with interval of ${interval/1000} seconds (${interval/60000} minutes)`);
    
    configPollingInterval = setInterval(async () => {
        try {
            console.log('Checking for configuration updates...');
            
            // Fetch the latest configuration
            const configData = await fetchConfiguration(screenId);
            if (!configData) {
                console.error('Failed to fetch configuration during polling');
                return;
            }
            
            // Compare published timestamps
            const newPublishedAt = new Date(configData.configuration.publishedAt).getTime();
            
            if (newPublishedAt > currentPublishedAt) {
                console.log(`Configuration update detected!`);
                console.log(`Current: ${new Date(currentPublishedAt).toISOString()}`);
                console.log(`New: ${new Date(newPublishedAt).toISOString()}`);
                
                // Update UI with new configuration data
                initializeUI(screenId, configData.configuration);
                registerMediaForCaching(configData.configuration);
                
                // Re-initialize the player with new configuration
                initializePlayer(configData.configuration);
                
                // Show a visual notification of the update
                showUpdateNotification();
            } else {
                console.log('No configuration updates found');
            }
        } catch (error) {
            console.error('Error checking for configuration updates:', error);
        }
    }, interval);
    
    // Store the interval ID in localStorage to ensure it persists across page refreshes
    localStorage.setItem('configPollingIntervalId', configPollingInterval);
    
    return configPollingInterval;
};

// Show a temporary notification that the player was updated
const showUpdateNotification = () => {
    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.top = '10px';
    notification.style.right = '10px';
    notification.style.backgroundColor = 'rgba(0, 150, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.padding = '10px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.style.transition = 'opacity 0.5s';
    notification.textContent = 'Player updated with new configuration!';
    
    document.body.appendChild(notification);
    
    // Fade and remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
};
