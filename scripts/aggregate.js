// run aggregate on all entities

require('dotenv').config()
const token = process.env.ENTU_TOKEN

const { Readable } = require('node:stream')
const readable = new Readable()

const entu_hostname = 'entu.app/api'
const entu_account = 'piletilevi'

const fetch_limit = 10000
const list_q = `https://${entu_hostname}/${entu_account}/entity?props=_id&limit=${fetch_limit}`
const aggregate_q = `https://${entu_hostname}/${entu_account}/entity/` // entu_id/aggregate

let processing_counter = 0
let processed_counter = 0
let queue_counter = 0
const full_trshold = 50
const low_trshold = 42
var paused = false

fetch(list_q, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept-Encoding': 'deflate'
  }
})
.then(response => response.json())
.then(data => data.entities.map(entity => entity._id))
.then(eid_a => {
  const total_entities = eid_a.length
  eid_a.forEach(eid => {
    readable.push(eid)
  })
  readable.push(null)

  readable.on('data', (eid) => {
    queue_counter ++
    processing_counter ++
    if (queue_counter > full_trshold) {
      console.log(`@${processing_counter} ${processed_counter}/${total_entities} Pressing breaks...`)
      readable.pause()
      paused = true
    }

    const url = `${aggregate_q}${eid}/aggregate`
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'deflate'
      }
    })
    .then(response => {
      queue_counter--
      processed_counter++
      if (queue_counter < low_trshold && paused) {
        console.log(`@${processing_counter} ${processed_counter}/${total_entities} Resuming...`)
        readable.resume()
        paused = false
      }
    })
  })
})