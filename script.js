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

const requestFullscreen = () => {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
        elem.requestFullscreen()
    } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen()
    } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen()
    }
    closeDevTools()
}

const closeDevTools = () => {
    if (window.devtools) {
        window.devtools.close()
    }
}

window.onload = async () => {
    // Show fullscreen button and add click event listener
    const fullscreenButton = document.getElementById('fullscreenButton')
    // fullscreenButton.style.display = 'block'
    fullscreenButton.addEventListener('click', () => {
        requestFullscreen()
        fullscreenButton.style.display = 'none'
    })

    // check if there is a screen selected in URL query
    if (window.location.search) {
        const urlParams = new URLSearchParams(window.location.search)
        const screen_id = urlParams.get('screen_id')
        if (!screen_id) {
            reportProblem('No screen_id in URL query', true)
            return
        }

        const eid_re = /^[0-9a-f]{24}$/
        if (!eid_re.test(screen_id)) {
            reportProblem('Invalid screen_id in URL query', true)
            return
        }

        // fetch screen configuration from swpublisher API
        const u = `${SCREENWERK_PUBLISHER_API}${screen_id}.json`
        const sw_configuration = await fetchJSON(u)
        const configuration_id = sw_configuration.configurationEid
        unset = ['screenEid', 'configurationEid', 'screenGroupEid']
        unset.forEach((key) => delete sw_configuration[key])

        // save selected screen to local storage
        localStorage.setItem(
            'selected_screen',
            JSON.stringify({
                screen_id: screen_id,
                configuration_id: configuration_id,
            })
        )
        localStorage.setItem(
            `swConfiguration_${configuration_id}`, JSON.stringify(sw_configuration)
        )
    }
    const screen_json = localStorage.getItem('selected_screen')
    // if there is no screen selected, redirect to screen selection page
    if (!screen_json) {
        window.location.href = 'screen-select.html'
    }
    const {screen_id, configuration_id} = JSON.parse(screen_json)
    const configuration_json = localStorage.getItem(`swConfiguration_${configuration_id}`)
    const configuration = JSON.parse(configuration_json)
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
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope)
            if (registration.active) {
                registration.active.postMessage({
                    type: 'CACHE_URLS',
                    urls: mediaToCache
                })
            }
        })
        .catch(error => {
            console.log('Service Worker registration failed:', error)
        })
    }

    // Render the player
    const player_element = document.getElementById('player')
    const player = new EntuScreenWerkPlayer(player_element, configuration)
    player.play()
}

async function updateServiceWorker() {
    const registration = await navigator.serviceWorker.register('service-worker.js')
    
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
