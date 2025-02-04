// Disclaimer: no semicolons, if unnecessary, are used in this project

const HOSTNAME = "entu.app"
const ACCOUNT = "piletilevi"
const ENTU_ENTITY_URL = `https://${HOSTNAME}/api/${ACCOUNT}/entity`
const ENTU_FRONTEND_URL = `https://${HOSTNAME}/${ACCOUNT}`

async function fetchConfigurations() {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_configuration&props=name.string,_parent.reference,_parent.string`
    try {
        const response = await fetch(url)
        const data = await response.json()
        return data.entities
    } catch (error) {
        console.error("Failed to fetch configurations:", error)
        return []
    }
}

async function fetchScreenGroups() {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_screen_group&props=name.string,configuration.reference`
    try {
        const response = await fetch(url)
        const data = await response.json()
        return data.entities
    } catch (error) {
        console.error("Failed to fetch screen groups:", error)
        return []
    }
}

async function fetchScreens() {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_screen&props=name.string,screen_group.reference,screen_group.string,published.string`
    try {
        const response = await fetch(url)
        const data = await response.json()
        return data.entities
            // Filter out screens, that are not related to any screen group
            .filter(screen => screen.screen_group && screen.screen_group.length > 0)
    } catch (error) {
        console.error("Failed to fetch screens:", error)
        return []
    }
}

/**
 * Groups screens under screen groups, screen groups under configurations,
 * and configurations under customers.
 */
async function groupEntities() {
    const configurations = await fetchConfigurations()
    const screenGroups = await fetchScreenGroups()
    const screens = await fetchScreens()
    const groupedCustomers = {}

    screens.forEach(screen => {
        const screenGroupId = screen.screen_group[0].reference
        const screenGroupName = screen.screen_group[0].string
        const screenGroup = screenGroups.find(sg => sg._id === screenGroupId)
        if (!screenGroup) return

        const configId = screenGroup.configuration[0].reference
        const configName = configurations.find(c => c._id === configId).name[0].string
        const customerId = configurations.find(c => c._id === configId)._parent[0].reference
        const customerName = configurations.find(c => c._id === configId)._parent[0].string

        if (!groupedCustomers[customerId]) {
            groupedCustomers[customerId] = {
                customerName: customerName,
                configurations: {}
            }
        }

        if (!groupedCustomers[customerId].configurations[configId]) {
            groupedCustomers[customerId].configurations[configId] = {
                configName: configName,
                screenGroups: {}
            }
        }

        if (!groupedCustomers[customerId].configurations[configId].screenGroups[screenGroupId]) {
            groupedCustomers[customerId].configurations[configId].screenGroups[screenGroupId] = {
                screenGroupName: screenGroupName,
                screens: []
            }
        }

        groupedCustomers[customerId].configurations[configId].screenGroups[screenGroupId].screens.push(screen)
    })

    return groupedCustomers
}

/**
 * Fetches configurations, screen groups, and screens.
 * Builds the structure from bottom up, grouping screens under screen groups,
 * screen groups under configurations, and configurations under customers.
 */
async function displayConfigurations() {
    const groupedCustomers = await groupEntities()
    console.log("Grouped customers:", groupedCustomers)

    const accordion = document.getElementById("accordion")
    for (const customerId in groupedCustomers) {
        const customerSection = document.createElement("section")
        customerSection.className = "customer-section"

        const customerTitle = document.createElement("button")
        customerTitle.className = "accordion"
        customerTitle.textContent = `${groupedCustomers[customerId].customerName} (${Object.keys(groupedCustomers[customerId].configurations).length})`
        customerSection.appendChild(customerTitle)

        const configList = document.createElement("div")
        configList.className = "panel"

        for (const configId in groupedCustomers[customerId].configurations) {
            const configSection = document.createElement("section")
            configSection.className = "config-section"

            const configTitle = document.createElement("button")
            configTitle.className = "accordion"
            configTitle.innerHTML = `${groupedCustomers[customerId].configurations[configId].configName} (${Object.keys(groupedCustomers[customerId].configurations[configId].screenGroups).length}) <div class="toolbar"><a href="${ENTU_FRONTEND_URL}/${configId}" target="_blank"><img src="/images/entulogo.png" class="entu-logo" alt="Entu"></a></div>`
            configSection.appendChild(configTitle)

            const screenGroupList = document.createElement("div")
            screenGroupList.className = "panel"

            for (const screenGroupId in groupedCustomers[customerId].configurations[configId].screenGroups) {
                const screenGroupSection = document.createElement("section")
                screenGroupSection.className = "screen-group-section"

                const screenGroupTitle = document.createElement("button")
                screenGroupTitle.className = "accordion"
                screenGroupTitle.innerHTML = `${groupedCustomers[customerId].configurations[configId].screenGroups[screenGroupId].screenGroupName} (${groupedCustomers[customerId].configurations[configId].screenGroups[screenGroupId].screens.length}) <div class="toolbar"><a href="${ENTU_FRONTEND_URL}/${screenGroupId}" target="_blank"><img src="/images/entulogo.png" class="entu-logo" alt="Entu"></a></div>`
                screenGroupSection.appendChild(screenGroupTitle)

                const screenList = document.createElement("div")
                screenList.className = "panel"

                groupedCustomers[customerId].configurations[configId].screenGroups[screenGroupId].screens.forEach(screen => {
                    const screenSection = document.createElement("section")
                    screenSection.className = "screen-section"
                    screenSection.innerHTML = `${screen.name[0].string} <div class="toolbar"><a href="${ENTU_FRONTEND_URL}/${screen._id}" target="_blank"><img src="/images/entulogo.png" class="entu-logo" alt="Entu"></a></div>`
                    screenList.appendChild(screenSection)
                })

                screenGroupSection.appendChild(screenList)
                screenGroupList.appendChild(screenGroupSection)
            }

            configSection.appendChild(screenGroupList)
            configList.appendChild(configSection)
        }

        customerSection.appendChild(configList)
        accordion.appendChild(customerSection)
    }

    // Add accordion functionality
    const accordions = document.getElementsByClassName("accordion")
    for (let i = 0; i < accordions.length; i++) {
        accordions[i].addEventListener("click", function() {
            this.classList.toggle("active")
            const panel = this.nextElementSibling
            if (panel.style.display === "block") {
                panel.style.display = "none"
            } else {
                panel.style.display = "block"
            }
        })
    }
}

window.onload = displayConfigurations
