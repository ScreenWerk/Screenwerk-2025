/**
 * Clean Layout Schedul        this.configuration = null
        this.currentLayoutId = null
        this.isEvaluating = false // Prevent concurrent evaluations
        this.isLoadingConfiguration = false // Prevent concurrent configuration loading
        
        this.isRunning = false
        this.destroyed = false
        
        this.evaluationTimer = null
        this.pollingTimer = nulliguration and Schedule Management
 * 
 * Handles administrative concerns: configuration, scheduling, layout selection
 * Preloads all media before triggering player rendering
 */

import { debugLog } from '../../../../common/utils/debug-utils.js'
import { MediaService } from '../services/MediaService.js'

export class LayoutScheduler {
    /**
     * Create a clean layout scheduler
     * @param {string|Object} configurationId - ScreenWerk configuration ID (24-char hex string) or options object
     * @param {Function} onLayoutChange - Callback when layout changes (if first param is string)
     * @param {number} evaluationInterval - Schedule evaluation interval in ms (default: 30s)
     * @param {number} pollingInterval - Configuration polling interval in ms (default: 5min)
     */
    constructor(configurationId, onLayoutChange, evaluationInterval = 30000, pollingInterval = 300000) {
        // Parse constructor arguments
        const options = this.parseConstructorArgs(configurationId, onLayoutChange, evaluationInterval, pollingInterval)
        
        this.configurationId = options.configurationId
        this.onLayoutChange = options.onLayoutChange
        this.evaluationInterval = options.evaluationInterval
        this.pollingInterval = options.pollingInterval
        
        this.configuration = null
        this.currentLayoutId = null
        this.isEvaluating = false // Prevent concurrent evaluations
        
        this.isRunning = false
        this.destroyed = false
        
        this.evaluationTimer = null
        this.pollingTimer = null
        
        this.mediaService = new MediaService()
        this.mediaServiceReady = false

        debugLog('[Scheduler] Clean Layout Scheduler initialized', {
            configurationId: this.configurationId,
            evaluationInterval: this.evaluationInterval,
            pollingInterval: this.pollingInterval
        })
    }

    /**
     * Parse constructor arguments to handle both object and separate parameter styles
     * @param {string|Object} configurationId - Configuration ID or options object
     * @param {Function} onLayoutChange - Layout change callback
     * @param {number} evaluationInterval - Evaluation interval
     * @param {number} pollingInterval - Polling interval
     * @returns {Object} Parsed options
     * @private
     */
    parseConstructorArgs(configurationId, onLayoutChange, evaluationInterval, pollingInterval) {
        if (typeof configurationId === 'object' && configurationId !== null) {
            // Object style: new LayoutScheduler({ configurationId: "...", onLayoutChange: ... })
            const options = configurationId
            return {
                configurationId: options.configurationId,
                onLayoutChange: options.onLayoutChange || (() => {}),
                evaluationInterval: options.evaluationInterval || 30000,
                pollingInterval: options.pollingInterval || 300000
            }
        } else {
            // Separate parameters style: new LayoutScheduler("id", callback, 30000, 300000)
            return {
                configurationId: configurationId,
                onLayoutChange: onLayoutChange || (() => {}),
                evaluationInterval: evaluationInterval,
                pollingInterval: pollingInterval
            }
        }
    }    /**
     * Start the scheduler
     * @returns {Promise<boolean>} Success status
     */
    async start() {
        if (this.destroyed) {
            console.error('[Scheduler] Cannot start - scheduler is destroyed')
            return false
        }

        if (this.isRunning) {
            debugLog('[Scheduler] Already running')
            return true
        }

        try {
            debugLog('[Scheduler] Starting scheduler...')

            // Initialize media service first
            this.mediaServiceReady = await this.mediaService.initialize()
            if (this.mediaServiceReady) {
                debugLog('[Scheduler] Media service initialized successfully')
            }

            // Load initial configuration
            await this.loadConfiguration()

            // Start evaluation and polling
            this.startEvaluation()
            this.startConfigurationPolling()

            this.isRunning = true
            debugLog('[Scheduler] Scheduler started successfully')
            return true

        } catch (error) {
            console.error('[Scheduler] Failed to start:', error)
            return false
        }
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (!this.isRunning) {
            return
        }

        this.stopTimers()
        this.isRunning = false
        debugLog('[Scheduler] Scheduler stopped')
    }

