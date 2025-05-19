// filepath: /home/michelek/Documents/github/sw25/player/js/script.js
// Disclaimer: no semicolons, if unnecessary, are used in this project

import { fetchJSON } from '../../common/utils/utils.js'
import { SCREENWERK_PUBLISHER_API, CONFIG_POLLING_INTERVAL, ENVIRONMENT, UI_VISIBILITY, DEFAULT_UI_VISIBILITY } from '../../common/config/constants.js' 
import { EntuScreenWerkPlayer } from './sw-player.js'
import { toDateTimeString } from '../../common/utils/common.js'
import { debugLog } from '../../common/utils/debug-utils.js' // Updated path
import { setupUIVisibilityModal } from '/common/ui-visibility-modal.js' // Ensure modal logic is initialized in player

// Enable debug mode globally for development/troubleshooting
window.debugMode = true

window.UI_VISIBILITY = UI_VISIBILITY
window.ENVIRONMENT = ENVIRONMENT
window.DEFAULT_UI_VISIBILITY = DEFAULT_UI_VISIBILITY

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

const promptForScreenId = () => {
    // Remove any previous prompt
    let oldPrompt = document.getElementById('screen-id-prompt')
    if (oldPrompt) oldPrompt.remove()

    // Remove player element if it exists
    let playerElement = document.getElementById('player')
    if (playerElement) playerElement.remove()

    // Create a new prompt for screen ID
    const promptDiv = document.createElement('div')
    promptDiv.id = 'screen-id-prompt'
    promptDiv.style.margin = '2em auto'
    promptDiv.style.maxWidth = '400px'
    promptDiv.style.padding = '1em'
    promptDiv.style.background = '#fff'
    promptDiv.style.border = '1px solid #ccc'
    promptDiv.style.borderRadius = '8px'
    promptDiv.style.textAlign = 'center'

    const label = document.createElement('label')
    label.textContent = 'Enter Screen ID:'
    label.htmlFor = 'manual-screen-id'
    label.style.display = 'block'
    label.style.marginBottom = '0.5em'

    const input = document.createElement('input')
    input.type = 'text'
    input.id = 'manual-screen-id'
    input.placeholder = '24-character screen ID'
    input.style.width = '90%'
    input.style.padding = '0.5em'
    input.style.marginBottom = '0.5em'
    input.style.border = '1px solid #aaa'
    input.style.borderRadius = '4px'

    const button = document.createElement('button')
    button.textContent = 'Submit'
    button.style.padding = '0.5em 1.5em'
    button.style.marginLeft = '0.5em'
    button.style.border = 'none'
    button.style.background = '#007bff'
    button.style.color = '#fff'
    button.style.borderRadius = '4px'
    button.style.cursor = 'pointer'

    const errorMsg = document.createElement('div')
    errorMsg.style.color = 'red'
    errorMsg.style.marginTop = '0.5em'
    errorMsg.style.fontSize = '0.95em'

    button.onclick = async () => {
        const val = input.value.trim()
        const eid_re = /^[0-9a-f]{24}$/
        if (!val) {
            errorMsg.textContent = 'Screen ID cannot be empty.'
            return
        }
        if (val.length !== 24) {
            errorMsg.textContent = 'Screen ID must be exactly 24 characters.'
            return
        }
        if (!/^[0-9a-f]+$/.test(val)) {
            errorMsg.textContent = 'Screen ID must contain only lowercase hex digits (0-9, a-f).'
            return
        }
        if (!eid_re.test(val)) {
            errorMsg.textContent = 'Please enter a valid 24-character screen ID.'
            return
        }
        // Check if published
        errorMsg.textContent = 'Checking if screen is published...'
        button.disabled = true
        input.disabled = true
        try {
            const u = `${SCREENWERK_PUBLISHER_API}${val}.json`
            const resp = await fetch(u)
            if (!resp.ok) {
                throw new Error('Not published or not found')
            }
            // Save and reload
            localStorage.setItem('selected_screen', JSON.stringify({ screen_id: val }))
            window.location.reload()
        } catch (err) {
            errorMsg.textContent = 'Screen ID is not published or not found. Please check and try again.'
            button.disabled = false
            input.disabled = false
        }
    }

    promptDiv.appendChild(label)
    promptDiv.appendChild(input)
    promptDiv.appendChild(button)
    promptDiv.appendChild(errorMsg)
    document.body.appendChild(promptDiv)
    input.focus()
}

