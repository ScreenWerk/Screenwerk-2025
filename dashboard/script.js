// Disclaimer: no semicolons, if unnecessary, are used in this project

const HOSTNAME = "entu.app"
const ACCOUNT = "piletilevi"
const ENTU_ENTITY_URL = `https://${HOSTNAME}/api/${ACCOUNT}/entity`
const ENTU_FRONTEND_URL = `https://${HOSTNAME}/${ACCOUNT}`

const toolbarSnippet = (id, publishedAt = '') => {
    return `
        <div class="toolbar">
            <span class="published-timestamp" title="${publishedAt}">${publishedAt ? new Date(publishedAt).toLocaleString() : ''}</span>
            <a href="${ENTU_FRONTEND_URL}/${id}" target="_blank">
                <img src="/images/entulogo.png" class="entu-logo" alt="Entu">
            </a>
        </div>
    `
}

const SCREENWERK_PUBLISHER_API = 'https://swpublisher.entu.eu/screen/' // append screen ID (.json) to load configuration

async function fetchJSON(url) {
    console.log(`Fetching ${url}`)
    const r = await fetch(url)
    try {
        if (r.status !== 200) {
            return false
        }
        return await r.json()
    } catch (e) {
        console.error(`Error fetching ${url}: ${e}`)
        return false
    }
}

async function fetchFromPublisher(id) {
  return await fetchJSON(`${SCREENWERK_PUBLISHER_API}${id}.json`)
}

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
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_screen_group&props=name.string,configuration.reference,published.datetime`
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
    const screen_groups = await fetchScreenGroups()
    const screens = await fetchScreens()
    const grouped_customers = {}

    for (const screen of screens) {
        const screen_id = screen._id
        const screen_group_id = screen.screen_group[0].reference
        const screen_group = screen_groups.find(sg => sg._id === screen_group_id)
        const screen_group_name = screen_group.name[0].string
        const screen_group_published_at = screen_group.published[0].datetime
        if (!screen_group) return

        const configuration_id = screen_group.configuration[0].reference
        const configuration = configurations.find(c => c._id === configuration_id)
        const configuration_name = configuration.name[0].string

        const customer_id = configuration._parent[0].reference
        const customer_name = configuration._parent[0].string

        if (!grouped_customers[customer_id]) {
            grouped_customers[customer_id] = {
                customerName: customer_name,
                configurations: {}
            }
        }

        if (!grouped_customers[customer_id].configurations[configuration_id]) {
            grouped_customers[customer_id].configurations[configuration_id] = {
                configName: configuration_name,
                screenGroups: {}
            }
        }

        if (!grouped_customers[customer_id].configurations[configuration_id].screenGroups[screen_group_id]) {
            grouped_customers[customer_id].configurations[configuration_id].screenGroups[screen_group_id] = {
                screenGroupName: screen_group_name,
                published: screen_group_published_at,
                screens: []
            }
        }

        grouped_customers[customer_id].configurations[configuration_id].screenGroups[screen_group_id].screens.push(screen)
    }

    return grouped_customers
}

/**
 * Fetches configurations, screen groups, and screens.
 * Builds the structure from bottom up, grouping screens under screen groups,
 * screen groups under configurations, and configurations under customers.
 */
async function fetchPublishedScreenGroups(groupedCustomers) {
    // Implement the logic to fetch published screen groups
    // This is a placeholder implementation
    console.log("Fetching published screen groups for:", groupedCustomers)
}

async function displayConfigurations() {
    const groupedCustomers = await groupEntities()
    console.log("Grouped customers:", groupedCustomers)

    await fetchPublishedScreenGroups(groupedCustomers)

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
            configTitle.innerHTML = `
                ${groupedCustomers[customerId].configurations[configId].configName} 
                (${Object.keys(groupedCustomers[customerId].configurations[configId].screenGroups).length}) 
                ${toolbarSnippet(configId)}
            `
            configSection.appendChild(configTitle)

            const screenGroupList = document.createElement("div")
            screenGroupList.className = "panel"

            for (const screenGroupId in groupedCustomers[customerId].configurations[configId].screenGroups) {
                const screenGroupSection = document.createElement("section")
                screenGroupSection.className = "screen-group-section"

                const screenGroupTitle = document.createElement("button")
                screenGroupTitle.className = "accordion"
                const screenGroup = groupedCustomers[customerId].configurations[configId].screenGroups[screenGroupId]
                // console.log("Screen group:", screenGroup)
                screenGroupTitle.innerHTML = `
                    ${screenGroup.screenGroupName} 
                    (${screenGroup.screens.length}) 
                    ${toolbarSnippet(screenGroupId, screenGroup.published)}
                `
                screenGroupSection.appendChild(screenGroupTitle)

                const screenList = document.createElement("div")
                screenList.className = "panel"

                screenGroup.screens.forEach(screen => {
                    const screenSection = document.createElement("section")
                    screenSection.className = "screen-section"
                    screenSection.innerHTML = `
                        ${screen.name[0].string} 
                        ${toolbarSnippet(screen._id)}
                    `
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
