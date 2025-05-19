// Environment detection (works in Node.js and browser)
function detectEnvironment() {
  // Node.js (Netlify, server, etc)
  if (typeof process !== 'undefined' && process.env && process.env.ENVIRONMENT) {
    console.log('ENV: Detected from process.env.ENVIRONMENT:', process.env.ENVIRONMENT)
    return process.env.ENVIRONMENT
  }
  // Browser: explicit global
  if (typeof window !== 'undefined' && window.ENVIRONMENT) {
    console.log('ENV: Detected from window.ENVIRONMENT:', window.ENVIRONMENT)
    return window.ENVIRONMENT
  }
  // Browser: localhost
  if (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )) {
    console.log('ENV: Detected from window.location.hostname:', window.location.hostname, '(local)')
    return 'local'
  }
  // Browser: try gitInfo branch
  if (typeof window !== 'undefined' && window.gitInfo && window.gitInfo.branch) {
    const branch = window.gitInfo.branch
    if (branch === 'main' || branch === 'master') {
      console.log('ENV: Detected from gitInfo.branch:', branch, '(live)')
      return 'live'
    }
    console.log('ENV: Detected from gitInfo.branch:', branch, '(dev)')
    return 'dev'
  }
  // Default
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
export const UI_VISIBILITY = {
  live: {
    showMediaControls: false,         // Show/hide media control buttons (play, pause, etc)
    showDebugPanel: false,            // Show/hide the main debug panel overlay
    showDevBanner: false,             // Show/hide the developer environment banner
    showProgress: false,              // Show/hide the media progress bar
    showScreenInfo: true,             // Show/hide the screen info panel (top right) and git info section
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
    showProgress: true,              // Show/hide the media progress bar
    showScreenInfo: true,            // Show/hide the screen info panel (top right) and git info section
    showConfigurationPanel: true,     // Show/hide the configuration/settings panel
    showMediaDebugInfo: false         // Show/hide .media-debug-info overlays on media elements
  }
}

// Configuration polling interval in milliseconds
// Default: 5 minutes (300000ms)
export const CONFIG_POLLING_INTERVAL = 300000
