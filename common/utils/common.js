// Disclaimer: no semicolons, if unnecessary, are used in this project

/**
 * Formats an ISO date string to a more readable format
 * @param {string} ISODate - Date in ISO format
 * @returns {string} Formatted date string
 */
export function toDateTimeString(ISODate) {
  if (!ISODate) return ''
  return ISODate.slice(0, 10) + ' ' + ISODate.slice(11, 19)
}

// Add other common utility functions here