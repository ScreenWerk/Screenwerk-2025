// Disclaimer: no semicolons, if unnecessary, are used in this project

/**
 * LayoutScheduler - Handles schedule evaluation and layout switching
 * 
 * Responsibilities:
 * - Evaluate crontab schedules to determine active layout
 * - Fetch configuration updates at specified intervals  
 * - Coordinate with player for layout changes
 * - Pure vanilla JS, browser-compatible
 */
export class LayoutScheduler {
    /**
     * Creates a new layout scheduler
     * @param {Object} options Configuration options
     * @param {string} options.configurationId - ID of configuration to manage
     * @param {Function} options.onLayoutChange - Callback when layout should change
     * @param {number} options.updateInterval - How often to check for config updates (ms)
     */
    constructor(options) {
        this.configurationId = options.configurationId
        this.onLayoutChange = options.onLayoutChange
        this.updateInterval = options.updateInterval || 60000 // Default 1 minute
        
        // Internal state
        this.configuration = null
        this.currentLayoutId = null
        this.evaluationTimer = null
        this.updateTimer = null
        this.isRunning = false
        
        // Debugging
        this.debugMode = window.debugMode || false
        
        this.log('LayoutScheduler initialized', { configurationId: this.configurationId })
    }
    
    /**
     * Start the scheduler - begins schedule evaluation and update checking
     */
    async start() {
        if (this.isRunning) {
            this.log('Scheduler already running')
            return
        }
        
        try {
            this.log('Starting scheduler...')
            await this.loadConfiguration()
            this.scheduleEvaluation()
            this.startUpdateTimer()
            this.isRunning = true
            this.log('Scheduler started successfully')
        } catch (error) {
            this.logError('Failed to start scheduler', error)
            throw error
        }
    }
    
