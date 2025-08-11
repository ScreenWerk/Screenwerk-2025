// ConfigurationLoader.js - Extracted configuration fetching logic
// Responsibility: Validate configuration ID, fetch configuration JSON from Publisher API

import { debugLog } from '../../../../shared/utils/debug-utils.js'
import { track as trackAnalytics } from '../../analytics/Analytics.js'

export async function fetchConfiguration(configurationId) {
    if (!configurationId.match(/^[0-9a-f]{24}$/)) {
        throw new Error(`Invalid screen ID format: ${configurationId}. Must be 24-character hex string.`)
    }

    const { SCREENWERK_PUBLISHER_API } = await import('../../../../shared/config/constants.js')
    const apiUrl = `${SCREENWERK_PUBLISHER_API}${configurationId}.json`
    debugLog(`[ConfigurationLoader] Fetching from Publisher API: ${apiUrl}`)

    const started = performance.now()
    let response
    try {
        response = await fetch(apiUrl)
    } catch (err) {
        const durationMs = Math.round(performance.now() - started)
        trackAnalytics('api_call', { target: 'configuration', url: apiUrl, ok: false, status: 'NETWORK_ERROR', durationMs })
        throw err
    }
    const durationMs = Math.round(performance.now() - started)
    if (!response.ok) {
        trackAnalytics('api_call', { target: 'configuration', url: apiUrl, ok: false, status: response.status, durationMs })
        throw new Error(`Publisher API error: ${response.status} ${response.statusText}`)
    }

    const configuration = await response.json()
    trackAnalytics('api_call', { target: 'configuration', url: apiUrl, ok: true, status: response.status, durationMs })

    debugLog('[ConfigurationLoader] Publisher API response received', {
        configId: configuration.configurationEid,
        schedules: configuration.schedules?.length || 0,
        updateInterval: configuration.updateInterval,
        publishedAt: configuration.publishedAt
    })

    return configuration
}
