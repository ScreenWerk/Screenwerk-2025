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

async function main() {
  // 1. Fetch all entity definitions (stored as type 'entity') and filter for 'sw_' prefix
  const defsUrl = `${BASE_URL}/entity?_type.string=entity&limit=100&props=name.string,add_from.string`
  const defsData = await fetchJSON(defsUrl)
  console.log('DEBUG: entityDefinition response:', JSON.stringify(defsData, null, 2))
  const swDefs = defsData.entities.filter(def => {
    const name = def.name?.[0]?.string || ''
    const addFrom = def.add_from?.[0]?.string || ''
    return name.startsWith('sw_') && addFrom !== ''
  })

  const result = {}
  for (const def of swDefs) {
    const defId = def._id
    const defName = def.name[0].string
    const addFrom = def.add_from?.[0]?.string || ''
    // 2. Fetch property definitions for this entity (type 'property')
    // 2. Fetch field definitions for this entity (fields stored as type 'property')
    // Fetch property definitions for this entity, including type and reference_query
    const fieldsUrl = `${BASE_URL}/entity?_type.string=property&_parent.reference=${defId}&limit=100&props=name.string,type.string,reference_query.string`
    const fieldsData = await fetchJSON(fieldsUrl)
    const fields = fieldsData.entities.map(f => ({
      id: f._id,
      name: f.name?.[0]?.string || '',
      type: f.type?.[0]?.string || '',
      reference_query: f.reference_query?.[0]?.string || ''
    }))
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
