// LocalStore.js (Feature 011) - localStorage caching for screenId + configuration

const KEY_SCREEN_ID = 'sw:screenId'
const CONFIG_PREFIX_V1 = 'sw:config:v1:'
const SCREEN_ID_RE = /^[0-9a-f]{24}$/

function isStorageAvailable() {
    try {
        if (typeof localStorage === 'undefined') return false
        const k = '__sw_test__'
        localStorage.setItem(k, '1')
        localStorage.removeItem(k)
        return true
    } catch {
        return false
    }
}

function log(...args) {
    if (typeof window !== 'undefined' && window.debugMode) {
        console.log('[LocalStore]', ...args)
    }
}
function warn(...args) {
    if (typeof window !== 'undefined' && window.debugMode) {
        console.warn('[LocalStore]', ...args)
    }
}

function buildConfigKey(id) {
    return `${CONFIG_PREFIX_V1}${id}`
}

export function saveScreenId(id) {
    if (!SCREEN_ID_RE.test(id) || !isStorageAvailable()) return false
    try {
        localStorage.setItem(KEY_SCREEN_ID, id)
        log('Saved screenId', id)
        return true
    } catch (e) {
        warn('Failed to save screenId', e)
        return false
    }
}

export function loadScreenId() {
    if (!isStorageAvailable()) return null
    try {
        const v = localStorage.getItem(KEY_SCREEN_ID)
        return (v && SCREEN_ID_RE.test(v)) ? v : null
    } catch (e) {
        warn('Failed to load screenId', e)
        return null
    }
}

function buildWrapper(screenId, config, serialized) {
    return {
        version: 1,
        screenId,
        savedAt: new Date().toISOString(),
        config,
        fingerprint: {
            schedules: Array.isArray(config.schedules) ? config.schedules.length : 0,
            size: serialized.length,
            configId: config.configurationEid || screenId
        }
    }
}

export function saveConfiguration(screenId, config) {
    if (!isStorageAvailable() || !SCREEN_ID_RE.test(screenId) || !config || typeof config !== 'object') return null
    try {
        const serialized = JSON.stringify(config)
        const wrapper = buildWrapper(screenId, config, serialized)
        localStorage.setItem(buildConfigKey(screenId), JSON.stringify(wrapper))
        log('Saved configuration', screenId, `schedules=${wrapper.fingerprint.schedules}`, `size=${wrapper.fingerprint.size}`)
        return wrapper
    } catch (e) {
        if (e && e.name === 'QuotaExceededError') warn('Quota exceeded while saving configuration')
        else warn('Failed to save configuration', e)
        return null
    }
}

function parseWrapper(screenId, raw) {
    try {
        const wrapper = JSON.parse(raw)
        if (!wrapper || wrapper.version !== 1) return null
        if (wrapper.screenId !== screenId) return null
        if (!wrapper.config || typeof wrapper.config !== 'object') return null
        return wrapper
    } catch (e) {
        warn('Corrupted configuration cache; clearing', screenId, e)
        try { localStorage.removeItem(buildConfigKey(screenId)) } catch {}
        return null
    }
}

export function loadConfiguration(screenId) {
    if (!SCREEN_ID_RE.test(screenId) || !isStorageAvailable()) return null
    let raw
    try {
        raw = localStorage.getItem(buildConfigKey(screenId))
    } catch (e) {
        warn('Failed to access storage', e)
        return null
    }
    if (!raw) return null
    return parseWrapper(screenId, raw)
}

export function clearConfiguration(screenId) {
    if (!SCREEN_ID_RE.test(screenId) || !isStorageAvailable()) return false
    try {
        localStorage.removeItem(buildConfigKey(screenId))
        log('Cleared configuration', screenId)
        return true
    } catch (e) {
        warn('Failed to clear configuration', e)
        return false
    }
}

export function clearAll() {
    if (!isStorageAvailable()) return 0
    let removed = 0
    try {
        for (const k of Object.keys(localStorage)) {
            if (k === KEY_SCREEN_ID || k.startsWith(CONFIG_PREFIX_V1)) {
                try { localStorage.removeItem(k); removed++ } catch {}
            }
        }
        log('Cleared all sw:* cached entries', removed)
    } catch (e) {
        warn('Failed during clearAll', e)
    }
    return removed
}

export function listCachedScreens() {
    if (!isStorageAvailable()) return []
    let keys
    try {
        keys = Object.keys(localStorage)
    } catch (e) {
        warn('List keys failed', e)
        return []
    }
    return keys
        .filter(isConfigCacheKey)
        .map(summaryFromKey)
        .filter(Boolean)
        .sort(sortBySavedAtDesc)
}

// Helper: determine if key is a cached configuration key
function isConfigCacheKey(k) {
    return k.startsWith(CONFIG_PREFIX_V1)
}

// Helper: produce summary object for a given storage key (or null)
function summaryFromKey(k) {
    let raw
    try {
        raw = localStorage.getItem(k)
    } catch {
        return null
    }
    if (!raw) return null
    const screenId = k.slice(CONFIG_PREFIX_V1.length)
    const wrapper = parseWrapper(screenId, raw)
    if (!wrapper) return null
    return {
        screenId: wrapper.screenId,
        schedules: wrapper.fingerprint?.schedules ?? (Array.isArray(wrapper.config?.schedules) ? wrapper.config.schedules.length : 0),
        savedAt: wrapper.savedAt
    }
}

// Helper: sort newest first
function sortBySavedAtDesc(a, b) {
    return a.savedAt < b.savedAt ? 1 : -1
}

export default {
    saveScreenId,
    loadScreenId,
    saveConfiguration,
    loadConfiguration,
    clearConfiguration,
    clearAll,
    listCachedScreens
}
