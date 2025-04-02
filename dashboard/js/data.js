import { fetchJSON } from '../../common/utils/utils.js'
import { SCREENWERK_PUBLISHER_API } from '../../common/config/constants.js'
import { updateProgressBar } from './display.js'
import { getConfigurationById } from '../../common/services/entu-configuration-service.js'
import { fetchEntitiesByType } from '../../common/utils/entu-utils.js'

/**
 * 
 * @returns {Promise<Array>} - Array of configuration objects
 * @description Fetches configurations from the entu API and processes them.
 * Filters the configurations based on a specific ID and returns the processed configurations.
 */
export async function fetchEntuConfigurations() {
    console.log('Fetching configuration id\'s from entu...')
    try {
        const configurations = await fetchEntitiesByType('sw_configuration')
        
        // console.debug('Fetched configuration id\'s:', configurations)
        const debug_configuration = '5da5a2944ecca5c17a596cb0'
        const filteredConfigurations = configurations
            .filter(config => config._id === debug_configuration)

        // console.debug('Filtered configuration id\'s:', filteredConfigurations)
        const totalConfigurations = filteredConfigurations.length
        let loadedConfigurations = 0

        const updateProgress = () => {
            loadedConfigurations++
            updateProgressBar(Math.round((loadedConfigurations / totalConfigurations) * 100))
        }

        // Use the new service functions to fetch and process configurations
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
        console.log('Fetched and processed configurations:', fullConfigurations)
        
        return fullConfigurations
    } catch (error) {
        console.error("Failed to fetch configurations from entu:", error)
        return []
    }
}

export async function fetchEntuScreenGroups() {
    try {
        // Use fetchEntitiesByType instead of direct URL construction
        const screenGroups = await fetchEntitiesByType('sw_screen_group', {
            props: ['name.string', 'configuration.reference', 'published.datetime']
        })
        
        const debug_screen_group = '5da59e6f4ecca5c17a596ca3'
        const filteredScreenGroups = screenGroups
            .filter(screen_group => screen_group._id === debug_screen_group)
        
        return filteredScreenGroups
    } catch (error) {
        console.error("Failed to fetch screen groups:", error)
        return []
    }
}

export async function fetchEntuScreens() {
    try {
        // Use fetchEntitiesByType instead of direct URL construction
        const screens = await fetchEntitiesByType('sw_screen', {
            props: ['name.string', 'screen_group.reference', 'screen_group.string', 'published.string'],
            limit: 10000
        })
        
        const debug_screen = '5da5a9ce4ecca5c17a596cbb'
        const filteredScreens = screens
            .filter(screen => screen.screen_group && screen.screen_group.length > 0)
            .filter(screen => screen._id === debug_screen)

        return filteredScreens
    } catch (error) {
        console.error("Failed to fetch screens:", error)
        return []
    }
}

// Main entry point for the dashboard
export async function groupEntities() {
    // Fetch customers with their screen groups and configurations
    const configurations = await fetchEntuConfigurations()
    console.log('Fetched configurations:', configurations)
    
    const grouped_customers = {}
    for (const config of configurations) {
        if (!config || !config.configuration) continue;
        
        // Extract customer information
        const configuration = config.configuration;
        const customerId = configuration.customer?._id;
        const customerName = configuration.customer?.name || 'Unknown Customer';
        
        if (!customerId) {
            console.warn('Missing customer ID for configuration:', configuration._id);
            continue;
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
            // Iterate over object keys instead of using for...of
            Object.keys(configuration.referringScreenGroups).forEach(screenGroupId => {
                const screenGroup = configuration.referringScreenGroups[screenGroupId];
                
                grouped_customers[customerId].configurations[configuration._id].screenGroups[screenGroupId] = {
                    screen_group_name: screenGroup.name,
                    published: screenGroup.published,
                    screens: []  // Will be populated later if needed
                }
            });
        }
    }
    
    console.log('Grouped customers:', grouped_customers)
    return grouped_customers
}

export async function fetchFromPublisher(id) {
    return await fetchJSON(`${SCREENWERK_PUBLISHER_API}${id}.json`)
}