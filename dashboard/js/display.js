import { groupEntities } from './data.js'
import { toolbarSnippet } from './ui.js'
import { EntuScreenWerkPlayer } from '../../player/js/sw-player.js'
import { debugLog } from '../../common/utils/debug-utils.js'

export function updateProgressBar(progress) {
    const progressBar = document.getElementById('progress-bar')
    progressBar.style.width = `${progress}%`
    progressBar.textContent = `${progress}%`
}

function showProgressBar() {
    const progressBarContainer = document.createElement('div')
    progressBarContainer.className = 'progress-bar-container'
    progressBarContainer.innerHTML = '<div id="progress-bar" class="progress-bar"></div>'
    document.body.insertBefore(progressBarContainer, document.getElementById('accordion'))
}

/**
 * Creates customer section with configurations
 * @param {string} customer_id - Customer ID
 * @param {Object} customer - Customer data
 * @returns {HTMLElement} Customer section element
 */
function createCustomerSection(customer_id, customer) {
    const customerSectionE = document.createElement('section')
    customerSectionE.className = 'customer-section'

    const customerTitleE = document.createElement('button')
    customerTitleE.className = 'accordion'
    customerTitleE.textContent = `${customer.customerName} (${Object.keys(customer.configurations).length})`
    customerSectionE.appendChild(customerTitleE)

    const configListE = document.createElement('div')
    configListE.className = 'panel'

    for (const config_id in customer.configurations) {
        const configSection = createConfigSection(config_id, customer.configurations[config_id], customer.configurations)
        configListE.appendChild(configSection)
    }

    customerSectionE.appendChild(configListE)
    return customerSectionE
}

/**
 * Creates configuration section with screen groups
 * @param {string} config_id - Configuration ID
 * @param {Object} configuration - Configuration data
 * @param {Object} allConfigurations - All configurations for validation
 * @returns {HTMLElement} Configuration section element
 */
function createConfigSection(config_id, configuration, allConfigurations) {
    const configSectionE = document.createElement('section')
    configSectionE.className = 'config-section'

    const configTitleE = document.createElement('button')
    configTitleE.className = 'accordion'
    configTitleE.innerHTML = `
        ${configuration.configName} 
        (${Object.keys(configuration.screenGroups).length}) 
        ${toolbarSnippet(config_id, '', '', configuration.validation_errors, Object.values(allConfigurations))}
    `
    configSectionE.appendChild(configTitleE)

    const screenGroupListE = document.createElement('div')
    screenGroupListE.className = 'panel'

    for (const screen_group_id in configuration.screenGroups) {
        const screenGroupSection = createScreenGroupSection(screen_group_id, configuration.screenGroups[screen_group_id], configuration)
        screenGroupListE.appendChild(screenGroupSection)
    }

    configSectionE.appendChild(screenGroupListE)
    return configSectionE
}

/**
 * Creates screen group section with mini player
 * @param {string} screen_group_id - Screen group ID
 * @param {Object} screen_group - Screen group data
 * @param {Object} configuration - Configuration data
 * @returns {HTMLElement} Screen group section element
 */
function createScreenGroupSection(screen_group_id, screen_group, configuration) {
    const screenGroupSectionE = document.createElement('section')
    screenGroupSectionE.className = 'screen-group-section'

    const screenGroupTitleE = document.createElement('button')
    screenGroupTitleE.className = 'accordion'
    screenGroupTitleE.innerHTML = `
        ${screen_group.screen_group_name} 
        (${screen_group.screens.length}) 
        ${toolbarSnippet(screen_group_id, screen_group.published)}
    `
    screenGroupSectionE.appendChild(screenGroupTitleE)

    const playerElementE = document.createElement('div')
    playerElementE.className = 'mini-player'
    const playerPanelE = document.createElement('div')
    playerPanelE.className = 'panel'
    playerPanelE.appendChild(playerElementE)
    screenGroupSectionE.appendChild(playerPanelE)

    initializePlayer(playerElementE, playerPanelE, screen_group_id, configuration)

    return screenGroupSectionE
}

