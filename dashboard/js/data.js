import { fetchJSON } from '../../common/utils/utils.js'
import { SCREENWERK_PUBLISHER_API } from '../../common/config/constants.js'
import { updateProgressBar } from './display.js'
import { getConfigurationById } from '../../common/services/entu-configuration-service.js'
import { fetchEntitiesByType } from '../../common/utils/entu-utils.js'
import { DEBUG } from './config.js'

/**
 * Displays an error message to the user
 * @param {string} message - Error message to display
 */
function displayErrorMessage(message) {
    const errorContainer = document.getElementById('error-container') || createErrorContainer()
    const errorElement = document.createElement('div')
    errorElement.className = 'error-message'
    errorElement.textContent = message
    errorContainer.appendChild(errorElement)
}

/**
 * Creates an error container if it doesn't exist
 * @returns {HTMLElement} - The error container element
 */
function createErrorContainer() {
    const container = document.createElement('div')
    container.id = 'error-container'
    document.body.insertBefore(container, document.body.firstChild)
    return container
}

/**
 * Fetches configurations from the Entu API and processes them
 * @returns {Promise<Array>} - Array of configuration objects
 */
export async function fetchEntuConfigurations() {
    console.log('Fetching configuration ids from Entu...')
    try {
        const configurations = await fetchEntitiesByType('sw_configuration')
        
        const configId = DEBUG.CONFIGURATION_ID
        
        // Filter configurations only if debug_configuration is set
        const filteredConfigurations = configId 
            ? configurations.filter(config => config._id === configId)
            : configurations.filter(config => config._id)

        const totalConfigurations = filteredConfigurations.length
        let loadedConfigurations = 0

        const updateProgress = () => {
            loadedConfigurations++
            updateProgressBar(Math.round((loadedConfigurations / totalConfigurations) * 100))
        }

        // Use the service functions to fetch and process configurations
        const fullConfigurations = await Promise.all(
            filteredConfigurations.map(async config => {
                const result = await getConfigurationById(config._id)
                if (!result.configuration) {
                    console.error(`Failed to fetch configuration: ${config._id}`)
                    return null
                }
                
                updateProgress()
                return result
            })
        )
        
        if (DEBUG.ENABLE_LOGGING) {
            console.log('Fetched and processed configurations:', fullConfigurations)
        }
        
        return fullConfigurations
    } catch (error) {
        console.error('Failed to fetch configurations from Entu:', error)
        displayErrorMessage('Failed to load configurations. Please try again later.')
        return []
    }
}

/**
 * Groups entities by customer, configuration, and screen group
 * 
 * @returns {Promise<Object>} Hierarchical structure of customers, configurations, and screen groups
 * @throws {Error} If the API request fails
 */
export async function groupEntities() {
    // Fetch customers with their screen groups and configurations
    const configurations = await fetchEntuConfigurations()
    
    if (DEBUG.ENABLE_LOGGING) {
        console.log('Fetched configurations:', configurations)
    }
    
    const grouped_customers = {}
    
    for (const config of configurations) {
        if (!config || !config.configuration) continue
        
        // Extract customer information
        const configuration = config.configuration
        const { _id: customerId, name: customerName = 'Unknown Customer' } = configuration.customer || {}
        
        if (!customerId) {
            console.warn('Missing customer ID for configuration:', configuration._id)
            continue
        }
        
        // Initialize customer entry if it doesn't exist
        if (!grouped_customers[customerId]) {
            grouped_customers[customerId] = {
                customerName: customerName,
                configurations: {}
            }
        }
        
        // Initialize configuration entry if it doesn't exist
        if (!grouped_customers[customerId].configurations[configuration._id]) {
            grouped_customers[customerId].configurations[configuration._id] = {
                configName: configuration.name,
                screenGroups: {},
                ...configuration
            }
        }
        
        // Process screen groups using referringScreenGroups which is an object, not an array
        if (configuration.referringScreenGroups) {
            // Iterate over object keys
            Object.keys(configuration.referringScreenGroups).forEach(screenGroupId => {
                const screenGroup = configuration.referringScreenGroups[screenGroupId]
                
                grouped_customers[customerId].configurations[configuration._id].screenGroups[screenGroupId] = {
                    screen_group_name: screenGroup.name,
                    published: screenGroup.published,
                    screens: []  // Will be populated later if needed
                }
            })
        }
    }
    
    if (DEBUG.ENABLE_LOGGING) {
        console.log('Grouped customers:', grouped_customers)
    }
    
    return grouped_customers
}

/**
 * Fetches a configuration from the Publisher API
 * @param {string} id - The entity ID to fetch
 * @returns {Promise<Object>} The fetched configuration
 */
export async function fetchFromPublisher(id) {
    return await fetchJSON(`${SCREENWERK_PUBLISHER_API}${id}.json`)
}