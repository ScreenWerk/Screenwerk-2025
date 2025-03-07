import { validateConfiguration } from '/validator.js'
import { HOSTNAME, ACCOUNT, ENTU_ENTITY_URL, ENTU_FRONTEND_URL, SCREENWERK_PUBLISHER_API, UNICODE_ICONS } from './constants.js'
import { fetchJSON } from '/utils/utils.js'
import { EntuScreenWerkPlayer } from '/sw-player.js'
import { toolbarSnippet, showErrors, showConfigInfo } from './ui.js'
import { fetchFromPublisher, fetchEntuConfigurations, fetchEntuScreenGroups, fetchEntuScreens, groupEntities, fetchPublishedScreenGroups } from './data.js'
import { displayConfigurations } from './display.js'

// Disclaimer: no semicolons, if unnecessary, are used in this project

window.onload = displayConfigurations
