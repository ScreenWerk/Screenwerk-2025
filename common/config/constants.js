// Environment detection (works in Node.js and browser)
export const ENVIRONMENT =
  typeof process !== 'undefined' && process.env && process.env.ENVIRONMENT
    ? process.env.ENVIRONMENT
    : (typeof window !== 'undefined' && window.ENVIRONMENT)
      ? window.ENVIRONMENT
      : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? 'local'
        : 'dev'; // fallback

export const HOSTNAME = "entu.app"
export const ACCOUNT = "piletilevi"
export const ENTU_ENTITY_URL = `https://${HOSTNAME}/api/${ACCOUNT}/entity`
export const ENTU_FRONTEND_URL = `https://${HOSTNAME}/${ACCOUNT}`

// API endpoints: use Netlify proxy in dev/live, direct API in local
export const SCREENWERK_PUBLISHER_API =
  ENVIRONMENT === 'local'
    ? 'https://swpublisher.entu.eu/screen/'
    : '/api/swpublisher/screen/'

export const PUBLISHER_FILES_API_BASE =
  ENVIRONMENT === 'local'
    ? 'https://swpublisher.entu.eu/media/'
    : '/api/swpublisher/media/'

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

// UI visibility matrix: control which UI elements are shown/hidden in each environment
export const UI_VISIBILITY = {
  live: {
    showMediaControls: false,         // Show/hide media control buttons (play, pause, etc)
    showDebugPanel: false,            // Show/hide the main debug panel overlay
    showDevBanner: false,             // Show/hide the developer environment banner
    showProgress: false,              // Show/hide the media progress bar
    showScreenInfo: true,             // Show/hide the screen info panel (top right)
    showConfigurationPanel: false,    // Show/hide the configuration/settings panel
    showMediaDebugInfo: false         // Show/hide .media-debug-info overlays on media elements
  },
  dev: {
    showMediaControls: true,          // Show/hide media control buttons (play, pause, etc)
    showDebugPanel: true,             // Show/hide the main debug panel overlay
    showDevBanner: true,              // Show/hide the developer environment banner
    showProgress: true,               // Show/hide the media progress bar
    showScreenInfo: true,             // Show/hide the screen info panel (top right)
    showConfigurationPanel: true,     // Show/hide the configuration/settings panel
    showMediaDebugInfo: true          // Show/hide .media-debug-info overlays on media elements
  },
  local: {
    showMediaControls: false,         // Show/hide media control buttons (play, pause, etc)
    showDebugPanel: false,            // Show/hide the main debug panel overlay
    showDevBanner: false,             // Show/hide the developer environment banner
    showProgress: false,              // Show/hide the media progress bar
    showScreenInfo: false,            // Show/hide the screen info panel (top right)
    showConfigurationPanel: true,     // Show/hide the configuration/settings panel
    showMediaDebugInfo: false         // Show/hide .media-debug-info overlays on media elements
  }
}

// Configuration polling interval in milliseconds
// Default: 5 minutes (300000ms)
export const CONFIG_POLLING_INTERVAL = 300000
