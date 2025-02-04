const HOSTNAME = "entu.app"
const ACCOUNT = "piletilevi"
const ENTU_ENTITY_URL = `https://${HOSTNAME}/api/${ACCOUNT}/entity`

async function fetchConfigurations() {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_configuration&props=name.string,_parent.reference,_parent.string`
    try {
        const response = await fetch(url)
        const data = await response.json()
        console.log(data)
        return data.entities
    } catch (error) {
        console.error("Failed to fetch configurations:", error)
        return []
    }
}

async function displayConfigurations() {
    const configurations = await fetchConfigurations()
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
        const customerSection = document.createElement("div")
        customerSection.className = "customer-section"

        const customerTitle = document.createElement("button")
        customerTitle.className = "accordion"
        customerTitle.textContent = groupedConfigurations[customerId].customerName
        customerSection.appendChild(customerTitle)

        const configList = document.createElement("div")
        configList.className = "panel"
        const ul = document.createElement("ul")
        groupedConfigurations[customerId].configurations.forEach(config => {
            const configItem = document.createElement("li")
            configItem.textContent = config.name[0].string
            ul.appendChild(configItem)
        })

        configList.appendChild(ul)
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