/**
 * Initializes player for screen group
 * @param {HTMLElement} playerElementE - Player element
 * @param {HTMLElement} playerPanelE - Player panel element
 * @param {string} screen_group_id - Screen group ID
 * @param {Object} configuration - Configuration data
 */
function initializePlayer(playerElementE, playerPanelE, screen_group_id, configuration) {
    if (configuration) {
        try {
            playerElementE.SwPlayer = new EntuScreenWerkPlayer(playerElementE, configuration)
            console.log(`Player initialized for screen group: ${screen_group_id}`)
        } catch (error) {
            console.error(`Error initializing player for screen group: ${screen_group_id}`, error)
        }
    } else {
        console.warn(`Configuration not available for screen group: ${screen_group_id}`)
        playerPanelE.innerHTML = '<div class="error">Configuration not available</div>'
    }
}

/**
 * Sets up accordion functionality for all accordion elements
 */
function setupAccordionListeners() {
    const accordions = document.getElementsByClassName('accordion')
    for (let i = 0; i < accordions.length; i++) {
        const accordion = accordions[i]
        const panel = accordion.nextElementSibling
        
        // Add appropriate ARIA attributes
        accordion.setAttribute('aria-expanded', 'false')
        accordion.setAttribute('aria-controls', `panel-${i}`)
        panel.id = `panel-${i}`
        panel.setAttribute('aria-hidden', 'true')
        
        accordion.addEventListener('click', function() {
            const parent_class = this.parentElement.classList[0]
            debugLog(`Accordion clicked: ${parent_class}`)
            const expanded = this.classList.toggle('active')
            this.setAttribute('aria-expanded', expanded)
            
            let panel = this.nextElementSibling
            while (panel && panel.classList.contains('panel')) {
                togglePanelVisibility(panel)
                handlePlayerState(panel, parent_class)
                panel = panel.nextElementSibling
            }
        })
    }
}

export async function displayConfigurations() {
    showProgressBar()
    const grouped_customers = await groupEntities()

    const accordion = document.getElementById('accordion')
    
    // Process and render all customer sections
    for (const customer_id in grouped_customers) {
        const customerSection = createCustomerSection(customer_id, grouped_customers[customer_id])
        accordion.appendChild(customerSection)
    }

    // Remove progress bar
    const progressBarContainer = document.querySelector('.progress-bar-container')
    if (progressBarContainer) {
        progressBarContainer.remove()
    }

    // Setup accordion interactions
    setupAccordionListeners()
}

function togglePanelVisibility(panel) {
    const isVisible = panel.style.display === 'block'
    panel.style.display = isVisible ? 'none' : 'block'
    panel.setAttribute('aria-hidden', isVisible)
}

function handlePlayerState(panel, section_name) {
    const playerElement = panel.querySelector('.mini-player')
    if (!playerElement) {
        debugLog(`No player element found for ${section_name}`)
        debugLog(panel)
        return
    }
    const swPlayer = playerElement.SwPlayer
    if (!swPlayer) {
        debugLog(`No SwPlayer instance found for ${section_name}`)
        return
    }
    const subPanels = panel.querySelectorAll('.panel')
    const allPanelsExpanded = panel.style.display === 'block'
        && Array.from(subPanels).every(subPanel => subPanel.style.display === 'block')
    if (allPanelsExpanded) {
        console.log(`All sub-panels are expanded for ${section_name}`)
        swPlayer.resume()
    } else {
        console.log(`Not all sub-panels are expanded for ${section_name}`)
        swPlayer.pause()
    }
    if (swPlayer.isPlaying) {
        console.log(`Player is now playing for ${section_name}`)
    } else {
        console.log(`Player is now paused for ${section_name}`)
    }
}