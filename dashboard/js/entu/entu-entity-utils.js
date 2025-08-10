// Dashboard-local entu entity utilities migrated minimally from common/utils/entu-utils.js
import { fetchJSON } from './fetch-utils.js'
import { ENTU_ENTITY_URL } from '../../../shared/config/constants.js'

export async function fetchEntitiesByType(type, options = {}) {
  try {
    const { filterProperty, filterValue, props = [], limit } = options
    let url = `${ENTU_ENTITY_URL}?_type.string=${type}`
    const allProps = ['_id', ...props].filter((p, i, arr) => arr.indexOf(p) === i)
    url += `&props=${allProps.join(',')}`
    if (filterProperty && filterValue) url += `&${filterProperty}=${encodeURIComponent(filterValue)}`
    if (limit && Number.isInteger(limit) && limit > 0) url += `&limit=${limit}`
    const response = await fetchJSON(url)
    return response?.entities && Array.isArray(response.entities) ? response.entities : []
  } catch (e) {
    console.error(`Error fetching ${type} entities:`, e)
    return []
  }
}
