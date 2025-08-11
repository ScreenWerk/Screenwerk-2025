// Shared debug utilities used by both player and dashboard.
// Keep this minimal; ask before adding new shared helpers.
export function debugLog(message, debugMode = true) {
    if (!debugMode) return
    if (typeof message === 'object') {
        console.log('%c[DEBUG]', '', message)
    } else {
        console.log(`%c[DEBUG] ${message}`, '')
    }
}
