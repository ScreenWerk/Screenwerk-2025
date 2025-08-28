/**
 * Clean Layout Scheduler / Schedule Management
 *
 * Responsibilities:
 *  - Load & poll configuration
 *  - Periodically evaluate schedules to determine active layout
 *  - Transform active schedule to simple layout object
 *  - Preload all media for the layout before notifying player
 *
 * Orchestrator only: heavy logic lives in extracted helper modules under core/scheduler.
 */

import { debugLog } from '../../../shared/utils/debug-utils.js'
import { MediaService } from '../services/MediaService.js'
// Extracted helper modules (Phase A)
import { transformScheduleToLayout } from './scheduler/LayoutTransformer.js'
import { fetchConfiguration } from './scheduler/ConfigurationLoader.js'
import { preloadLayoutMedia } from './scheduler/Preloader.js'
import { evaluateSchedules } from './scheduler/EvaluationEngine.js'
import { initAnalytics, track as trackAnalytics, startHourlyMinute42Heartbeat } from '../analytics/Analytics.js'
// Optional local configuration cache (Feature 011)
let LocalStore = null
try {
    // Dynamic import pattern kept minimal to avoid hard failure if file missing
    LocalStore = await import('../storage/LocalStore.js')
} catch {
    LocalStore = null
}

export class LayoutScheduler {
    /**
     * Create a clean layout scheduler
     * @param {string|Object} configurationId - ScreenWerk configuration ID (24-char hex string) or options object
     * @param {Function} onLayoutChange - Callback when layout changes (if first param is string)
     * @param {number} evaluationInterval - Schedule evaluation interval in ms (default: 30s)
     * @param {number} pollingInterval - Configuration polling interval in ms (default: 5min)
     */
    constructor(configurationId, onLayoutChange, evaluationInterval = 30000, pollingInterval = 300000) {
        const options = this.parseConstructorArgs(configurationId, onLayoutChange, evaluationInterval, pollingInterval)
        this.configurationId = options.configurationId
        this.onLayoutChange = options.onLayoutChange
        this.evaluationInterval = options.evaluationInterval
        this.pollingInterval = options.pollingInterval
        this.configuration = null
        this.currentLayoutId = null
        this.isEvaluating = false
        this.isLoadingConfiguration = false
        this.isRunning = false
        this.destroyed = false
        this.evaluationTimer = null
        this.pollingTimer = null
        this.mediaService = new MediaService()
        this.mediaServiceReady = false
        try { initAnalytics(this.configurationId) } catch (e) { debugLog('[Scheduler] Analytics init failed', e) }
        this.warmLoaded = this.tryWarmLoad()
        debugLog('[Scheduler] Clean Layout Scheduler initialized', {
            configurationId: this.configurationId,
            evaluationInterval: this.evaluationInterval,
            pollingInterval: this.pollingInterval,
            warmLoaded: this.warmLoaded
        })
    }

    tryWarmLoad() {
        if (!LocalStore || !/^[0-9a-f]{24}$/.test(this.configurationId)) return false
        try {
            const cached = LocalStore.loadConfiguration(this.configurationId)
            if (cached && cached.config) {
                this.configuration = cached.config
                debugLog('[Scheduler] Warm-loaded cached configuration', {
                    configurationId: this.configurationId,
                    schedules: cached.fingerprint?.schedules
                })
                return true
            }
        } catch (e) {
            debugLog('[Scheduler] Warm-load failed', e)
        }
        return false
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
                onLayoutChange: options.onLayoutChange || (() => { }),
                evaluationInterval: options.evaluationInterval || 30000,
                pollingInterval: options.pollingInterval || 300000
            }
        } else {
            // Separate parameters style: new LayoutScheduler("id", callback, 30000, 300000)
            return {
                configurationId: configurationId,
                onLayoutChange: onLayoutChange || (() => { }),
                evaluationInterval: evaluationInterval,
                pollingInterval: pollingInterval
            }
        }
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

            // Initialize media service first
            this.mediaServiceReady = await this.mediaService.initialize()
            if (this.mediaServiceReady) {
                debugLog('[Scheduler] Media service initialized successfully')
            }

            // Load initial configuration (allow immediate evaluation if warm-loaded)
            if (this.warmLoaded && this.configuration) {
                debugLog('[Scheduler] Using warm-loaded configuration; refreshing in background')
                // Fire off background refresh without blocking initial start/evaluation
                this.loadConfiguration().catch(err => console.error('[Scheduler] Background config refresh failed', err))
            } else {
                await this.loadConfiguration()
            }

            // Start evaluation and polling (evaluation may use warm-loaded config immediately)
            this.startEvaluation()
            this.startConfigurationPolling()
            // Start heartbeat (42nd minute scheduling) passing provider for current layout
            try { startHourlyMinute42Heartbeat(() => ({ layoutId: this.currentLayoutId })) } catch { /* ignore */ }

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

            const configuration = await fetchConfiguration(this.configurationId)

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

    // (Configuration fetch logic lives in ConfigurationLoader.js)

    /**
     * Start schedule evaluation timer
     * @private
     */
    startEvaluation() {
        this.evaluationTimer = setInterval(async () => {
            await evaluateSchedules(this)
        }, this.evaluationInterval)
        evaluateSchedules(this)
    }

    /**
     * Manually trigger a schedule evaluation (public API for demo/testing)
     */
    async evaluateNow() {
        return evaluateSchedules(this)
    }

    /**
     * Start configuration polling timer
     * @private
     */
    startConfigurationPolling() {
        debugLog(`[Scheduler] Starting configuration polling every ${this.pollingInterval}ms (${this.pollingInterval / 1000}s)`)
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

    // (Schedule evaluation handled by EvaluationEngine)

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
            // No change needed; explicit debug for visibility
            debugLog('[Scheduler] Layout unchanged, skipping reload', { layoutId })
            return
        }

        debugLog(`[Scheduler] Layout change: ${this.currentLayoutId} → ${layoutId}`)

        try {
            const layout = transformScheduleToLayout(schedule)

            // Preload all media before triggering layout change
            await this.preloadLayoutMedia(layout)

            this.currentLayoutId = layoutId
            this.onLayoutChange(layout)
            // Emit layout_start analytics event
            try { trackAnalytics('layout_start', { layoutId, scheduleId: schedule.eid || schedule._id }) } catch { /* swallow */ }

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
    async preloadLayoutMedia(layout) { return preloadLayoutMedia(layout, this.mediaService, this.mediaServiceReady) }

    // (Layout/media transformation handled by transformer modules)

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
