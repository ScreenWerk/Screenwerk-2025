// ConfigurationLoader.js - Extracted configuration fetching logic
// Responsibility: Validate configuration ID, fetch configuration JSON from Publisher API

import { debugLog } from '../../../../shared/utils/debug-utils.js'

export async function fetchConfiguration(configurationId) {
    if (!configurationId.match(/^[0-9a-f]{24}$/)) {
        throw new Error(`Invalid screen ID format: ${configurationId}. Must be 24-character hex string.`)
    }

    const { SCREENWERK_PUBLISHER_API } = await import('../../../../shared/config/constants.js')
    const apiUrl = `${SCREENWERK_PUBLISHER_API}${configurationId}.json`
    debugLog(`[ConfigurationLoader] Fetching from Publisher API: ${apiUrl}`)

    const response = await fetch(apiUrl)
    if (!response.ok) {
        throw new Error(`Publisher API error: ${response.status} ${response.statusText}`)
    }

    const configuration = await response.json()

    debugLog('[ConfigurationLoader] Publisher API response received', {
        configId: configuration.configurationEid,
        schedules: configuration.schedules?.length || 0,
        updateInterval: configuration.updateInterval,
        publishedAt: configuration.publishedAt
    })

    return configuration
}
