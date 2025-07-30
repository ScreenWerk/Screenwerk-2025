/**
 * Clean Layout Scheduler - Configuration and Schedule Management
 * 
 * Handles administrative concerns: configuration, scheduling, layout selection
 * No rendering concerns, coordinates with Player through callbacks
 */

import { debugLog } from '../../../common/utils/debug-utils.js'

export class LayoutScheduler {
    /**
     * Create a new clean scheduler instance
     * @param {Object} options - Scheduler configuration
     * @param {string} options.configurationId - Configuration ID for API
     * @param {Function} options.onLayoutChange - Callback when layout changes
     * @param {number} [options.evaluationInterval] - Schedule evaluation interval in ms
     * @param {number} [options.configurationInterval] - Config polling interval in ms
     */
    constructor(options) {
        if (!options || !options.configurationId) {
            throw new Error('Scheduler requires configurationId')
        }

        if (!options.onLayoutChange || typeof options.onLayoutChange !== 'function') {
            throw new Error('Scheduler requires onLayoutChange callback')
        }

        this.configurationId = options.configurationId
        this.onLayoutChange = options.onLayoutChange
        this.evaluationInterval = options.evaluationInterval || 60000 // 1 minute
        this.configurationInterval = options.configurationInterval || 300000 // 5 minutes

        // Internal state
        this.configuration = null
        this.currentLayoutId = null
        this.isRunning = false
        this.destroyed = false

        // Timers
        this.evaluationTimer = null
        this.configurationTimer = null

        debugLog('[Scheduler] Clean Layout Scheduler initialized')
    }

    /**
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
        try {
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

            // Immediately evaluate schedules after loading
            this.evaluateSchedules()

        } catch (error) {
            console.error('[Scheduler] Failed to load configuration:', error)
            throw error
        }
    }

    /**
     * Fetch configuration from ScreenWerk Publisher API
     * @returns {Promise<Object>} Configuration object
     * @private
     */
    async fetchFromPublisherAPI() {
        // Import constants to get the API endpoint
        const { SCREENWERK_PUBLISHER_API } = await import('../../../common/config/constants.js')
        
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
        this.evaluationTimer = setInterval(() => {
            this.evaluateSchedules()
        }, this.evaluationInterval)

        // Evaluate immediately
        this.evaluateSchedules()
    }

    /**
     * Start configuration polling timer
     * @private
     */
    startConfigurationPolling() {
        this.configurationTimer = setInterval(async () => {
            try {
                await this.loadConfiguration()
            } catch (error) {
                console.error('[Scheduler] Configuration polling failed:', error)
            }
        }, this.configurationInterval)
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

        if (this.configurationTimer) {
            clearInterval(this.configurationTimer)
            this.configurationTimer = null
        }
    }

    /**
     * Evaluate current schedules and determine active layout
     * @private
     */
    evaluateSchedules() {
        if (!this.configuration || !this.configuration.schedules) {
            debugLog('[Scheduler] No schedules to evaluate')
            return
        }

        try {
            const now = new Date()
            debugLog(`[Scheduler] Evaluating schedules at ${now.toISOString()}`)

            // Find the active schedule using cron evaluation
            const activeSchedule = this.findActiveSchedule(now)

            if (activeSchedule) {
                this.processActiveSchedule(activeSchedule)
            } else {
                debugLog('[Scheduler] No active schedule found for current time')
            }

        } catch (error) {
            console.error('[Scheduler] Schedule evaluation failed:', error)
        }
    }

    /**
     * Find active schedule for current time using cron evaluation
     * @param {Date} currentTime - Current time
     * @returns {Object|null} Active schedule or null
     * @private
     */
    findActiveSchedule(currentTime) {
        if (!this.configuration.schedules || this.configuration.schedules.length === 0) {
            return null
        }

        // Sort schedules by ordinal (priority)
        const sortedSchedules = [...this.configuration.schedules].sort((a, b) => 
            (a.ordinal || 999) - (b.ordinal || 999)
        )

        // Use Later.js to evaluate cron expressions
        for (const schedule of sortedSchedules) {
            if (this.isScheduleActive(schedule, currentTime)) {
                debugLog(`[Scheduler] Active schedule found: ${schedule.name} (${schedule.eid})`)
                return schedule
            }
        }

        // No active schedule found
        debugLog('[Scheduler] No schedule matches current time')
        return null
    }

