export const HOSTNAME = "entu.app"
export const ACCOUNT = "piletilevi"
export const ENTU_ENTITY_URL = `https://${HOSTNAME}/api/${ACCOUNT}/entity`
export const ENTU_FRONTEND_URL = `https://${HOSTNAME}/${ACCOUNT}`
export const SCREENWERK_PUBLISHER_API = 'https://swpublisher.entu.eu/screen/'
export const PUBLISHER_FILES_API_BASE = 'https://swpublisher.entu.eu/media/'

/**
 * Generates the PUBLISHER_FILES_API URL by appending the media and file IDs.
 * @param {string} media_eid - The media entity ID.
 * @param {string} file_eid - The file entity ID.
 * @returns {string} - The generated URL.
 */
export function getPublisherFilesApiUrl(media_eid, file_eid) {
  return `${PUBLISHER_FILES_API_BASE}${media_eid}/${file_eid}`
}
// Usage example:
// const url = getPublisherFilesApiUrl('123', '456')

export const UNICODE_ICONS = {
    warning: '⚠️',
    info: 'ℹ️',
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️'
}

// Configuration polling interval in milliseconds
// Default: 5 minutes (300000ms)
export const CONFIG_POLLING_INTERVAL = 300000
