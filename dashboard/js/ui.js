import { ENTU_FRONTEND_URL } from '../../shared/config/constants.js'
import { UNICODE_ICONS } from '../config/ui-constants.js'

/**
 * Creates toolbar UI snippet
 * @param {string} id - Entity ID
 * @param {string} publishedAt - Published timestamp
 * @param {string} screenId - Screen ID for links
 * @param {Array} validation_errors - Array of validation errors
 * @param {Array} configurations - Configuration objects
 * @returns {string} HTML for the toolbar
 */

/**
 * Creates published timestamp element
 * @param {string} publishedAt - Published timestamp
 * @returns {HTMLElement} Timestamp element
 */
function createTimestamp(publishedAt) {
    const timestamp = document.createElement('span')
    timestamp.className = 'published-timestamp'
    timestamp.title = publishedAt
    timestamp.textContent = publishedAt ? new Date(publishedAt).toLocaleString() : ''
    return timestamp
}

/**
 * Creates screen link element if screen ID is provided
 * @param {string} screenId - Screen ID
 * @returns {HTMLElement|null} Screen link element or null
 */
function createScreenLink(screenId) {
    if (!screenId) return null
    
    const screenLink = document.createElement('a')
    screenLink.href = `/?screen_id=${screenId}`
    screenLink.target = '_blank'
    const screenIcon = document.createElement('img')
    screenIcon.src = '/images/monitor.png'
    screenIcon.className = 'screen-link-icon'
    screenIcon.alt = 'Screen Link'
    screenLink.appendChild(screenIcon)
    return screenLink
}

/**
 * Creates Entu link element
 * @param {string} id - Entity ID
 * @returns {HTMLElement} Entu link element
 */
function createEntuLink(id) {
    const entuLink = document.createElement('a')
    entuLink.href = `${ENTU_FRONTEND_URL}/${id}`
    entuLink.target = '_blank'
    const entuLogo = document.createElement('img')
    entuLogo.src = '/public/images/entulogo.png'
    entuLogo.className = 'entu-logo'
    entuLogo.alt = 'Entu'
    entuLink.appendChild(entuLogo)
    return entuLink
}

/**
 * Creates error icon if validation errors exist
 * @param {string} id - Entity ID
 * @param {Array} validation_errors - Validation errors
 * @param {Array} configurations - Configuration objects
 * @returns {HTMLElement|null} Error icon element or null
 */
function createErrorIcon(id, validation_errors, configurations) {
    if (!validation_errors || validation_errors.length === 0) return null
    
    const errorIcon = document.createElement('span')
    errorIcon.className = 'error-icon'
    errorIcon.title = 'Validation Errors'
    errorIcon.innerHTML = UNICODE_ICONS.warning
    errorIcon.onclick = (event) => {
        event.stopPropagation()
        showErrors(id, configurations)
    }
    return errorIcon
}

/**
 * Creates info icon
 * @param {string} id - Entity ID
 * @param {Array} configurations - Configuration objects
 * @returns {HTMLElement} Info icon element
 */
function createInfoIcon(id, configurations) {
    const infoIcon = document.createElement('span')
    infoIcon.className = 'info-icon'
    infoIcon.title = 'Configuration Info'
    infoIcon.innerHTML = UNICODE_ICONS.info
    infoIcon.onclick = (event) => {
        event.stopPropagation()
        showConfigInfo(id, configurations)
    }
    return infoIcon
}

export const toolbarSnippet = (id, publishedAt = '', screenId = '', validation_errors = [], configurations = []) => {
    const toolbar = document.createElement('div')
    toolbar.className = 'toolbar'
    
    // Add all toolbar elements
    toolbar.appendChild(createTimestamp(publishedAt))
    
    const screenLink = createScreenLink(screenId)
    if (screenLink) toolbar.appendChild(screenLink)
    
    toolbar.appendChild(createEntuLink(id))
    
    const errorIcon = createErrorIcon(id, validation_errors, configurations)
    if (errorIcon) toolbar.appendChild(errorIcon)
    
    toolbar.appendChild(createInfoIcon(id, configurations))
    
    return toolbar.outerHTML
}