    /**
     * Load configuration from API
     * @returns {Promise<void>}
     * @private
     */
    async loadConfiguration() {
        // Prevent concurrent configuration loading
        if (this.isLoadingConfiguration) {
            debugLog('[Scheduler] Configuration loading already in progress, skipping')
            return
        }

        try {
            this.isLoadingConfiguration = true
            debugLog(`[Scheduler] Loading configuration: ${this.configurationId}`)

            // Validate that we have a proper screen ID (24 char hex)
            if (!this.configurationId.match(/^[0-9a-f]{24}$/)) {
                throw new Error(`Invalid screen ID format: ${this.configurationId}. Must be 24-character hex string.`)
            }
            
            // Fetch from ScreenWerk Publisher API
            const configuration = await this.fetchFromPublisherAPI()

            this.configuration = configuration
            debugLog('[Scheduler] Configuration loaded successfully', {
                configId: configuration.configurationEid,
                schedules: configuration.schedules?.length || 0
            })

            // Don't evaluate immediately - let startEvaluation() handle it

        } catch (error) {
            console.error('[Scheduler] Failed to load configuration:', error)
            throw error
        } finally {
            this.isLoadingConfiguration = false
        }
    }

    /**
     * Fetch configuration from ScreenWerk Publisher API
     * @returns {Promise<Object>} Configuration object
     * @private
     */
    async fetchFromPublisherAPI() {
        // Import constants to get the API endpoint
        const { SCREENWERK_PUBLISHER_API } = await import('../../../../common/config/constants.js')
        
        const apiUrl = `${SCREENWERK_PUBLISHER_API}${this.configurationId}.json`
        debugLog(`[Scheduler] Fetching from Publisher API: ${apiUrl}`)
        
        const response = await fetch(apiUrl)
        if (!response.ok) {
            throw new Error(`Publisher API error: ${response.status} ${response.statusText}`)
        }

        const configuration = await response.json()
        
        debugLog('[Scheduler] Publisher API response received', {
            configId: configuration.configurationEid,
            schedules: configuration.schedules?.length || 0,
            updateInterval: configuration.updateInterval,
            publishedAt: configuration.publishedAt
        })

        return configuration
    }

    /**
     * Start schedule evaluation timer
     * @private
     */
    startEvaluation() {
        this.evaluationTimer = setInterval(async () => {
            await this.evaluateSchedules()
        }, this.evaluationInterval)

        // Evaluate immediately
        this.evaluateSchedules()
    }

    /**
     * Start configuration polling timer
     * @private
     */
    startConfigurationPolling() {
        debugLog(`[Scheduler] Starting configuration polling every ${this.pollingInterval}ms (${this.pollingInterval/1000}s)`)
        this.pollingTimer = setInterval(async () => {
            debugLog('[Scheduler] Configuration polling triggered')
            try {
                await this.loadConfiguration()
            } catch (error) {
                console.error('[Scheduler] Configuration polling failed:', error)
            }
        }, this.pollingInterval)
    }

