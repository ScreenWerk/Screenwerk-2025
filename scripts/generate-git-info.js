#!/usr/bin/env node

import { fetchJSON } from '../common/utils/utils.js'

const fs = require('fs')
const path = require('path')

// Get Git information from Netlify environment variables
const branch = process.env.BRANCH || 'local-development'
const commit = process.env.COMMIT_REF?.slice(0, 7) || 'dev'
const buildTime = new Date().toISOString()
const deployUrl = process.env.DEPLOY_URL || 'http://localhost'

// Create the content for git-info.js
const fileContent = `
// This file is auto-generated during build
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

console.log(`Generated git-info.js with branch: ${branch}, commit: ${commit}`)
