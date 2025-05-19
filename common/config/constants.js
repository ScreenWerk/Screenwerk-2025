// Environment detection (works in Node.js and browser)
function detectEnvironment() {
  // DigitalOcean live deployment (screenwerk.entu.ee)
  if (typeof window !== 'undefined' && window.location && window.location.hostname === 'screenwerk.entu.ee') {
    console.log('ENV: Detected DigitalOcean live deployment at screenwerk.entu.ee (live)')
    return 'live'
  }
  // Localhost or 127.0.0.1
  if (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )) {
    console.log('ENV: Detected local deployment:', window.location.hostname, '(local)')
    return 'local'
  }
  // Everything else is dev
  console.log('ENV: Defaulting to dev environment')
  return 'dev'
}

export const ENVIRONMENT = detectEnvironment()

export const HOSTNAME = "entu.app"
export const ACCOUNT = "piletilevi"
export const ENTU_ENTITY_URL = `https://${HOSTNAME}/api/${ACCOUNT}/entity`
export const ENTU_FRONTEND_URL = `https://${HOSTNAME}/${ACCOUNT}`

// API endpoints: use Netlify proxy only in dev, direct API in live/local
export const SCREENWERK_PUBLISHER_API =
  ENVIRONMENT === 'dev'
    ? '/api/swpublisher/screen/'
    : 'https://swpublisher.entu.eu/screen/'

export const PUBLISHER_FILES_API_BASE =
  ENVIRONMENT === 'dev'
    ? '/api/swpublisher/media/'
    : 'https://swpublisher.entu.eu/media/'

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
// Loads from browser storage if available, otherwise uses defaults and saves them
const DEFAULT_UI_VISIBILITY = {
  live: {
    showMediaControls: false,         // Show/hide media control buttons (play, pause, etc)
    showDebugPanel: false,            // Show/hide the main debug panel overlay
    showDevBanner: false,             // Show/hide the developer environment banner
    showProgress: false,              // Show/hide the media progress bar
    showScreenInfo: false,            // Show/hide the screen info panel (top right) and git info section
    showConfigurationPanel: false,    // Show/hide the configuration/settings panel
    showMediaDebugInfo: false         // Show/hide .media-debug-info overlays on media elements
  },
  dev: {
    showMediaControls: true,          // Show/hide media control buttons (play, pause, etc)
    showDebugPanel: true,             // Show/hide the main debug panel overlay
    showDevBanner: true,              // Show/hide the developer environment banner
    showProgress: true,               // Show/hide the media progress bar
    showScreenInfo: true,             // Show/hide the screen info panel (top right) and git info section
    showConfigurationPanel: true,     // Show/hide the configuration/settings panel
    showMediaDebugInfo: true          // Show/hide .media-debug-info overlays on media elements
  },
  local: {
    showMediaControls: false,         // Show/hide media control buttons (play, pause, etc)
    showDebugPanel: false,            // Show/hide the main debug panel overlay
    showDevBanner: false,             // Show/hide the developer environment banner
    showProgress: true,               // Show/hide the media progress bar
    showScreenInfo: true,             // Show/hide the screen info panel (top right) and git info section
    showConfigurationPanel: true,     // Show/hide the configuration/settings panel
    showMediaDebugInfo: false         // Show/hide .media-debug-info overlays on media elements
  }
}

function getUIVisibility() {
  // Only use localStorage in browser
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('UI_VISIBILITY')
      if (stored) {
        return JSON.parse(stored)
      } else {
        // Save only relevant part to storage (current env)
        const relevant = DEFAULT_UI_VISIBILITY[ENVIRONMENT]
        window.localStorage.setItem('UI_VISIBILITY', JSON.stringify(relevant))
        return relevant
      }
    } catch (e) {
      console.warn('UI_VISIBILITY: Failed to read/write localStorage, using defaults', e)
      return DEFAULT_UI_VISIBILITY[ENVIRONMENT]
    }
  }
  // Not in browser, return only relevant part
  return DEFAULT_UI_VISIBILITY[ENVIRONMENT]
}

export const UI_VISIBILITY = getUIVisibility()

// Configuration polling interval in milliseconds
// Default: 1 minute (60000ms)
export const CONFIG_POLLING_INTERVAL = 60000
