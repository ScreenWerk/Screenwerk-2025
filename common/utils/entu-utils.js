import { fetchJSON } from './utils.js'
import { ENTU_ENTITY_URL } from '../config/constants.js'

/**
 * Fetch a single entity by ID
 * @param {string} entityId - The ID of the entity to fetch
 * @returns {Promise<Object|null>} - The entity or null if not found
 */
export async function fetchEntity(entityId) {
    try {
        const response = await fetchJSON(`${ENTU_ENTITY_URL}/${entityId}`)
        return response?.entity || null
    } catch (error) {
        console.warn(`Failed to fetch entity ${entityId}: ${error.message}`)
        return null
    }
}

/**
 * Fetch child entities of a specific type and parent
 * @param {string} type - The entity type to fetch
 * @param {string} parentId - The ID of the parent entity
 * @param {Object} result - The result object for tracking errors
 * @returns {Promise<Array>} - Array of child entities
 */
export async function fetchChildEntities(type, parentId, result) {
    try {
        const url = `${ENTU_ENTITY_URL}?_type.string=${type}&_parent.reference=${parentId}`
        const response = await fetchJSON(url)

        console.debug(`Fetching ${type} entities for parent ${parentId}:`, response)
        
        if (!response || !response.entities || !Array.isArray(response.entities)) {
            result.warnings.push(`Failed to fetch ${type} entities for parent: ${parentId}`)
            return []
        }
        
        return response.entities
    } catch (error) {
        result.warnings.push(`Error fetching ${type} entities for parent ${parentId}: ${error.message}`)
        return []
    }
}

/**
 * Fetch entity IDs of a specific type with optional filtering
 * @param {string} type - The type of entities to fetch (e.g., 'sw_configuration')
 * @param {Object} options - Optional parameters
 * @param {string} options.filterProperty - Property name to filter by
 * @param {string} options.filterValue - Value to filter by
 * @param {Array<string>} options.props - Additional properties to fetch besides _id
 * @param {number} options.limit - Maximum number of entities to fetch
 * @returns {Promise<Array>} - Array of entity objects with _id and requested properties
 */
export async function fetchEntitiesByType(type, options = {}) {
    try {
        const { filterProperty, filterValue, props = [], limit } = options
        
        // Start building the URL
        let url = `${ENTU_ENTITY_URL}?_type.string=${type}`
        
        // Add props parameter (always include _id)
        const allProps = ['_id', ...props].filter((p, i, arr) => arr.indexOf(p) === i) // Remove duplicates
        url += `&props=${allProps.join(',')}`
        
        // Add filter if provided
        if (filterProperty && filterValue) {
            url += `&${filterProperty}=${encodeURIComponent(filterValue)}`
        }
        
        // Add limit if provided
        if (limit && Number.isInteger(limit) && limit > 0) {
            url += `&limit=${limit}`
        }
        
        const response = await fetchJSON(url)
        
        if (!response || !response.entities || !Array.isArray(response.entities)) {
            console.warn(`Failed to fetch ${type} entities`)
            return []
        }
        
        return response.entities
    } catch (error) {
        console.error(`Error fetching ${type} entities:`, error)
        return []
    }
}

/**
 * Fetch entities that reference a specific entity ID
 * @param {string} referencedId - The ID of the entity being referenced
 * @param {Object} options - Optional parameters
 * @param {string} options.referenceProperty - The property name containing the reference (default: any property)
 * @param {string} options.entityType - Filter by entity type
 * @param {Array<string>} options.props - Additional properties to fetch besides _id
 * @param {number} options.limit - Maximum number of entities to fetch
 * @returns {Promise<Array>} - Array of entity objects that reference the given ID
 */
export async function fetchReferencingEntities(referencedId, options = {}) {
    try {
        const { referenceProperty, entityType, props = [], limit } = options
        
        // Start building the URL
        let url = `${ENTU_ENTITY_URL}?`
        
        // Add the reference filter
        if (referenceProperty) {
            // Filter by specific property containing the reference
            url += `${referenceProperty}.reference=${referencedId}`
        } else {
            // Filter by any property containing the reference
            url += `reference=${referencedId}`
        }
        
        // Add type filter if provided
        if (entityType) {
            url += `&_type.string=${entityType}`
        }
        
        // Add props parameter (always include _id)
        const allProps = ['_id', ...props].filter((p, i, arr) => arr.indexOf(p) === i) // Remove duplicates
        url += `&props=${allProps.join(',')}`
        
        // Add limit if provided
        if (limit && Number.isInteger(limit) && limit > 0) {
            url += `&limit=${limit}`
        }
        
        const response = await fetchJSON(url)
        
        if (!response || !response.entities || !Array.isArray(response.entities)) {
            console.warn(`No entities found referencing ${referencedId}`)
            return []
        }
        
        return response.entities
    } catch (error) {
        console.error(`Error fetching entities referencing ${referencedId}:`, error)
        return []
    }
}

/**
 * Transform an Entu entity by flattening properties and making it more usable
 * @param {Object} entity - The raw entity from Entu
 * @returns {Object} - The transformed entity
 */
export function transformEntity(entity) {
    if (!entity) return null
    
    const transformed = {
        _id: entity._id
    }
    
    // Copy all properties except internal ones
    for (const key in entity) {
        if (!key.startsWith('_') && Array.isArray(entity[key])) {
            // For properties that are arrays of values (Entu format)
            transformed[key] = entity[key].map(item => {
                if (item.string !== undefined) return item.string
                if (item.number !== undefined) return item.number
                if (item.boolean !== undefined) return item.boolean
                if (item.datetime !== undefined) return item.datetime
                if (item.reference !== undefined) return { id: item.reference, name: item.string }
                return item
            })
            
            // For simple properties, just use the first value
            if (transformed[key].length === 1 && 
                (typeof transformed[key][0] === 'string' || 
                 typeof transformed[key][0] === 'number' || 
                 typeof transformed[key][0] === 'boolean')) {
                transformed[key] = transformed[key][0]
            }
        } else if (!key.startsWith('_')) {
            transformed[key] = entity[key]
        }
    }
    
    return transformed
}

/**
 * Check if an entity has a specific property with at least one value
 * @param {Object} entity - The entity to check
 * @param {string} property - The property name to check for
 * @returns {boolean} - True if the property exists and has values
 */
export function hasEntuProperty(entity, property) {
    return entity && 
           entity[property] && 
           Array.isArray(entity[property]) && 
           entity[property].length > 0
}

/**
 * Get the first reference value from a property if it exists
 * @param {Object} entity - The entity to get the reference from
 * @param {string} property - The property name that contains the reference
 * @returns {string|null} - The reference ID or null
 */
export function getFirstReferenceValue(entity, property) {
    console.debug('getFirstReferenceValue', entity, property)
    if (hasEntuProperty(entity, property)) {
        if (typeof entity[property][0] === 'object' && entity[property][0].id) {
            return entity[property][0].id
        }
        // Legacy format support
        if (entity[property][0].reference) {
            return entity[property][0].reference
        }
    }
    return null
}
