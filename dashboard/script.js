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
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_screen&props=name.string,screen_group.reference,published.string`
    try {
        const response = await fetch(url)
        const data = await response.json()
        return data.entities
    } catch (error) {
        console.error("Failed to fetch screens:", error)
        return []
    }
}

/**
 * Fetches configurations and groups them by their parent customer.
 * Creates an accordion UI where each customer is a collapsible section containing their configurations.
 * Each configuration is also an accordion containing screen groups that refer to it.
 * Each screen group is also an accordion containing screens that refer to it.
 */
async function displayConfigurations() {
    const configurations = await fetchConfigurations()
    const screenGroups = await fetchScreenGroups()
    const screens = await fetchScreens()
    console.log("Configurations:", configurations)
    console.log("Screen groups:", screenGroups)
    console.log("Screens:", screens)
    const groupedConfigurations = {}

    for (const config of configurations) {
        const customerId = config._parent[0].reference
        const customerName = config._parent[0].string
        if (!groupedConfigurations[customerId]) {
            groupedConfigurations[customerId] = {
                customerName: customerName,
                configurations: []
            }
        }
        groupedConfigurations[customerId].configurations.push(config)
    }

    const accordion = document.getElementById("accordion")
    for (const customerId in groupedConfigurations) {
        const customerConfigurations = groupedConfigurations[customerId].configurations.filter(config => {
            const relatedScreenGroups = screenGroups.filter(screenGroup => screenGroup.configuration[0].reference === config._id)
            return relatedScreenGroups.length > 0
        })

        if (customerConfigurations.length === 0) {
            continue
        }

        const customerSection = document.createElement("section")
        customerSection.className = "customer-section"

        const customerTitle = document.createElement("button")
        customerTitle.className = "accordion"
        customerTitle.textContent = groupedConfigurations[customerId].customerName
        customerSection.appendChild(customerTitle)

        const configList = document.createElement("div")
        configList.className = "panel"

        customerConfigurations.forEach((config) => {
            const configSection = document.createElement("section")
            configSection.className = "config-section"

            const configTitle = document.createElement("button")
            configTitle.className = "accordion"
            configTitle.innerHTML = `${config.name[0].string} <div class="toolbar"><a href="${ENTU_FRONTEND_URL}/${config._id}" target="_blank"><img src="/images/entulogo.png" class="entu-logo" alt="Entu"></a></div>`
            configSection.appendChild(configTitle)

            const screenGroupList = document.createElement("div")
            screenGroupList.className = "panel"

            const relatedScreenGroups = screenGroups.filter(screenGroup => screenGroup.configuration[0].reference === config._id)
            relatedScreenGroups.forEach(screenGroup => {
                const screenGroupSection = document.createElement("section")
                screenGroupSection.className = "screen-group-section"

                const screenGroupTitle = document.createElement("button")
                screenGroupTitle.className = "accordion"
                screenGroupTitle.innerHTML = `${screenGroup.name[0].string} <div class="toolbar"><a href="${ENTU_FRONTEND_URL}/${screenGroup._id}" target="_blank"><img src="/images/entulogo.png" class="entu-logo" alt="Entu"></a></div>`
                screenGroupSection.appendChild(screenGroupTitle)

                const screenList = document.createElement("div")
                screenList.className = "panel"

                const relatedScreens = screens
                    // Filter out screens, that are not related to any screen group
                    .filter(screen => screen.screen_group && screen.screen_group.length > 0)
                    // Filter out screens, that are not related to the current screen group
                    .filter(screen => screen.screen_group[0].reference === screenGroup._id)
                    
                relatedScreens.forEach(screen => {
                    const screenSection = document.createElement("section")
                    screenSection.className = "screen-section"
                    screenSection.innerHTML = `${screen.name[0].string} <div class="toolbar"><a href="${ENTU_FRONTEND_URL}/${screen._id}" target="_blank"><img src="/images/entulogo.png" class="entu-logo" alt="Entu"></a></div>`
                    screenList.appendChild(screenSection)
                })

                screenGroupSection.appendChild(screenList)
                screenGroupList.appendChild(screenGroupSection)
            })

            configSection.appendChild(screenGroupList)
            configList.appendChild(configSection)
        })

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
