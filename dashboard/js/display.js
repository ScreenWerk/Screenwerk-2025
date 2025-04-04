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

export async function displayConfigurations() {
    showProgressBar()
    const grouped_customers = await groupEntities()

    const accordion = document.getElementById("accordion")
    let totalScreens = 0
    for (const customer_id in grouped_customers) {
        for (const config_id in grouped_customers[customer_id].configurations) {
            for (const screen_group_id in grouped_customers[customer_id].configurations[config_id].screenGroups) {
                totalScreens += grouped_customers[customer_id].configurations[config_id].screenGroups[screen_group_id].screens.length
            }
        }
    }

    let loadedScreens = 0
    for (const customer_id in grouped_customers) {
        const customerSectionE = document.createElement("section")
        customerSectionE.className = "customer-section"

        const customerTitleE = document.createElement("button")
        customerTitleE.className = "accordion"
        customerTitleE.textContent = `${grouped_customers[customer_id].customerName} (${Object.keys(grouped_customers[customer_id].configurations).length})`
        customerSectionE.appendChild(customerTitleE)

        const configListE = document.createElement("div")
        configListE.className = "panel"

        for (const config_id in grouped_customers[customer_id].configurations) {
            const configuration = grouped_customers[customer_id].configurations[config_id]
            const configSectionE = document.createElement("section")
            // configSectionE.dataset.config = JSON.stringify(configuration)
            configSectionE.className = "config-section"

            const configTitleE = document.createElement("button")
            configTitleE.className = "accordion"
            const config = grouped_customers[customer_id].configurations[config_id]
            configTitleE.innerHTML = `
                ${config.configName} 
                (${Object.keys(config.screenGroups).length}) 
                ${toolbarSnippet(config_id, '', '', config.validation_errors, Object.values(grouped_customers[customer_id].configurations))}
            `
            configSectionE.appendChild(configTitleE)

            const screenGroupListE = document.createElement("div")
            screenGroupListE.className = "panel"

            for (const screen_group_id in config.screenGroups) {
                const screenGroupSectionE = document.createElement("section")
                screenGroupSectionE.className = "screen-group-section"

                const screenGroupTitleE = document.createElement("button")
                screenGroupTitleE.className = "accordion"
                const screen_group = config.screenGroups[screen_group_id]
                screenGroupTitleE.innerHTML = `
                    ${screen_group.screen_group_name} 
                    (${screen_group.screens.length}) 
                    ${toolbarSnippet(screen_group_id, screen_group.published)}
                `
                screenGroupSectionE.appendChild(screenGroupTitleE)

                const playerElementE = document.createElement("div")
                playerElementE.className = "mini-player"
                const playerPanelE = document.createElement("div")
                playerPanelE.className = "panel"
                playerPanelE.appendChild(playerElementE)
                screenGroupSectionE.appendChild(playerPanelE)
                const screen_group_config = configuration
                // console.log(`Processing screen group: ${screen_group_id}`)
                // console.log(`Screen group configuration:`, screen_group_config)

                if (screen_group_config) {
                    try {
                        // Initialize the player with the screen group configuration
                        playerElementE.SwPlayer = new EntuScreenWerkPlayer(playerElementE, screen_group_config)
                        console.log(`Player initialized for screen group: ${screen_group_id}`)
                    } catch (error) {
                        console.error(`Error initializing player for screen group: ${screen_group_id}`, error)
                    }
                } else {
                    console.warn(`Configuration not available for screen group: ${screen_group_id}`)
                    playerPanelE.innerHTML = '<div class="error">Configuration not available</div>'
                }

                const screenList = document.createElement("div")
                screenList.className = "panel"

                screen_group.screens.forEach(screen => {
                    const screenSection = document.createElement("section")
                    screenSection.className = "screen-section"
                    screenSection.innerHTML = `
                        ${screen.name[0].string} 
                        ${toolbarSnippet(screen._id, '', screen._id)}
                    `
                    screenList.appendChild(screenSection)
                    loadedScreens++
                    updateProgressBar(Math.round((loadedScreens / totalScreens) * 100))
                })

                screenGroupSectionE.appendChild(screenList)
                screenGroupListE.appendChild(screenGroupSectionE)
            }

            configSectionE.appendChild(screenGroupListE)
            configListE.appendChild(configSectionE)
        }

        customerSectionE.appendChild(configListE)
        accordion.appendChild(customerSectionE)
    }

    const progressBarContainer = document.querySelector('.progress-bar-container')
    if (progressBarContainer) {
        progressBarContainer.remove()
    }

    const accordions = document.getElementsByClassName("accordion")
    for (let i = 0; i < accordions.length; i++) {
        const accordion = accordions[i]
        const panel = accordion.nextElementSibling
        
        // Add appropriate ARIA attributes
        accordion.setAttribute('aria-expanded', 'false')
        accordion.setAttribute('aria-controls', `panel-${i}`)
        panel.id = `panel-${i}`
        panel.setAttribute('aria-hidden', 'true')
        
        accordion.addEventListener("click", function() {
            debugLog(`Accordion clicked: ${this.textContent}`)
            const expanded = this.classList.toggle("active")
            this.setAttribute('aria-expanded', expanded)
            
            let panel = this.nextElementSibling
            while (panel && panel.classList.contains("panel")) {
                const isVisible = panel.style.display === "block"
                panel.style.display = isVisible ? "none" : "block"
                panel.setAttribute('aria-hidden', isVisible)

                // Start or pause the child player
                const playerElement = panel.querySelector(".mini-player")
                if (playerElement && playerElement.mediaList) {
                    debugLog(`Player found for ${playerElement.id}`)
                    if (!isVisible) {
                        playerElement.mediaList.getCurrent()?.play()
                    } else {
                        playerElement.mediaList.getCurrent()?.pause()
                    }
                }

                panel = panel.nextElementSibling
            }
        })
    }
}