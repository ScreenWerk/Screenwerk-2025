/**
 * Dashboard configuration settings
 */
export const ENVIRONMENT = 'production' // Set to 'production' for production environment

export const DEBUG = {
    // In development, we can filter to a specific configuration for testing
    CONFIGURATION_ID: ENVIRONMENT === 'test' 
        ? '5da5a2944ecca5c17a596cb0' 
        : '',
    
    // Enable extended logging in development mode
    ENABLE_LOGGING: typeof process !== 'undefined' && process.env.NODE_ENV === 'development',
    
    // Maximum concurrent requests
    MAX_CONCURRENT_REQUESTS: 10,
    
    // Configure polling interval (in milliseconds) if needed
    POLLING_INTERVAL: 60000
}

/**
 * Export configuration methods
 */
export const CONFIG = {
    /**
     * Get configuration setting with optional default
     */
    get: function(key, defaultValue = null) {
        return DEBUG[key] !== undefined ? DEBUG[key] : defaultValue
    },
    
    /**
     * Check if we're in development mode
     */
    isDevelopment: function() {
        return this.get('ENABLE_LOGGING', false)
    }
}
