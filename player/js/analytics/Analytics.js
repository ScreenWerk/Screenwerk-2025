// Analytics.js - thin wrapper around external Entu Analytics script (ea.min.js)
// We assume <script src="https://analytics.entu.dev/ea.min.js" data-site="..." defer></script> is loaded.
// This wrapper normalizes player-specific events and adds screenId enrichment.

import { debugLog } from '../../../shared/utils/debug-utils.js'

const state = {
    initialized: false,
    screenId: null,
    startTime: null,
    heartbeatTimer: null
}

function haveExternalClient() {
    return typeof window !== 'undefined' && window.analytics && typeof window.analytics.track === 'function'
}

export function track(eventType, details = {}) {
    if (!state.initialized) {
        debugLog('[Analytics] track skipped - not initialized', { eventType })
        return
    }
    if (!haveExternalClient()) {
        debugLog('[Analytics] track skipped - external client unavailable', { eventType })
        return
    }
    try {
        const enriched = { ...details, screenId: state.screenId }
        debugLog('[Analytics] tracking event', { eventType, enriched })
        window.analytics.track(eventType, enriched)
        debugLog('[Analytics] event sent successfully', { eventType })
    } catch (e) {
        debugLog('[Analytics] track failed', { eventType, error: e.message })
    }
}

function registerGlobalErrorHandlers() {
    window.addEventListener('error', (e) => {
        track('runtime_error', {
            message: e.message,
            source: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            stack: e.error?.stack?.split('\n').slice(0, 5).join('\n')
        })
    })
    window.addEventListener('unhandledrejection', (e) => {
        track('runtime_error', {
            message: e.reason?.message || String(e.reason),
            isUnhandledRejection: true,
            stack: (e.reason && e.reason.stack) ? e.reason.stack.split('\n').slice(0, 5).join('\n') : undefined
        })
    })
}

export function initAnalytics(screenId) {
    if (state.initialized) return true
    state.screenId = screenId
    state.startTime = performance.now()
    state.initialized = true
    registerGlobalErrorHandlers()
    debugLog('[Analytics] Wrapper initialized (external script expected)', { screenId })
    return true
}

// Schedule heartbeat at 42nd minute each hour
function msUntilNextMinute42() {
    const now = new Date()
    const fire = new Date(now.getTime())
    if (now.getMinutes() > 42 || (now.getMinutes() === 42 && (now.getSeconds() > 0 || now.getMilliseconds() > 0))) {
        fire.setHours(fire.getHours() + 1)
    }
    fire.setMinutes(42, 0, 0)
    return fire.getTime() - now.getTime()
}

export function startHourlyMinute42Heartbeat(provider) {
    if (!state.initialized) return
    const scheduleNext = () => {
        const delay = msUntilNextMinute42()
        state.heartbeatTimer = setTimeout(() => {
            try {
                const ctx = typeof provider === 'function' ? provider() : {}
                track('heartbeat', {
                    layoutId: ctx?.layoutId || null,
                    uptimeSec: state.startTime ? Math.round((performance.now() - state.startTime) / 1000) : null
                })
            } catch (e) { debugLog('[Analytics] Heartbeat emit failed', e) }
            scheduleNext()
        }, delay)
    }
    scheduleNext()
    debugLog('[Analytics] Heartbeat scheduling started (42nd minute each hour)')
}

export const analytics = { init: initAnalytics, track, startHourlyMinute42Heartbeat }