    /**
     * Stop the scheduler - clears all timers
     */
    stop() {
        this.log('Stopping scheduler...')
        
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer)
            this.evaluationTimer = null
        }
        
        if (this.updateTimer) {
            clearInterval(this.updateTimer)
            this.updateTimer = null
        }
        
        this.isRunning = false
        this.log('Scheduler stopped')
    }
    
    /**
     * Load configuration from API
     */
    async loadConfiguration() {
        this.log('Loading configuration...')
        
        try {
            // For now, we'll use the existing data structure from the player
            // TODO: Replace with actual API call when available
            const response = await this.fetchConfigurationData()
            this.configuration = response
            
            this.log('Configuration loaded', { 
                schedules: this.configuration.schedules?.length || 0 
            })
            
            // Immediately evaluate schedules after loading
            this.evaluateSchedules()
            
        } catch (error) {
            this.logError('Failed to load configuration', error)
            throw error
        }
    }
    
    /**
     * Fetch configuration data - supports both publisher API and local data
     */
    async fetchConfigurationData() {
        // If configurationId looks like a screen ID (24 char hex), try publisher API first
        if (this.configurationId && this.configurationId.match(/^[0-9a-f]{24}$/)) {
            return await this.fetchFromPublisherAPI()
        }
        
        // Otherwise, try local data samples
        return await this.fetchFromLocalData()
    }
    
    /**
     * Fetch configuration from publisher API using screen ID
     */
    async fetchFromPublisherAPI() {
        try {
            // Import constants dynamically to avoid module loading issues
            const { SCREENWERK_PUBLISHER_API } = await import('../../common/config/constants.js')
            
            const apiUrl = `${SCREENWERK_PUBLISHER_API}${this.configurationId}.json`
            this.log('Fetching from publisher API', { url: apiUrl })
            
            const response = await fetch(apiUrl)
            if (!response.ok) {
                throw new Error(`Publisher API error: ${response.status} ${response.statusText}`)
            }
            
            const config = await response.json()
            
            this.log('Fetched configuration from publisher API', {
                configId: config.configurationEid,
                schedules: config.schedules?.length || 0,
                updateInterval: config.updateInterval,
                publishedAt: config.publishedAt
            })
            
            return config
            
        } catch (error) {
            this.logError('Failed to fetch from publisher API, trying local data', error)
            return await this.fetchFromLocalData()
        }
    }
    
    /**
     * Fetch configuration from local data samples
     */
    async fetchFromLocalData() {
        try {
            // Fetch real configuration data from data samples
            const response = await fetch('../public/assets/data_samples.json')
            if (!response.ok) {
                throw new Error(`Failed to fetch configuration: ${response.status}`)
            }
            
            const data = await response.json()
            
            // Extract the swPublisherConfiguration which has the real structure
            const config = data.swPublisherConfiguration
            
            if (!config) {
                throw new Error('No swPublisherConfiguration found in data samples')
            }
            
            this.log('Fetched configuration from local data', {
                configId: config.configurationEid,
                schedules: config.schedules?.length || 0,
                updateInterval: config.updateInterval
            })
            
            return config
            
        } catch (error) {
            this.logError('Failed to fetch local configuration data, falling back to mock', error)
            
            // Fallback to mock data if real data fails
            return {
                configurationEid: this.configurationId,
                updateInterval: 1,
                schedules: [
                    {
                        eid: 'fallback-schedule',
                        layoutEid: 'fallback-layout',
                        name: 'Fallback Layout',
                        crontab: '* * * * *',
                        ordinal: 1,
                        cleanup: true,
                        layoutPlaylists: []
                    }
                ]
            }
        }
    }
    
    /**
     * Get mock configuration as fallback
     */
    getMockConfiguration() {
        return {
            configurationEid: this.configurationId,
            updateInterval: 1,
            schedules: [
                {
                    eid: 'schedule1',
                    layoutEid: 'layout1',
                    name: 'Mock Layout (Fallback)',
                    crontab: '* * * * *',
                    ordinal: 1,
                    cleanup: true,
                    layoutPlaylists: [
                        {
                            eid: 'playlist1',
                            playlistEid: 'playlist1',
                            name: 'Mock Playlist',
                            left: 0,
                            top: 0,
                            width: 100,
                            height: 100,
                            zindex: 1,
                            loop: true,
                            playlistMedias: [
                                {
                                    playlistMediaEid: 'media1',
                                    mediaEid: 'media1',
                                    name: 'Mock Media Item',
                                    duration: 10,
                                    ordinal: 1,
                                    type: 'Image'
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }
    
    /**
     * Evaluate current schedules to determine active layout
     */
    evaluateSchedules() {
        if (!this.configuration || !this.configuration.schedules) {
            this.log('No configuration or schedules available for evaluation')
            return
        }
        
        const now = new Date()
        this.log('Evaluating schedules at', now.toISOString())
        
        // Find the active schedule based on crontab and ordinal
        const activeSchedule = this.findActiveSchedule(now)
        
        if (activeSchedule) {
            this.log('Active schedule found', { 
                schedule: activeSchedule.name,
                layoutEid: activeSchedule.layoutEid 
            })
            
            // Check if layout needs to change
            if (activeSchedule.layoutEid !== this.currentLayoutId) {
                this.log('Layout change required', {
                    from: this.currentLayoutId,
                    to: activeSchedule.layoutEid
                })
                this.loadLayoutAndNotify(activeSchedule)
            } else {
                this.log('Layout unchanged, continuing with current layout')
            }
        } else {
            this.log('No active schedule found for current time')
        }
    }
    
    /**
     * Find the active schedule for the given time
     * @param {Date} _currentTime - Time to evaluate schedules against (TODO: use for crontab evaluation)
     * @returns {Object|null} Active schedule or null if none found
     */
    findActiveSchedule(_currentTime) {
        if (!this.configuration.schedules) return null
        
        // Sort schedules by ordinal (priority)
        const sortedSchedules = [...this.configuration.schedules]
            .sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0))
        
        // For now, return the first schedule (simple implementation)
        // TODO: Implement proper crontab evaluation using @breejs/later
        const firstSchedule = sortedSchedules[0]
        
        if (firstSchedule) {
            this.log('Using first schedule (TODO: implement crontab evaluation)', {
                schedule: firstSchedule.name,
                crontab: firstSchedule.crontab
            })
        }
        
        return firstSchedule
    }
    
    /**
     * Load layout data and notify player of change
     * @param {Object} schedule - Schedule containing layout information
     */
    async loadLayoutAndNotify(schedule) {
        try {
            this.log('Loading layout for schedule', schedule.name)
            
            // Transform schedule data to simple layout structure
            const simplifiedLayout = this.transformToSimpleLayout(schedule)
            
            // Update current layout tracking
            this.currentLayoutId = schedule.layoutEid
            
            // Notify player of layout change
            if (this.onLayoutChange) {
                this.onLayoutChange(simplifiedLayout)
                this.log('Player notified of layout change')
            }
            
        } catch (error) {
            this.logError('Failed to load layout and notify player', error)
        }
    }
    
    /**
     * Transform complex schedule/configuration data to simple layout structure
     * @param {Object} schedule - Schedule data from configuration
     * @returns {Object} Simplified layout object for player
     */
    transformToSimpleLayout(schedule) {
        // Create simplified layout structure that player expects
        const layout = {
            id: schedule.layoutEid,
            name: schedule.name,
            width: schedule.width || 1920,  // Default dimensions
            height: schedule.height || 1080,
            regions: []
        }
        
        // Transform layoutPlaylists to regions
        if (schedule.layoutPlaylists) {
            layout.regions = schedule.layoutPlaylists.map(layoutPlaylist => ({
                id: layoutPlaylist.eid || layoutPlaylist.playlistEid,
                playlist: {
                    id: layoutPlaylist.playlistEid,
                    name: layoutPlaylist.name,
                    loop: layoutPlaylist.loop,
                    media: (layoutPlaylist.playlistMedias || []).map(media => ({
                        id: media.mediaEid || media.playlistMediaEid,
                        name: media.name,
                        duration: media.duration || 10,
                        type: media.type,
                        filename: media.fileName,
                        path: media.file, // The 'file' property contains the URL
                        url: media.file,  // Player expects 'url' property
                        width: media.width,
                        height: media.height
                    }))
                },
                left: layoutPlaylist.left || 0,
                top: layoutPlaylist.top || 0,
                width: layoutPlaylist.width || 100,
                height: layoutPlaylist.height || 100,
                zindex: layoutPlaylist.zindex || 0
            }))
        }
        
        this.log('Layout transformed', { 
            layoutId: layout.id,
            regions: layout.regions.length 
        })
        
        return layout
    }
    
    /**
     * Start periodic schedule evaluation
     */
    scheduleEvaluation() {
        // Evaluate schedules every minute
        this.evaluationTimer = setInterval(() => {
            this.evaluateSchedules()
        }, 60000)
        
        this.log('Schedule evaluation timer started (60s interval)')
    }
    
    /**
     * Start periodic configuration updates
     */
    startUpdateTimer() {
        if (this.updateInterval > 0) {
            this.updateTimer = setInterval(() => {
                this.log('Checking for configuration updates...')
                this.loadConfiguration()
            }, this.updateInterval)
            
            this.log('Configuration update timer started', { 
                interval: this.updateInterval 
            })
        }
    }
    
    /**
     * Logging utility
     */
    log(message, data = null) {
        if (this.debugMode) {
            const timestamp = new Date().toISOString()
            console.log(`[LayoutScheduler ${timestamp}] ${message}`, data || '')
        }
    }
    
    /**
     * Error logging utility
     */
    logError(message, error) {
        const timestamp = new Date().toISOString()
        console.error(`[LayoutScheduler ${timestamp}] ERROR: ${message}`, error)
    }
}
