// Script: fetch-sw-entities.js
// Description: Fetch all entities with "sw_" prefix and their field definitions

require('dotenv').config()
const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

// Read environment variables for API connection
const HOSTNAME = process.env.ENTU_HOSTNAME
const ACCOUNT = process.env.ENTU_ACCOUNT
const TOKEN = process.env.ENTU_TOKEN

if (!HOSTNAME || !ACCOUNT || !TOKEN) {
    console.error('Please set ENTU_HOSTNAME, ENTU_ACCOUNT, and ENTU_TOKEN in your .env file')
    process.exit(1)
}

const BASE_URL = `https://${HOSTNAME}/${ACCOUNT}`

async function fetchJSON(url) {
    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    return res.json()
}

/**
 * Filters entity definitions for ScreenWerk entities
 * @param {Object} def - Entity definition
 * @returns {boolean} True if definition should be included
 */
function isScreenWerkEntity(def) {
    const name = extractStringValue(def.name)
    const addFrom = extractStringValue(def.add_from)
    return name.startsWith('sw_') && addFrom !== ''
}

/**
 * Extracts string value from entity field
 * @param {Object} field - Entity field object
 * @returns {string} Extracted string value or empty string
 */
function extractStringValue(field) {
    return field?.[0]?.string || ''
}

/**
 * Maps field entity to simplified field object
 * @param {Object} f - Field entity from API
 * @returns {Object} Simplified field object
 */
function mapFieldEntity(f) {
    return {
        id: f._id,
        name: extractStringValue(f.name),
        type: extractStringValue(f.type),
        reference_query: extractStringValue(f.reference_query)
    }
}

async function main() {
    // 1. Fetch all entity definitions (stored as type 'entity') and filter for 'sw_' prefix
    const defsUrl = `${BASE_URL}/entity?_type.string=entity&limit=100&props=name.string,add_from.string`
    const defsData = await fetchJSON(defsUrl)
    console.log('DEBUG: entityDefinition response:', JSON.stringify(defsData, null, 2))
    const swDefs = defsData.entities.filter(isScreenWerkEntity)

    const result = {}
    for (const def of swDefs) {
        const defId = def._id
        const defName = def.name[0].string
        const addFrom = extractStringValue(def.add_from)
        // 2. Fetch property definitions for this entity (type 'property')
        // 2. Fetch field definitions for this entity (fields stored as type 'property')
        // Fetch property definitions for this entity, including type and reference_query
        const fieldsUrl = `${BASE_URL}/entity?_type.string=property&_parent.reference=${defId}&limit=100&props=name.string,type.string,reference_query.string`
        const fieldsData = await fetchJSON(fieldsUrl)
        const fields = fieldsData.entities.map(mapFieldEntity)
        result[defName] = {
            add_from: addFrom,
            fields: fields
        }
    }

    // Write result to a JSON file in the project root
    const outputPath = path.resolve(__dirname, '../sw-entities.json')
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8')
    console.log(`Output written to ${outputPath}`)
}

main().catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
})
