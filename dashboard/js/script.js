// /dashboard/script.js
// Description: Main script for the dashboard
// Used in: dashboard/index.html

import { fetchJSON } from '../../common/utils/utils.js'
import { SCREENWERK_PUBLISHER_API } from '../../common/config/constants.js'
import { displayConfigurations } from './display.js'
import { 
    HOSTNAME,
    ACCOUNT,
    ENTU_ENTITY_URL,
    ENTU_FRONTEND_URL,
    UNICODE_ICONS 
} from '../../common/config/constants.js'

// Disclaimer: no semicolons, if unnecessary, are used in this project

async function fetchConfigurations() {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_configuration&props=name.string,_parent.reference,_parent.string`
    try {
        const response = await fetch(url)
        const data = await response.json()
        // ...existing code...
    } catch (error) {
        console.error("Failed to fetch configurations:", error)
        return []
    }
}

async function init() {
    try {
      console.log('Dashboard initialization started.')
      await displayConfigurations()
      console.log('Dashboard initialization completed.')
    } catch (error) {
      console.error('Error during dashboard initialization:', error)
      // Display a user-friendly error message on the page
    }
  }
  
  document.addEventListener('DOMContentLoaded', init)

// Populate Git info
function populateGitInfo() {
  if (window.gitInfo) {
    document.getElementById('branch-info').textContent = `Branch: ${window.gitInfo.branch}`;
    document.getElementById('commit-info').textContent = `Commit: ${window.gitInfo.commit}`;
    document.getElementById('build-time').textContent = `Build: ${new Date(window.gitInfo.buildTime).toLocaleString()}`;
    
    document.getElementById('branch-info-footer').textContent = window.gitInfo.branch;
    document.getElementById('commit-info-footer').textContent = window.gitInfo.commit;
    document.getElementById('build-time-footer').textContent = new Date(window.gitInfo.buildTime).toLocaleString();
  }
}

// Call the function when the DOM is loaded
document.addEventListener('DOMContentLoaded', populateGitInfo)