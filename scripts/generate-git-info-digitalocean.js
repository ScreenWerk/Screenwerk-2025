#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Get Git information from DigitalOcean App Platform environment variables
const branch = process.env.DOA_BRANCH || process.env.BRANCH || 'local-development'
const commit = process.env.DOA_COMMIT_SHA?.slice(0, 7) || process.env.COMMIT_REF?.slice(0, 7) || 'dev'
const buildTime = new Date().toISOString()
const deployUrl = process.env.DOA_DEPLOYMENT_URL || process.env.DEPLOY_URL || 'http://localhost'

// Create the content for git-info.js
const fileContent = `
// This file is auto-generated during build (DigitalOcean)
window.gitInfo = {
  branch: '${branch}',
  commit: '${commit}',
  buildTime: '${buildTime}',
  deployUrl: '${deployUrl}'
}
`

// Write the file
const outputPath = path.join(__dirname, '..', 'git-info.js')
fs.writeFileSync(outputPath, fileContent)

console.log(`Generated git-info.js (DigitalOcean) with branch: ${branch}, commit: ${commit}`)