/**
 * Parses configurations from string to object if needed
 * @param {string|Array} configurations - Configuration data
 * @returns {Array|null} Parsed configurations or null on error
 */
function parseConfigurations(configurations) {
    if (typeof configurations === 'string') {
        try {
            return JSON.parse(configurations)
        } catch (e) {
            console.error('Failed to parse configurations JSON:', e)
            return null
        }
    }
    return configurations
}

/**
 * Creates popup element with content
 * @param {string} type - 'errors' or 'info'
 * @param {string} content - HTML content for popup
 * @returns {HTMLElement} The popup element
 */
function createPopupElement(type, content) {
    const popupElement = document.createElement('div')
    popupElement.className = `${type}-popup`
    popupElement.innerHTML = `
        <div class="${type}-popup-content">
            <span class="close">&times;</span>
            <h2>${type === 'errors' ? 'Validation Errors' : 'Configuration Info'}</h2>
            ${content}
        </div>
    `
    return popupElement
}

/**
 * Sets up popup event handlers
 * @param {HTMLElement} popupElement - The popup element
 * @param {string} type - Popup type for CSS class targeting
 */
function setupPopupHandlers(popupElement, type) {
    const closePopup = () => {
        popupElement.remove()
        document.removeEventListener('keydown', handleEscKey)
        document.removeEventListener('click', handleClickOutside)
    }
    
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closePopup()
        }
    }
    
    const handleClickOutside = (e) => {
        if (e.target.classList.contains(`${type}-popup`)) {
            closePopup()
        }
    }
    
    document.querySelector(`.${type}-popup .close`).addEventListener('click', closePopup)
    document.addEventListener('keydown', handleEscKey)
    document.addEventListener('click', handleClickOutside)
}

/**
 * Shows a popup with error or info content
 * @param {string} id - Entity ID to show information for
 * @param {string|Array} configurations - Configuration objects
 * @param {string} type - 'errors' or 'info'
 */
function showPopup(id, configurations, type = 'errors') {
    if (!configurations) {
        console.error('Configurations parameter is undefined')
        return
    }
    
    // Parse configurations if needed
    const parsedConfigurations = parseConfigurations(configurations)
    if (!parsedConfigurations) return
    
    // Find the specific configuration
    const configuration = parsedConfigurations.find(config => config._id === id)
    if (!configuration) return
    
    // Create appropriate content based on type
    const popupContent = type === 'errors' 
        ? createErrorContent(configuration) 
        : createInfoContent(configuration)
    
    if (!popupContent && type === 'errors') return
    
    // Create and display popup
    const popupElement = createPopupElement(type, popupContent)
    document.body.appendChild(popupElement)
    
    // Set up event handlers
    setupPopupHandlers(popupElement, type)
}

/**
 * Creates error content HTML
 */
function createErrorContent(configuration) {
    if (!configuration.validation_errors) return ''
    
    const errorMessages = configuration.validation_errors.map(error => `
        <li>${error.error}: ${JSON.stringify(error.object)}</li>
    `).join('')
    
    return `<ul>${errorMessages}</ul>`
}

/**
 * Creates info content HTML
 */
function createInfoContent(configuration) {
    return `<pre>${JSON.stringify(configuration, null, 2)}</pre>`
}

/**
 * Shows error information for a configuration
 */
export function showErrors(id, configurations) {
    showPopup(id, configurations, 'errors')
}

/**
 * Shows detailed information for a configuration
 */
export function showConfigInfo(id, configurations) {
    showPopup(id, configurations, 'info')
}

// Make functions available to the window for onclick handlers
window.showErrors = showErrors
window.showConfigInfo = showConfigInfo
