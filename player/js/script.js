// Disclaimer: no semicolons, if unnecessary, are used in this project

import { fetchJSON } from '../../common/utils/utils.js'
import { SCREENWERK_PUBLISHER_API } from '../../common/config/constants.js' 
import { EntuScreenWerkPlayer } from './sw-player.js'
import { toDateTimeString } from '../../common/utils/common.js'
import { debugLog } from '../../common/utils/debug-utils.js' // Updated path

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

window.onload = async () => {
    let screen_id = null
    let configuration_id = null
    let configuration = null

    // 1. Check if there is a screen selected in URL query
    if (window.location.search) {
        const urlParams = new URLSearchParams(window.location.search)
        screen_id = urlParams.get('screen_id')
        if (!screen_id) {
            reportProblem('No screen_id in URL query', true)
            return
        }

        // Sanity check the screen ID format
        const eid_re = /^[0-9a-f]{24}$/
        if (!eid_re.test(screen_id)) {
            reportProblem('Invalid screen_id in URL query', true)
            return
        }

        // Save screen ID to localStorage
        localStorage.setItem(
            'selected_screen',
            JSON.stringify({
                screen_id: screen_id,
                configuration_id: null, // Will be filled after reload
            })
        )
        
        // Reload with clean URL
        const cleanUrl = new URL(window.location.href)
        cleanUrl.search = '' // Remove all query parameters
        window.location.href = cleanUrl.toString() // This will reload the page
        return // Stop execution as page will reload
    }
    
    // At this point, we're either after a redirect or a direct visit without URL parameters
    // 2. Check if screen ID is stored in browser
    const screen_json = localStorage.getItem('selected_screen')
    if (!screen_json) {
        // 3. If still negative, report an error
        reportProblem('No screen ID provided in URL and none found in storage. Please select a screen.', true)
        return
    }

    try {
        const stored_screen = JSON.parse(screen_json)
        screen_id = stored_screen.screen_id
        configuration_id = stored_screen.configuration_id
        
        if (!screen_id) {
            reportProblem('Invalid screen data in storage. Please select a screen again.', true)
            return
        }

        // If the configuration_id is null, it means this is the first load after redirect
        // We need to fetch the configuration from the API
        if (!configuration_id) {
            // fetch screen configuration from swpublisher API
            const u = `${SCREENWERK_PUBLISHER_API}${screen_id}.json`
            try {
                const sw_configuration = await fetchJSON(u)
                configuration_id = sw_configuration.configurationEid
                const unset = ['screenEid', 'configurationEid', 'screenGroupEid']
                unset.forEach((key) => delete sw_configuration[key])
                configuration = sw_configuration

                // Update stored screen with configuration_id
                localStorage.setItem(
                    'selected_screen',
                    JSON.stringify({
                        screen_id: screen_id,
                        configuration_id: configuration_id,
                    })
                )
                localStorage.setItem(
                    `swConfiguration_${configuration_id}`, JSON.stringify(configuration)
                )
            } catch (error) {
                reportProblem(`Failed to fetch configuration for screen ID: ${screen_id}`, true)
                console.error(error)
                return
            }
        } else {
            // We already have configuration_id, so just get configuration from localStorage
            const configuration_json = localStorage.getItem(`swConfiguration_${configuration_id}`)
            if (!configuration_json) {
                reportProblem('Configuration data missing. Please select a screen again.', true)
                return
            }
            
            configuration = JSON.parse(configuration_json)
        }
    } catch (error) {
        reportProblem('Failed to parse stored screen data. Please select a screen again.', true)
        console.error(error)
        return
    }

    // At this point, we should have valid screen_id, configuration_id, and configuration
    if (!screen_id || !configuration_id || !configuration) {
        reportProblem('Unable to initialize player. Missing screen data.', true)
        return
    }

    const screen_id_element = document.getElementById('screenId')
    screen_id_element.textContent = screen_id
    screen_id_element.setAttribute(
        'href',
        `https://entu.app/piletilevi/${screen_id}`
    )

    document.getElementById('published').textContent = toDateTimeString(
        configuration.publishedAt
    )
    document.getElementById('configuration').textContent = JSON.stringify(
        configuration,
        null,
        2
    )

    // register all media urls from configuration in service worker cache
    // medias are deeply nested under
    // configuration.schedules[].layoutPlaylists[].playlistMedias[].file
    const mediaToCache = configuration.schedules
        .flatMap((schedule) => schedule.layoutPlaylists)
        .flatMap((layoutPlaylist) => layoutPlaylist.playlistMedias)
        .map((playlistMedia) => playlistMedia.fileDO)

    // console.log('Media to cache:', mediaToCache)

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

    // Render the player
    const player_element = document.getElementById('player')
    const player = new EntuScreenWerkPlayer(player_element, configuration)
    player.resume() // Using resume() instead of play() as per the player implementation
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
