// Shared constants used by both dashboard and player.
// Keep minimal; ask before expanding.

// Environment detection (browser only logic guarded)
function detectEnvironment() {
    if (typeof window !== 'undefined' && window.location) {
        const host = window.location.hostname
        if (host === 'screenwerk.entu.ee') return 'live'
        if (host === 'localhost' || host === '127.0.0.1') return 'local'
    }
    return 'dev'
}

export const ENVIRONMENT = detectEnvironment()

export const HOSTNAME = 'entu.app'
export const ACCOUNT = 'piletilevi'
export const ENTU_ENTITY_URL = `https://${HOSTNAME}/api/${ACCOUNT}/entity`
export const ENTU_FRONTEND_URL = `https://${HOSTNAME}/${ACCOUNT}`

export const SCREENWERK_PUBLISHER_API =
    ENVIRONMENT === 'dev'
        ? '/api/swpublisher/screen/'
        : 'https://swpublisher.entu.eu/screen/'

export const PUBLISHER_FILES_API_BASE =
    ENVIRONMENT === 'dev'
        ? '/api/swpublisher/media/'
        : 'https://swpublisher.entu.eu/media/'

export function getPublisherFilesApiUrl(media_eid, file_eid) {
    return `${PUBLISHER_FILES_API_BASE}${media_eid}/${file_eid}`
}
