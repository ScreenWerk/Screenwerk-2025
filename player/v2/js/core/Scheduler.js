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

            // TODO: Replace with actual API endpoint
            const response = await fetch(`/api/configuration/${this.configurationId}`)
            
            if (!response.ok) {
                throw new Error(`Configuration API error: ${response.status}`)
            }

            const configuration = await response.json()
            this.configuration = configuration

            debugLog('[Scheduler] Configuration loaded successfully')

            // Immediately evaluate schedules after loading
            this.evaluateSchedules()

        } catch (error) {
            console.error('[Scheduler] Failed to load configuration:', error)
            throw error
        }
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

            // TODO: Implement proper cron-based schedule evaluation
            // For now, use first available schedule
            const activeSchedule = this.findActiveSchedule(now)

            if (activeSchedule) {
                this.processActiveSchedule(activeSchedule)
            } else {
                debugLog('[Scheduler] No active schedule found')
            }

        } catch (error) {
            console.error('[Scheduler] Schedule evaluation failed:', error)
        }
    }

    /**
     * Find active schedule for current time
     * @param {Date} _currentTime - Current time (unused in simple implementation)
     * @returns {Object|null} Active schedule or null
     * @private
     */
    findActiveSchedule(_currentTime) {
        // Simple implementation: return first schedule
        // TODO: Implement proper cron evaluation with @breejs/later
        return this.configuration.schedules[0] || null
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
        return {
            id: schedule.layoutEid || schedule.layoutId,
            name: schedule.name || `Layout ${schedule.layoutEid}`,
            width: schedule.width || 1920,
            height: schedule.height || 1080,
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
        const regionId = layoutPlaylist.eid || layoutPlaylist.id || `region_${index}`
        const position = this.extractRegionPosition(layoutPlaylist)
        const playlist = this.createPlaylistObject(layoutPlaylist)

        return {
            id: regionId,
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
            left: layoutPlaylist.left || 0,
            top: layoutPlaylist.top || 0,
            width: layoutPlaylist.width || 100,
            height: layoutPlaylist.height || 100,
            zindex: layoutPlaylist.zindex || 0
        }
    }

    /**
     * Create playlist object for region
     * @param {Object} layoutPlaylist - Layout playlist data
     * @returns {Object} Playlist object
     * @private
     */
    createPlaylistObject(layoutPlaylist) {
        return {
            id: layoutPlaylist.playlistEid || layoutPlaylist.playlistId,
            name: layoutPlaylist.name || 'Playlist',
            media: this.transformMedia(layoutPlaylist.playlistMedias || [])
        }
    }

    /**
     * Transform playlist medias to media objects
     * @param {Array} playlistMedias - Playlist medias from layout playlist
     * @returns {Array} Media objects for player
     * @private
     */
    transformMedia(playlistMedias) {
        return playlistMedias.map(media => ({
            id: media.mediaEid || media.id,
            name: media.name || 'Media',
            type: media.type || 'Image',
            duration: media.duration || 5,
            url: media.fileDO || media.file || media.url,
            ordinal: media.ordinal || 1
        }))
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
