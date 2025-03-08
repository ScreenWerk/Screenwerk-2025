// /dashboard/script.js
// Description: Main script for the dashboard
// Used in: dashboard/index.html

import { displayConfigurations } from './display.js'
import { 
    HOSTNAME,
    ACCOUNT,
    ENTU_ENTITY_URL,
    ENTU_FRONTEND_URL,
    SCREENWERK_PUBLISHER_API,
    UNICODE_ICONS 
} from '../config/constants.js'

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