    /**
     * Check if a schedule is active at the given time
     * @param {Object} schedule - Schedule to check
     * @param {Date} currentTime - Time to check against
     * @returns {boolean} True if schedule is active
     * @private
     */
    isScheduleActive(schedule, currentTime) {
        if (!schedule.crontab) {
            debugLog(`[Scheduler] Schedule ${schedule.eid} has no crontab, considering inactive`)
            return false
        }

        try {
            // Use Later.js if available
            if (this.hasLaterJs()) {
                return this.evaluateWithLaterJs(schedule, currentTime)
            } else {
                // Fallback to simple cron matching
                return this.simpleCronMatch(schedule.crontab)
            }
        } catch (error) {
            console.error(`[Scheduler] Cron evaluation failed for schedule ${schedule.eid}:`, error)
            return false
        }
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
     * Evaluate schedule using Later.js
     * @param {Object} schedule - Schedule to evaluate
     * @param {Date} currentTime - Current time
     * @returns {boolean} True if schedule is active
     * @private
     */
    evaluateWithLaterJs(schedule, currentTime) {
        const cronSchedule = window.later.parse.cron(schedule.crontab)
        const nextOccurrence = window.later.schedule(cronSchedule).next(2, currentTime)
        
        if (nextOccurrence && nextOccurrence.length > 0) {
            const scheduleStart = new Date(nextOccurrence[0])
            const scheduleEnd = nextOccurrence[1] ? new Date(nextOccurrence[1]) : new Date(scheduleStart.getTime() + 60000)
            
            const isActive = currentTime >= scheduleStart && currentTime < scheduleEnd
            debugLog(`[Scheduler] Cron evaluation for ${schedule.name}: ${isActive ? 'ACTIVE' : 'inactive'}`)
            return isActive
        }
        
        return false
    }

    /**
     * Simple cron matching fallback (basic implementation)
     * @param {string} crontab - Cron expression
     * @returns {boolean} True if matches
     * @private
     */
    simpleCronMatch(crontab) {
        // Very basic implementation for common patterns
        if (crontab === '* * * * *') {
            return true // Every minute - always active
        }
        
        // For unknown patterns, fail rather than assume active
        debugLog(`[Scheduler] Unknown cron pattern "${crontab}" - cannot evaluate without Later.js`)
        return false
    }

    /**
     * Process active schedule and trigger layout change if needed
     * @param {Object} schedule - Active schedule
     * @private
     */
    processActiveSchedule(schedule) {
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
            this.currentLayoutId = layoutId
            this.onLayoutChange(layout)
            
        } catch (error) {
            console.error('[Scheduler] Failed to process layout change:', error)
        }
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
        return {
            left: this.getRegionProperty(layoutPlaylist, ['regionLeft', 'left'], 0),
            top: this.getRegionProperty(layoutPlaylist, ['regionTop', 'top'], 0),
            width: this.getRegionProperty(layoutPlaylist, ['regionWidth', 'width'], 400),
            height: this.getRegionProperty(layoutPlaylist, ['regionHeight', 'height'], 300),
            zindex: this.getRegionProperty(layoutPlaylist, ['regionZindex', 'zindex'], 1)
        }
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
        const media = this.transformMedia(layoutPlaylist.playlistMedias || [])
        
        debugLog(`[Scheduler] Created playlist: ${playlistId} with ${media.length} media items`)
        
        return {
            id: playlistId,
            name: layoutPlaylist.playlistName || layoutPlaylist.name || 'Unnamed Playlist',
            media
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
        return {
            id: this.getMediaProperty(media, ['mediaEid', 'eid'], `media_${index}`),
            name: media.name || `Media ${index + 1}`,
            type: media.type || 'unknown',
            url: this.getMediaProperty(media, ['fileDO', 'url', 'file'], '')
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
            ordinal: media.ordinal || 1,
            mute: media.mute || false,
            stretch: media.stretch || false
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
