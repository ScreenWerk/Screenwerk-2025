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

        // console.debug(`Fetching ${type} entities for parent ${parentId}:`, response)
        
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
 * Builds URL for fetching entities by type
 * @param {string} type - The entity type to fetch
 * @param {Object} options - Query options
 * @returns {string} - The constructed URL
 */
function buildEntitiesByTypeURL(type, options) {
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
    
    return url
}

/**
 * Validates and extracts entities from API response
 * @param {Object} response - The API response
 * @param {string} type - The entity type for error reporting
 * @returns {Array} - Array of entities or empty array
 */
function validateAndExtractEntities(response, type) {
    if (!response || !response.entities || !Array.isArray(response.entities)) {
        console.warn(`Failed to fetch ${type} entities`)
        return []
    }
    
    return response.entities
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
        const url = buildEntitiesByTypeURL(type, options)
        const response = await fetchJSON(url)
        return validateAndExtractEntities(response, type)
    } catch (error) {
        console.error(`Error fetching ${type} entities:`, error)
        return []
    }
}

/**
 * Builds URL for fetching referencing entities
 * @param {string} referencedId - The ID being referenced
 * @param {Object} options - Query options
 * @returns {string} - The constructed URL
 */
function buildReferencingEntitiesURL(referencedId, options) {
    const { referenceProperty, entityType, props = [], limit } = options
    
    // Start building the URL
    let url = `${ENTU_ENTITY_URL}?`
    
    // Add the reference filter
    if (referenceProperty) {
        url += `${referenceProperty}.reference=${referencedId}`
    } else {
        url += `reference=${referencedId}`
    }
    
    // Add type filter if provided
    if (entityType) {
        url += `&_type.string=${entityType}`
    }
    
    // Add props parameter (always include _id)
    const allProps = ['_id', ...props].filter((p, i, arr) => arr.indexOf(p) === i)
    url += `&props=${allProps.join(',')}`
    
    // Add limit if provided
    if (limit && Number.isInteger(limit) && limit > 0) {
        url += `&limit=${limit}`
    }
    
    return url
}

/**
 * Validates and extracts referencing entities from API response
 * @param {Object} response - The API response
 * @param {string} referencedId - The referenced ID for error reporting
 * @returns {Array} - Array of entities or empty array
 */
function validateAndExtractReferencingEntities(response, referencedId) {
    if (!response || !response.entities || !Array.isArray(response.entities)) {
        console.warn(`No entities found referencing ${referencedId}`)
        return []
    }
    
    return response.entities
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
        const url = buildReferencingEntitiesURL(referencedId, options)
        const response = await fetchJSON(url)
        return validateAndExtractReferencingEntities(response, referencedId)
    } catch (error) {
        console.error(`Error fetching entities referencing ${referencedId}:`, error)
        return []
    }
}

/**
 * Transforms a value item from Entu format to simple format
 * @param {Object} item - The value item from Entu
 * @returns {*} - The transformed value
 */
function transformValueItem(item) {
    if (item.string !== undefined) return item.string
    if (item.number !== undefined) return item.number
    if (item.boolean !== undefined) return item.boolean
    if (item.datetime !== undefined) return item.datetime
    if (item.reference !== undefined) return { id: item.reference, name: item.string }
    if (item.filename !== undefined) return { _id: item._id, filename: item.filename }
    return item
}

/**
 * Simplifies an array property if it contains a single primitive value
 * @param {Array} transformedArray - The transformed array
 * @returns {*} - Either the array or the single value
 */
function simplifyArrayProperty(transformedArray) {
    if (transformedArray.length === 1) {
        const value = transformedArray[0]
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value
        }
    }
    return transformedArray
}

/**
 * Processes a property that is an array of Entu values
 * @param {Array} propertyArray - The property array from entity
 * @returns {*} - The transformed property value
 */
function processArrayProperty(propertyArray) {
    const transformed = propertyArray.map(transformValueItem)
    return simplifyArrayProperty(transformed)
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
        if (key === 'file') {
            console.debug('File property:', entity[key][0])
        }
        
        if (!key.startsWith('_')) {
            if (Array.isArray(entity[key])) {
                transformed[key] = processArrayProperty(entity[key])
            } else {
                transformed[key] = entity[key]
            }
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
    // console.debug('getFirstReferenceValue', entity, property)
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
