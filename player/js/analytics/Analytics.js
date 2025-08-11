// Analytics.js - lightweight Entu Analytics integration for player
// Graceful no-op if globals not provided

import { debugLog } from '../../../shared/utils/debug-utils.js'

const state = {
  initialized: false,
  endpoint: null,
  siteId: null,
  originalSiteId: null,
  screenId: null,
  startTime: null,
  heartbeatTimer: null
}

function hasConfig() { return !!(state.endpoint && state.siteId && state.screenId) }

function normalizeEndpoint(raw) {
  if (!raw) return raw
  // If a script path like https://domain/ea.min.js given, strip filename
  if (/\.js($|[?#])/i.test(raw)) {
    const idx = raw.lastIndexOf('/')
    if (idx !== -1) return raw.slice(0, idx)
  }
  // Remove trailing / if any (we add our own path later)
  return raw.replace(/\/$/, '')
}

function buildPayload(eventType, details) {
  return {
    '@timestamp': new Date().toISOString(),
    site: state.siteId,
    screenId: state.screenId,
    event: { type: eventType, ...details }
  }
}

function tryBeacon(url, body) {
  if (!navigator.sendBeacon) return { attempted: false, sent: false }
  const ok = navigator.sendBeacon(url, body)
  if (!ok) debugLog('[Analytics] sendBeacon failed, falling back to fetch')
  return { attempted: true, sent: ok }
}

async function postJson(url, body, attemptedBeacon) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  if (!res.ok) {
    let upstream = ''
    try { upstream = await res.text() } catch {}
    const truncatedPayload = body.length > 400 ? body.slice(0,400)+'…' : body
    debugLog('[Analytics] upstream error', { status: res.status, attemptedBeacon, response: upstream.slice(0,400), payload: truncatedPayload })
    throw new Error(`HTTP ${res.status}`)
  }
  if (window.ANALYTICS_DEBUG) debugLog('[Analytics] event sent', { size: body.length })
}

async function send(payload, immediate=true) {
  if (!hasConfig()) return
  const url = `${state.endpoint.replace(/\/$/, '')}/api/track`
  try {
    const body = JSON.stringify(payload)
  if (window.ANALYTICS_DEBUG) debugLog('[Analytics] sending', { event: payload.event?.type, payload })
    const beacon = immediate ? tryBeacon(url, body) : { attempted: false, sent: false }
    if (beacon.sent) return
    await postJson(url, body, beacon.attempted)
  } catch (e) {
    debugLog('[Analytics] send failed', e)
  }
}

export function track(eventType, details={}) { send(buildPayload(eventType, details), eventType === 'runtime_error') }

function registerGlobalErrorHandlers() {
  window.addEventListener('error', (e)=> {
    track('runtime_error', {
      message: e.message,
      source: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack?.split('\n').slice(0,5).join('\n')
    })
  })
  window.addEventListener('unhandledrejection', (e)=> {
    track('runtime_error', {
      message: e.reason?.message || String(e.reason),
      isUnhandledRejection: true,
      stack: (e.reason && e.reason.stack) ? e.reason.stack.split('\n').slice(0,5).join('\n') : undefined
    })
  })
}

export function initAnalytics(screenId, options={}) {
  if (state.initialized) return state.initialized
  state.endpoint = normalizeEndpoint(options.endpoint || window.ANALYTICS_ENDPOINT)
  const rawSite = options.siteId || window.ANALYTICS_SITE_ID || null
  state.originalSiteId = rawSite
  state.siteId = rawSite ? String(rawSite).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') : null
  state.screenId = screenId
  state.startTime = performance.now()
  state.initialized = true
  if (!hasConfig()) {
    debugLog('[Analytics] No config (window.ANALYTICS_ENDPOINT & window.ANALYTICS_SITE_ID required) - analytics disabled')
    return false
  }
  registerGlobalErrorHandlers()
  debugLog('[Analytics] Initialized', { endpoint: state.endpoint, siteId: state.siteId, originalSiteId: state.originalSiteId, screenId })
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
  if (!state.initialized || !hasConfig()) return
  const scheduleNext = () => {
    const delay = msUntilNextMinute42()
    state.heartbeatTimer = setTimeout(() => {
      try {
        const ctx = typeof provider === 'function' ? provider() : {}
        track('heartbeat', {
          layoutId: ctx?.layoutId || null,
          uptimeSec: state.startTime ? Math.round((performance.now() - state.startTime)/1000) : null
        })
      } catch (e) {
        debugLog('[Analytics] Heartbeat emit failed', e)
      }
      scheduleNext()
    }, delay)
  }
  scheduleNext()
  debugLog('[Analytics] Heartbeat scheduling started (42nd minute each hour)')
}

export const analytics = { init: initAnalytics, track, startHourlyMinute42Heartbeat }