// Get screen ID from localStorage
const getScreenIdFromStorage = () => {
    const screen_json = localStorage.getItem('selected_screen')
    if (!screen_json) {
        promptForScreenId()
        return null
    }

    try {
        const stored_screen = JSON.parse(screen_json)
        const screen_id = stored_screen.screen_id
        
        if (!screen_id) {
            promptForScreenId()
            return null
        }
        
        return screen_id
    } catch (error) {
        promptForScreenId()
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
let currentPlayer = null
let currentPublishedAt = null
let configPollingInterval = null

// Initialize the player with configuration
const initializePlayer = (configuration) => {
    const player_element = document.getElementById('player')
    
    // Add debug information about what's being loaded
    // console.log('Initializing player with configuration:', configuration)
    
    // Store the current publishedAt timestamp for comparison in polling
    currentPublishedAt = new Date(configuration.publishedAt).getTime()
    // console.log(`Current configuration published at: ${configuration.publishedAt}`)
    
    // Check if configuration contains media files
    if (configuration.schedules) {
        // console.log(`Found ${configuration.schedules.length} schedules`)
        
        // Log details about playlists and media
        const mediaItems = configuration.schedules
            .flatMap((schedule) => schedule.layoutPlaylists)
            .flatMap((layoutPlaylist) => layoutPlaylist.playlistMedias)
            
        // console.log(`Total media items found: ${mediaItems.length}`)
        
        // Log the first few media items to check their structure
        if (mediaItems.length > 0) {
            // console.log('Sample media item:', mediaItems[0])
        }
    }
    
    // Cleanup existing player if it exists
    if (currentPlayer) {
        console.log('Cleaning up existing player before creating a new one')
        currentPlayer.cleanup()
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
    setupUIVisibilityModal({ reloadOnChange: true }) // Ensure modal logic is initialized in player
}

async function updateServiceWorker() {
    const registration = await navigator.serviceWorker.register('/service-worker.js')
    
    if (registration.waiting) {
        // If there's a waiting worker, activate it immediately
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    
    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && registration.active) {
                // If there's a new worker waiting, activate it
                newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
            if (newWorker.state === 'activated') {
                console.log('New service worker activated')
                window.location.reload()
            }
        })
    })
}

window.addEventListener('load', updateServiceWorker)

// Periodically check for new configuration updates
const startConfigPolling = (screenId, interval = CONFIG_POLLING_INTERVAL) => { // Use default from constants
    // Clear any existing interval
    if (configPollingInterval) {
        clearInterval(configPollingInterval)
    }
    
    console.log(`Starting configuration polling with interval of ${interval/1000} seconds (${interval/60000} minutes)`)

    let countdownTimer = null

    // Add countdown debug for last 5 seconds before polling
    function scheduleCountdown() {
        if (countdownTimer) clearTimeout(countdownTimer)
        let secondsLeft = 5
        function tick() {
            if (secondsLeft > 0) {
                console.debug(`[Polling] Next config update in ${secondsLeft}...`)
                secondsLeft--
                countdownTimer = setTimeout(tick, 1000)
            }
        }
        // Start countdown 5 seconds before next poll
        setTimeout(tick, interval - 5000)
    }
    configPollingInterval = setInterval(async () => {
        try {
            console.log('Checking for configuration updates...')
            
            // Fetch the latest configuration
            const configData = await fetchConfiguration(screenId)
            if (!configData) {
                console.error('Failed to fetch configuration during polling')
                return
            }
            
            // Compare published timestamps
            const newPublishedAt = new Date(configData.configuration.publishedAt).getTime()
            
            if (newPublishedAt > currentPublishedAt) {
                console.log(`Configuration update detected!`)
                console.log(`Current: ${new Date(currentPublishedAt).toISOString()}`)
                console.log(`New: ${new Date(newPublishedAt).toISOString()}`)
                
                // Update UI with new configuration data
                initializeUI(screenId, configData.configuration)
                registerMediaForCaching(configData.configuration)
                
                // Re-initialize the player with new configuration
                initializePlayer(configData.configuration)
                
                // Show a visual notification of the update
                showUpdateNotification()
            } else {
                console.log('No configuration updates found')
            }
        } catch (error) {
            console.error('Error checking for configuration updates:', error)
        }
        scheduleCountdown()
    }, interval)
    scheduleCountdown()
    return configPollingInterval
}

// Show a temporary notification that the player was updated
const showUpdateNotification = () => {
    const notification = document.createElement('div')
    notification.style.position = 'absolute'
    notification.style.top = '10px'
    notification.style.right = '10px'
    notification.style.backgroundColor = 'rgba(0, 150, 0, 0.8)'
    notification.style.color = 'white'
    notification.style.padding = '10px'
    notification.style.borderRadius = '5px'
    notification.style.zIndex = '9999'
    notification.style.transition = 'opacity 0.5s'
    notification.textContent = 'Player updated with new configuration!'
    document.body.appendChild(notification)
    // Fade and remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0'
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification)
            }
        }, 500)
    }, 3000)
}

// Hide media controls and debug panel in live environment
document.addEventListener('DOMContentLoaded', () => {
    const ui = UI_VISIBILITY

    // Debug panels should be controlled on creation

    // Dev banner
    const devBanner = document.querySelector('.dev-banner')
    if (devBanner) devBanner.style.display = ui.showDevBanner ? '' : 'none'

    // Progress bar (precise: all .media-progress-container)
    document.querySelectorAll('.media-progress-container, .progress-bar, #progress-bar-placeholder').forEach(el => {
        if (ui.showProgress) {
            el.classList.remove('hidden-by-env')
        } else {
            el.classList.add('hidden-by-env')
        }
    })

    // Screen info
    const screenInfo = document.getElementById('screen-info')
    if (screenInfo) screenInfo.style.display = ui.showScreenInfo ? '' : 'none'

    // Configuration panel
    const configPanel = document.getElementById('configuration')
    if (configPanel) configPanel.style.display = ui.showConfigurationPanel ? '' : 'none'
})
