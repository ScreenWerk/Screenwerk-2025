// Dashboard-local entu entity utilities (minimally migrated legacy implementation; original directory removed)
import { fetchJSON } from './fetch-utils.js'
import { ENTU_ENTITY_URL } from '../../../shared/config/constants.js'

function buildEntitiesUrl(type, { filterProperty, filterValue, props = [], limit } = {}) {
    const uniqueProps = ['_id', ...props].filter((p, i, arr) => arr.indexOf(p) === i)
    const queryParts = [`_type.string=${type}`, `props=${uniqueProps.join(',')}`]
    if (filterProperty && filterValue) queryParts.push(`${filterProperty}=${encodeURIComponent(filterValue)}`)
    if (Number.isInteger(limit) && limit > 0) queryParts.push(`limit=${limit}`)
    return `${ENTU_ENTITY_URL}?${queryParts.join('&')}`
}

function extractEntities(response) {
    const entities = response?.entities
    return Array.isArray(entities) ? entities : []
}

export async function fetchEntitiesByType(type, options = {}) {
    try {
        const url = buildEntitiesUrl(type, options)
        const response = await fetchJSON(url)
        return extractEntities(response)
    } catch (e) {
        console.error(`Error fetching ${type} entities:`, e)
        return []
    }
}
