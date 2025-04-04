export function debugLog(message, debugMode = true) {
    if (debugMode) {
        if (typeof message === 'object') {
            console.log('%c[DEBUG]', 'background:#333; color:#bada55', message)
        } else {
            console.log(`%c[DEBUG] ${message}`, 'background:#333; color:#bada55')
        }
    }
}