    /**
     * Stop all timers
     * @private
     */
    stopTimers() {
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer)
            this.evaluationTimer = null
        }

        if (this.pollingTimer) {
            clearInterval(this.pollingTimer)
            this.pollingTimer = null
        }
    }

    /**
     * Evaluate current schedules and determine active layout
     * @private
     */
    async evaluateSchedules() {
        // Prevent concurrent evaluations (this is the real fix!)
        if (this.isEvaluating) {
            debugLog('[Scheduler] Evaluation already in progress, skipping')
            return
        }

        if (!this.configuration || !this.configuration.schedules) {
            debugLog('[Scheduler] No schedules to evaluate')
            return
        }

        try {
            this.isEvaluating = true
            const now = new Date()
            debugLog(`[Scheduler] Evaluating schedules at ${now.toISOString()}`)

            // Find the active schedule using cron evaluation
            const activeSchedule = this.findActiveSchedule(now)

            if (activeSchedule) {
                await this.processActiveSchedule(activeSchedule)
            } else {
                debugLog('[Scheduler] No active schedule found for current time')
            }

        } catch (error) {
            console.error('[Scheduler] Schedule evaluation failed:', error)
        } finally {
            this.isEvaluating = false
        }
    }

    /**
     * Find the most recent schedule that should be active using cron evaluation
     * @param {Date} currentTime - Current time
     * @returns {Object|null} Most recent schedule or null
     * @private
     */
    findActiveSchedule(currentTime) {
        if (!this.configuration.schedules || this.configuration.schedules.length === 0) {
            return null
        }

        debugLog(`[Scheduler] Evaluating schedules at ${currentTime.toISOString()}`)

        const validSchedules = this.getValidSchedules()
        if (!validSchedules.length) {
            debugLog('[Scheduler] No valid schedules with crontabs found')
            return null
        }

        return this.findMostRecentSchedule(validSchedules, currentTime)
    }

    /**
     * Get schedules with valid crontabs
     * @returns {Array} Valid schedules
     * @private
     */
    getValidSchedules() {
        return this.configuration.schedules.filter(schedule => {
            if (!schedule.crontab) {
                debugLog(`[Scheduler] Schedule ${schedule.eid} has no crontab, skipping`)
                return false
            }
            return true
        })
    }

    /**
     * Find the schedule with the most recent occurrence
     * @param {Array} validSchedules - Schedules to evaluate
     * @param {Date} currentTime - Current time
     * @returns {Object|null} Most recent schedule or null
     * @private
     */
    findMostRecentSchedule(validSchedules, currentTime) {
        let mostRecentSchedule = null
        let mostRecentTime = null

        for (const schedule of validSchedules) {
            const recentOccurrence = this.getMostRecentOccurrence(schedule, currentTime)
            
            if (recentOccurrence) {
                debugLog(`[Scheduler] Schedule "${schedule.name}": most recent occurrence at ${recentOccurrence.toISOString()}`)
                
                if (!mostRecentTime || recentOccurrence > mostRecentTime) {
                    mostRecentTime = recentOccurrence
                    mostRecentSchedule = schedule
                }
            } else {
                debugLog(`[Scheduler] Schedule "${schedule.name}": no recent occurrence found`)
            }
        }

        if (mostRecentSchedule) {
            debugLog(`[Scheduler] Most recent schedule: "${mostRecentSchedule.name}" at ${mostRecentTime.toISOString()}`)
            return mostRecentSchedule
        } else {
            debugLog('[Scheduler] No recent schedule occurrences found')
            return null
        }
    }

    /**
     * Get the most recent occurrence of a schedule before current time
     * @param {Object} schedule - Schedule to evaluate
     * @param {Date} currentTime - Current time
     * @returns {Date|null} Most recent occurrence or null
     * @private
     */
    getMostRecentOccurrence(schedule, currentTime) {
        if (!schedule.crontab) {
            return null
        }

        try {
            if (this.hasLaterJs()) {
                return this.getRecentOccurrenceWithLaterJs(schedule, currentTime)
            } else {
                return this.getRecentOccurrenceSimple(schedule, currentTime)
            }
        } catch (error) {
            console.error(`[Scheduler] Failed to get recent occurrence for schedule ${schedule.eid}:`, error)
            return null
        }
    }

    /**
     * Get recent occurrence using Later.js
     * @param {Object} schedule - Schedule to evaluate
     * @param {Date} currentTime - Current time
     * @returns {Date|null} Most recent occurrence or null
     * @private
     */
    getRecentOccurrenceWithLaterJs(schedule, currentTime) {
        const cronSchedule = window.later.parse.cron(schedule.crontab)
        
        // Get previous occurrences (Later.js returns most recent first)
        const previousOccurrences = window.later.schedule(cronSchedule).prev(10, currentTime)
        
        if (previousOccurrences && previousOccurrences.length > 0) {
            // Return the most recent occurrence (first in the array)
            return new Date(previousOccurrences[0])
        }
        
        return null
    }

    /**
     * Get recent occurrence using simple logic
     * @param {Object} schedule - Schedule to evaluate  
     * @param {Date} currentTime - Current time
     * @returns {Date|null} Most recent occurrence or null
     * @private
     */
    getRecentOccurrenceSimple(schedule, currentTime) {
        // Simple implementation for common patterns
        if (schedule.crontab === '* * * * *') {
            // Every minute - previous minute
            return new Date(currentTime.getTime() - 60000)
        }
        
        if (schedule.crontab === '0 * * * *') {
            // Every hour - previous hour
            const prevHour = new Date(currentTime)
            prevHour.setMinutes(0, 0, 0)
            if (prevHour >= currentTime) {
                prevHour.setHours(prevHour.getHours() - 1)
            }
            return prevHour
        }
        
        // For unknown patterns, return a reasonable fallback
        debugLog(`[Scheduler] Simple cron evaluation: unknown pattern "${schedule.crontab}", using 1 hour ago`)
        return new Date(currentTime.getTime() - (60 * 60 * 1000))
    }

    /**
     * Check if Later.js library is available
     * @returns {boolean} True if Later.js is available
     * @private
     */
    hasLaterJs() {
        return typeof window !== 'undefined' && window.later
    }

    /**
     * Process active schedule and trigger layout change if needed
     * @param {Object} schedule - Active schedule
     * @private
     */
    async processActiveSchedule(schedule) {
        const layoutId = schedule.layoutEid || schedule.layoutId

        if (!layoutId) {
            console.error('[Scheduler] Schedule missing layout ID')
            return
        }

        if (layoutId === this.currentLayoutId) {
            // No change needed
            return
        }

        debugLog(`[Scheduler] Layout change: ${this.currentLayoutId} → ${layoutId}`)
        
        try {
            const layout = this.transformScheduleToLayout(schedule)
            
            // Preload all media before triggering layout change
            await this.preloadLayoutMedia(layout)
            
            this.currentLayoutId = layoutId
            this.onLayoutChange(layout)
            
        } catch (error) {
            console.error('[Scheduler] Failed to process layout change:', error)
        }
    }

    /**
     * Preload all media for a layout
     * @param {Object} layout - Layout to preload media for
     * @returns {Promise<void>}
     * @private
     */
    async preloadLayoutMedia(layout) {
        if (!this.mediaServiceReady) {
            debugLog('[Scheduler] Media service not ready, skipping preload')
            return
        }

        debugLog(`[Scheduler] Preloading media for layout: ${layout.name}`)
        
        // Extract all media URLs from the layout
        const mediaUrls = this.mediaService.extractMediaUrls(layout)
        
        if (mediaUrls.length === 0) {
            debugLog('[Scheduler] No media URLs found to preload')
            return
        }

        debugLog(`[Scheduler] Found ${mediaUrls.length} media items to preload`)
        
        // Send URLs to service worker for caching
        this.mediaService.cacheMediaUrls(mediaUrls)
        
        // Wait a moment for service worker to start caching
        // Note: This is non-blocking - service worker caches in background
        await new Promise(resolve => setTimeout(resolve, 100))
        
        debugLog('[Scheduler] Media preloading initiated')
    }

    /**
     * Transform schedule data to simple layout object for player
     * @param {Object} schedule - Schedule from configuration
     * @returns {Object} Simple layout object
     * @private
     */
    transformScheduleToLayout(schedule) {
        debugLog(`[Scheduler] Transforming schedule to layout: ${schedule.name}`)
        
        return {
            id: schedule.layoutEid || schedule.eid || 'unknown-layout',
            name: schedule.name || `Layout ${schedule.layoutEid || schedule.eid}`,
            width: schedule.layoutWidth || 1920,
            height: schedule.layoutHeight || 1080,
            regions: this.transformRegions(schedule.layoutPlaylists || [])
        }
    }

    /**
     * Transform layout playlists to regions
     * @param {Array} layoutPlaylists - Layout playlists from schedule
     * @returns {Array} Region objects for player
     * @private
     */
    transformRegions(layoutPlaylists) {
        debugLog(`[Scheduler] Transforming ${layoutPlaylists.length} regions`)
        
        return layoutPlaylists.map((layoutPlaylist, index) => 
            this.createRegionObject(layoutPlaylist, index)
        )
    }

    /**
     * Create a single region object
     * @param {Object} layoutPlaylist - Layout playlist data
     * @param {number} index - Region index
     * @returns {Object} Region object
     * @private
     */
    createRegionObject(layoutPlaylist, index) {
        const regionId = layoutPlaylist.regionEid || layoutPlaylist.eid || `region_${index}`
        const position = this.extractRegionPosition(layoutPlaylist)
        const playlist = this.createPlaylistObject(layoutPlaylist)

        debugLog(`[Scheduler] Created region: ${regionId}`, position)

        return {
            id: regionId,
            name: layoutPlaylist.regionName || layoutPlaylist.name || `Region ${index + 1}`,
            ...position,
            playlist
        }
    }

    /**
     * Extract region positioning data
     * @param {Object} layoutPlaylist - Layout playlist data
     * @returns {Object} Position object
     * @private
     */
    extractRegionPosition(layoutPlaylist) {
        // Debug: Log available properties to understand API structure
        const availableProps = Object.keys(layoutPlaylist)
        console.log('🔍 Available region properties:', availableProps)
        console.log('🔍 Raw region data:', layoutPlaylist)
        
        // Check if inPixels flag indicates pixel vs percentage positioning
        const inPixels = layoutPlaylist.inPixels || false
        
        // Get positioning values directly from API
        const left = this.getRegionProperty(layoutPlaylist, ['left'], 0)
        const top = this.getRegionProperty(layoutPlaylist, ['top'], 0)
        const width = this.getRegionProperty(layoutPlaylist, ['width'], 100)
        const height = this.getRegionProperty(layoutPlaylist, ['height'], 100)
        const zindex = this.getRegionProperty(layoutPlaylist, ['zindex'], 1)
        
        const position = {
            left,
            top,
            width,
            height,
            zindex,
            isPercentage: !inPixels  // If not inPixels, treat as percentages
        }
        
        console.log('🔍 Extracted position:', position)
        console.log('🔍 Position mode:', inPixels ? 'pixels' : 'percentages')
        return position
    }

    /**
     * Get region property with fallback
     * @param {Object} obj - Object to search
     * @param {Array} keys - Keys to try
     * @param {any} defaultValue - Default value
     * @returns {any} Property value
     * @private
     */
    getRegionProperty(obj, keys, defaultValue) {
        for (const key of keys) {
            if (obj[key] !== undefined) {
                return obj[key]
            }
        }
        return defaultValue
    }

    /**
     * Create playlist object for region
     * @param {Object} layoutPlaylist - Layout playlist data
     * @returns {Object} Playlist object
     * @private
     */
    createPlaylistObject(layoutPlaylist) {
        const playlistId = layoutPlaylist.playlistEid || layoutPlaylist.eid || 'unknown-playlist'
        const mediaItems = this.transformMedia(layoutPlaylist.playlistMedias || [])
        
        debugLog(`[Scheduler] Created playlist: ${playlistId} with ${mediaItems.length} media items`)
        
        return {
            id: playlistId,
            name: layoutPlaylist.playlistName || layoutPlaylist.name || 'Unnamed Playlist',
            mediaItems,
            loop: true // Default to looping
        }
    }

    /**
     * Transform media items for playlist
     * @param {Array} playlistMedias - Media items from playlist
     * @returns {Array} Transformed media objects
     * @private
     */
    transformMedia(playlistMedias) {
        return playlistMedias.map((media, index) => this.createMediaObject(media, index))
    }

    /**
     * Create a single media object
     * @param {Object} media - Media data from playlist
     * @param {number} index - Media index
     * @returns {Object} Media object
     * @private
     */
    createMediaObject(media, index) {
        return this.buildMediaObject(media, index)
    }

    /**
     * Build media object with all properties
     * @param {Object} media - Media data
     * @param {number} index - Media index
     * @returns {Object} Complete media object
     * @private
     */
    buildMediaObject(media, index) {
        const basicProps = this.getMediaBasicProps(media, index)
        const mediaProps = this.getMediaDisplayProps(media)
        const validationProps = this.getMediaValidationProps(media)
        
        return {
            ...basicProps,
            ...mediaProps,
            ...validationProps,
            originalData: media
        }
    }

    /**
     * Get basic media properties
     * @param {Object} media - Media data
     * @param {number} index - Media index
     * @returns {Object} Basic properties
     * @private
     */
    getMediaBasicProps(media, index) {
        const mediaUrl = this.getMediaProperty(media, ['fileDO', 'url', 'file'], '')
        
        return {
            id: this.getMediaProperty(media, ['mediaEid', 'eid'], `media_${index}`),
            name: media.name || `Media ${index + 1}`,
            type: media.type || 'unknown',
            uri: mediaUrl, // BaseMedia expects 'uri' not 'url'
            url: mediaUrl  // Keep both for compatibility
        }
    }

    /**
     * Get media display properties
     * @param {Object} media - Media data
     * @returns {Object} Display properties
     * @private
     */
    getMediaDisplayProps(media) {
        return {
            duration: media.duration || 10,
            ordinal: media.ordinal || 1
            // mute property removed - always mute media by default
            // stretch property removed - always stretch images by default
        }
    }

    /**
     * Get media validation properties
     * @param {Object} media - Media data
     * @returns {Object} Validation properties
     * @private
     */
    getMediaValidationProps(media) {
        return {
            validFrom: media.validFrom || null,
            validTo: media.validTo || null
        }
    }

    /**
     * Get media property with fallback
     * @param {Object} media - Media object
     * @param {Array} keys - Keys to try
     * @param {any} defaultValue - Default value
     * @returns {any} Property value
     * @private
     */
    getMediaProperty(media, keys, defaultValue) {
        for (const key of keys) {
            if (media[key] !== undefined) {
                return media[key]
            }
        }
        return defaultValue
    }

    /**
     * Destroy the scheduler and clean up resources
     */
    destroy() {
        if (this.destroyed) {
            return
        }

        this.stop()
        this.configuration = null
        this.currentLayoutId = null
        this.destroyed = true

        debugLog('[Scheduler] Scheduler destroyed')
    }

    /**
     * Get current scheduler state
     * @returns {Object} Scheduler state information
     */
    getState() {
        return {
            isRunning: this.isRunning,
            configurationId: this.configurationId,
            currentLayoutId: this.currentLayoutId,
            hasConfiguration: !!this.configuration,
            destroyed: this.destroyed
        }
    }
}
