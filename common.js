import { fetchJSON } from './utils/utils.js'
import { SCREENWERK_PUBLISHER_API } from '../config/constants.js'

// Disclaimer: no semicolons, if unnecessary, are used in this project

function toDateTimeString(ISODate) {
  return ISODate.slice(0, 10) + ' ' + ISODate.slice(11, 19)
}

// The fetchJSON function is now imported from utils.js
// const SCREENWERK_PUBLISHER_API is now imported from constants.js

export { toDateTimeString }