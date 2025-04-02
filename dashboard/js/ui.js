import { fetchJSON } from '../../common/utils/utils.js'
import { toDateTimeString } from '../../common/utils/common.js'
import { UNICODE_ICONS, ENTU_FRONTEND_URL } from '../../common/config/constants.js'

export const toolbarSnippet = (id, publishedAt = '', screenId = '', validation_errors = [], configurations = []) => {
    const configurationsJSON = configurations ? JSON.stringify(configurations).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"') : '[]'
    const errorIcon = validation_errors && validation_errors.length > 0 ? `
        <span class="error-icon" 
              title="Validation Errors" 
              onclick='event.stopPropagation(); showErrors("${id}", "${configurationsJSON}")'>
            ${UNICODE_ICONS.warning}
        </span>
    ` : ''
    
    const infoIcon = `
        <span class="info-icon" 
              title="Configuration Info" 
              onclick='event.stopPropagation(); showConfigInfo("${id}", "${configurationsJSON}")'>
            ${UNICODE_ICONS.info}
        </span>
    `

    return `
        <div class="toolbar">
            <span class="published-timestamp" 
                  title="${publishedAt}">
                ${publishedAt ? new Date(publishedAt).toLocaleString() : ''}
            </span>
            ${screenId ? `
                <a href="/?screen_id=${screenId}" target="_blank">
                    <img src="/images/monitor.png" class="screen-link-icon" alt="Screen Link">
                </a>
            ` : ''}
            <a href="${ENTU_FRONTEND_URL}/${id}" target="_blank">
                <img src="/public/images/entulogo.png" class="entu-logo" alt="Entu">
            </a>
            ${errorIcon}
            ${infoIcon}
        </div>
    `
}

export function showErrors(id, configurations) {
    if (!configurations) {
        console.error("Configurations parameter is undefined")
        return
    }
    try {
        configurations = JSON.parse(configurations)
    } catch (e) {
        console.error("Failed to parse configurations JSON:", e)
        return
    }
    const configuration = configurations.find(config => config._id === id)
    if (!configuration || !configuration.validation_errors) return

    const errorMessages = configuration.validation_errors.map(error => `
        <li>${error.error}: ${JSON.stringify(error.object)}</li>
    `).join('')

    const errorPopup = document.createElement('div')
    errorPopup.className = 'error-popup'
    errorPopup.innerHTML = `
        <div class="error-popup-content">
            <span class="close">&times;</span>
            <h2>Validation Errors</h2>
            <ul>${errorMessages}</ul>
        </div>
    `
    document.body.appendChild(errorPopup)

    const closeErrorPopup = () => {
        document.querySelector('.error-popup').remove()
        document.removeEventListener('keydown', handleEscKey)
        document.removeEventListener('click', handleClickOutside)
    }

    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closeErrorPopup()
        }
    }

    const handleClickOutside = (e) => {
        if (e.target.classList.contains('error-popup')) {
            closeErrorPopup()
        }
    }

    document.querySelector('.error-popup .close').addEventListener('click', closeErrorPopup)
    document.addEventListener('keydown', handleEscKey)
    document.addEventListener('click', handleClickOutside)
}

export function showConfigInfo(id, configurations) {
    if (!configurations) {
        console.error("Configurations parameter is undefined")
        return
    }
    try {
        configurations = JSON.parse(configurations)
    } catch (e) {
        console.error("Failed to parse configurations JSON:", e)
        return
    }
    const configuration = configurations.find(config => config._id === id)
    if (!configuration) return

    const configInfo = JSON.stringify(configuration, null, 2)

    const infoPopup = document.createElement('div')
    infoPopup.className = 'info-popup'
    infoPopup.innerHTML = `
        <div class="info-popup-content">
            <span class="close">&times;</span>
            <h2>Configuration Info</h2>
            <pre>${configInfo}</pre>
        </div>
    `
    document.body.appendChild(infoPopup)

    const closeInfoPopup = () => {
        document.querySelector('.info-popup').remove()
        document.removeEventListener('keydown', handleEscKey)
        document.removeEventListener('click', handleClickOutside)
    }

    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closeInfoPopup()
        }
    }

    const handleClickOutside = (e) => {
        if (e.target.classList.contains('info-popup')) {
            closeInfoPopup()
        }
    }

    document.querySelector('.info-popup .close').addEventListener('click', closeInfoPopup)
    document.addEventListener('keydown', handleEscKey)
    document.addEventListener('click', handleClickOutside)
}

window.showErrors = showErrors
window.showConfigInfo = showConfigInfo
