import { fetchJSON } from '../../common/utils/utils.js'
import { toDateTimeString } from '../../common/utils/common.js'
import { UNICODE_ICONS, ENTU_FRONTEND_URL } from '../../common/config/constants.js'

/**
 * Creates a toolbar with controls for configuration items
 * @param {string} id - The entity ID
 * @param {string} publishedAt - Publication timestamp
 * @param {string} screenId - Screen ID if available
 * @param {Array} validation_errors - Validation errors if any
 * @param {Array} configurations - Configuration objects
 * @returns {string} HTML for the toolbar
 */
export const toolbarSnippet = (id, publishedAt = '', screenId = '', validation_errors = [], configurations = []) => {
    const toolbar = document.createElement('div')
    toolbar.className = 'toolbar'
    
    // Published timestamp
    const timestamp = document.createElement('span')
    timestamp.className = 'published-timestamp'
    timestamp.title = publishedAt
    timestamp.textContent = publishedAt ? new Date(publishedAt).toLocaleString() : ''
    toolbar.appendChild(timestamp)
    
    // Screen link if available
    if (screenId) {
        const screenLink = document.createElement('a')
        screenLink.href = `/?screen_id=${screenId}`
        screenLink.target = '_blank'
        const screenIcon = document.createElement('img')
        screenIcon.src = '/images/monitor.png'
        screenIcon.className = 'screen-link-icon'
        screenIcon.alt = 'Screen Link'
        screenLink.appendChild(screenIcon)
        toolbar.appendChild(screenLink)
    }
    
    // Entu link
    const entuLink = document.createElement('a')
    entuLink.href = `${ENTU_FRONTEND_URL}/${id}`
    entuLink.target = '_blank'
    const entuLogo = document.createElement('img')
    entuLogo.src = '/public/images/entulogo.png'
    entuLogo.className = 'entu-logo'
    entuLogo.alt = 'Entu'
    entuLink.appendChild(entuLogo)
    toolbar.appendChild(entuLink)
    
    // Error icon if there are validation errors
    if (validation_errors && validation_errors.length > 0) {
        const errorIcon = document.createElement('span')
        errorIcon.className = 'error-icon'
        errorIcon.title = 'Validation Errors'
        errorIcon.innerHTML = UNICODE_ICONS.warning
        errorIcon.onclick = (event) => {
            event.stopPropagation()
            showErrors(id, configurations)
        }
        toolbar.appendChild(errorIcon)
    }
    
    // Info icon
    const infoIcon = document.createElement('span')
    infoIcon.className = 'info-icon'
    infoIcon.title = 'Configuration Info'
    infoIcon.innerHTML = UNICODE_ICONS.info
    infoIcon.onclick = (event) => {
        event.stopPropagation()
        showConfigInfo(id, configurations)
    }
    toolbar.appendChild(infoIcon)
    
    return toolbar.outerHTML
}

/**
 * Shows a popup with error or info content
 * @param {string} id - Entity ID to show information for
 * @param {string|Array} configurations - Configuration objects
 * @param {string} type - 'errors' or 'info'
 */
function showPopup(id, configurations, type = 'errors') {
    if (!configurations) {
        console.error("Configurations parameter is undefined")
        return
    }
    
    // Parse configurations if it's a string
    if (typeof configurations === 'string') {
        try {
            configurations = JSON.parse(configurations)
        } catch (e) {
            console.error("Failed to parse configurations JSON:", e)
            return
        }
    }
    
    // Find the specific configuration
    const configuration = configurations.find(config => config._id === id)
    if (!configuration) return
    
    // Create appropriate content based on type
    const popupContent = type === 'errors' 
        ? createErrorContent(configuration) 
        : createInfoContent(configuration)
    
    if (!popupContent && type === 'errors') return
    
    // Create and append popup
    const popupElement = document.createElement('div')
    popupElement.className = `${type}-popup`
    popupElement.innerHTML = `
        <div class="${type}-popup-content">
            <span class="close">&times;</span>
            <h2>${type === 'errors' ? 'Validation Errors' : 'Configuration Info'}</h2>
            ${popupContent}
        </div>
    `
    document.body.appendChild(popupElement)
    
    // Set up close handlers
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
