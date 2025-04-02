// /dashboard/script.js
// Description: Main script for the dashboard
// Used in: dashboard/index.html

import { displayConfigurations } from './display.js'

// Disclaimer: no semicolons, if unnecessary, are used in this project

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