#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Only save build time
const buildTime = new Date().toISOString()

// Create the content for build-info.js
const fileContent = `
// This file is auto-generated during build (Netlify)
window.buildInfo = {
  buildTime: '${buildTime}'
}
`

// Write the file
const outputPath = path.join(__dirname, '..', 'build-info.js')
fs.writeFileSync(outputPath, fileContent)

console.log(`Generated build-info.js (Netlify) with buildTime: ${buildTime}`)
