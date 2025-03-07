import { UNICODE_ICONS, ENTU_FRONTEND_URL } from '../config/constants.js'

export const toolbarSnippet = (id, publishedAt = '', screenId = '', validation_errors = [], configurations = []) => {
    const configurationsJSON = configurations ? JSON.stringify(configurations).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"') : '[]'
    const errorIcon = validation_errors && validation_errors.length > 0 ? `
        <span class="error-icon" 
              title="Validation Errors" 
              onclick='showErrors("${id}", "${configurationsJSON}")'>
            ${UNICODE_ICONS.warning}
        </span>
    ` : ''
    
    const infoIcon = `
        <span class="info-icon" 
              title="Configuration Info" 
              onclick='showConfigInfo("${id}", "${configurationsJSON}")'>
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
                <img src="/images/entulogo.png" class="entu-logo" alt="Entu">
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
}

window.showErrors = showErrors
window.showConfigInfo = showConfigInfo
