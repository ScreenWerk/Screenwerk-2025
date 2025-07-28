import { fetchEntity, fetchChildEntities, transformEntity, hasEntuProperty, getFirstReferenceValue, fetchEntitiesByType } from '../utils/entu-utils.js'
import { getPublisherFilesApiUrl } from '../config/constants.js'

/**
 * Fetches and validates the raw configuration entity
 * @param {string} configurationId - The configuration ID to fetch
 * @param {Object} result - The result object for errors/warnings
 * @returns {Promise<Object|null>} - The raw configuration or null if invalid
 */
async function fetchAndValidateConfiguration(configurationId, result) {
    const rawConfiguration = await fetchEntity(configurationId, {
        props: ['name.string', 'published.datetime', '_parent.reference', '_parent.string']
    })
    
    if (!rawConfiguration) {
        console.warn(`Failed to fetch configuration: ${configurationId}`)
        result.errors.push(`Failed to fetch configuration: ${configurationId}`)
        return null
    }
    
    // Add customer information
    rawConfiguration.customer = {
        _id: rawConfiguration._parent?.[0]?.reference,
        name: rawConfiguration._parent?.[0]?.string || 'Unknown Customer'
    }
    
    return rawConfiguration
}

/**
 * Processes configuration and adds referring screen groups
 * @param {Object} rawConfiguration - The raw configuration entity
 * @param {string} configurationId - The configuration ID
 * @param {Object} result - The result object for errors/warnings
 * @returns {Promise<Object|null>} - The processed configuration or null if invalid
 */
async function processConfigurationWithScreenGroups(rawConfiguration, configurationId, result) {
    const configuration = await processConfiguration(rawConfiguration, result)
    if (configuration === null) {
        console.warn(`Configuration ${configurationId} is invalid or has no schedules`)
        result.errors.push(`Configuration ${configurationId} is invalid or has no schedules`)
        return null
    }
    
    // Add referring screen groups
    configuration.referringScreenGroups = await fetchReferringScreenGroups(configurationId)
    
    return configuration
}

/**
 * Recursively fetches and transforms a configuration entity from Entu
 * @param {string} configurationId - The ID of the configuration to fetch
 * @returns {Promise<Object>} - The processed configuration with errors and warnings
 */
export async function getConfigurationById(configurationId) {
    const result = {
        configuration: null,
        errors: [],
        warnings: []
    }

    try {
        // Fetch and validate the raw configuration
        const rawConfiguration = await fetchAndValidateConfiguration(configurationId, result)
        if (!rawConfiguration) return result
        
        // Process configuration and add screen groups
        result.configuration = await processConfigurationWithScreenGroups(rawConfiguration, configurationId, result)
        
        return result
    } catch (error) {
        console.error(`Error fetching configuration ${configurationId}:`, error)
        result.errors.push(`Error fetching configuration ${configurationId}: ${error.message}`)
        return result
    }
}

/**
 * Fetches screens for a screen group and converts to dictionary
 * @param {string} screenGroupId - The screen group ID
 * @returns {Promise<Object>} - Dictionary of screens by ID
 */
async function fetchScreensForScreenGroup(screenGroupId) {
    const screens = await fetchEntitiesByType('sw_screen', {
        props: ['name.string', '_parent.reference'],
        filterProperty: 'screen_group.reference',
        filterValue: screenGroupId
    })

    const screenDict = {}
    for (const screen of screens) {
        screenDict[screen._id] = {
            _id: screen._id,
            name: screen.name?.[0]?.string || 'Unnamed Screen'
        }
    }
    
    return screenDict
}

/**
 * Builds screen group object with screens
 * @param {Object} screenGroup - The screen group entity
 * @returns {Promise<Object>} - The screen group object with screens
 */
async function buildScreenGroupWithScreens(screenGroup) {
    const screens = await fetchScreensForScreenGroup(screenGroup._id)
    
    return {
        _id: screenGroup._id,
        name: screenGroup.name?.[0]?.string || 'Unnamed Screen Group',
        published: screenGroup.published?.[0]?.datetime,
        screens: screens
    }
}

/**
 * Fetch screen groups referencing this configuration
 * @param {string} configurationId - The ID of the configuration
 * @returns {Promise<Object>} - Dictionary of screen groups referencing this configuration
 */
async function fetchReferringScreenGroups(configurationId) {
    try {
        // Fetch all screen groups that reference this configuration
        const screenGroups = await fetchEntitiesByType('sw_screen_group', {
            props: ['name.string', 'published.datetime', '_parent.reference', '_parent.string'],
            filterProperty: 'configuration.reference',
            filterValue: configurationId
        })

        // Convert to a dictionary with screen group ID as key
        const screenGroupDict = {}
        for (const screenGroup of screenGroups) {
            const screenGroupWithScreens = await buildScreenGroupWithScreens(screenGroup)
            screenGroupDict[screenGroup._id] = screenGroupWithScreens
        }

        return screenGroupDict
    } catch (error) {
        console.error(`Error fetching screen groups for configuration ${configurationId}:`, error)
        return {}
    }
}

/**
 * Process a configuration entity and all its related entities
 * @param {Object} rawConfiguration - The raw configuration entity from Entu
 * @param {Object} result - The result object containing errors and warnings
 * @returns {Promise<Object>} - The processed configuration
 */
async function processConfiguration(rawConfiguration, result) {
    const configuration = transformEntity(rawConfiguration)
    // console.log('Processing configuration:', {id: configuration._id, from:rawConfiguration, to:configuration})
    
    // Fetch and process schedules
    const schedules = await fetchChildEntities('sw_schedule', configuration._id, result)
    if (schedules.length === 0) {
        console.warn(`No schedules found for configuration: ${configuration._id}`)
        result.errors.push(`No schedules found for configuration: ${configuration._id}`)
        return null
    }

    // Process each schedule and filter out invalid ones
    const processedSchedules = []
    for (const schedule of schedules) {
        const processedSchedule = await processSchedule(schedule, result)
        if (processedSchedule) {
            processedSchedules.push(processedSchedule)
        }
    }
    
    configuration.schedules = processedSchedules
    
    if (processedSchedules.length === 0) {
        console.warn(`No valid schedules for configuration: ${configuration._id}`)
        result.errors.push(`No valid schedules for configuration: ${configuration._id}`)
        return null
    }
    
    return configuration
}

/**
 * Validates schedule and extracts layout ID
 * @param {Object} rawSchedule - The raw schedule entity
 * @param {Object} result - The result object for errors/warnings
 * @returns {string|null} - The layout ID or null if invalid
 */
async function validateScheduleAndGetLayoutId(rawSchedule, result) {
    const schedule = transformEntity(rawSchedule)
    
    if (!hasEntuProperty(rawSchedule, 'layout')) {
        console.warn(`Schedule ${schedule._id || 'unknown'} has no layout reference`)
        result.warnings.push(`Schedule ${schedule._id || 'unknown'} has no layout reference`)
        return null
    }
    
    const layoutId = getFirstReferenceValue(rawSchedule, 'layout')
    if (!layoutId) {
        console.warn(`Schedule ${schedule._id || 'unknown'} has invalid layout reference`)
        result.warnings.push(`Schedule ${schedule._id || 'unknown'} has invalid layout reference`)
        return null
    }
    
    return layoutId
}

/**
 * Fetches and validates layout entity
 * @param {string} layoutId - The layout ID to fetch
 * @param {string} scheduleId - The schedule ID for error reporting
 * @param {Object} result - The result object for errors/warnings
 * @returns {Promise<Object|null>} - The transformed layout or null if invalid
 */
async function fetchAndValidateLayout(layoutId, scheduleId, result) {
    const layout = await fetchEntity(layoutId)
    if (!layout) {
        console.warn(`Failed to fetch layout: ${layoutId} for schedule ${scheduleId || 'unknown'}`)
        result.warnings.push(`Failed to fetch layout: ${layoutId} for schedule ${scheduleId || 'unknown'}`)
        return null
    }
    
    return transformEntity(layout)
}

/**
 * Processes layout playlists for a given layout
 * @param {string} layoutId - The layout ID
 * @param {Object} result - The result object for errors/warnings
 * @returns {Promise<Array|null>} - The processed layout playlists or null if invalid
 */
async function processLayoutPlaylistsForLayout(layoutId, result) {
    const layoutPlaylists = await fetchChildEntities('sw_layout_playlist', layoutId, result)
    if (!layoutPlaylists || layoutPlaylists.length === 0) {
        console.warn(`No layout playlists found for layout: ${layoutId}`)
        result.warnings.push(`No layout playlists found for layout: ${layoutId}`)
        return null
    }
    
    const processedLayoutPlaylists = []
    for (const layoutPlaylist of layoutPlaylists) {
        if (!layoutPlaylist) continue
        
        const processedLayoutPlaylist = await processLayoutPlaylist(layoutPlaylist, result)
        if (processedLayoutPlaylist) {
            processedLayoutPlaylists.push(processedLayoutPlaylist)
        }
    }
    
    if (processedLayoutPlaylists.length === 0) {
        console.warn(`No valid layout playlists for layout: ${layoutId}`)
        result.warnings.push(`No valid layout playlists for layout: ${layoutId}`)
        return null
    }
    
    return processedLayoutPlaylists
}

/**
 * Copies layout properties to schedule
 * @param {Object} schedule - The schedule object to modify
 * @param {Object} transformedLayout - The layout object to copy from
 */
function copyLayoutPropertiesToSchedule(schedule, transformedLayout) {
    if (!transformedLayout) return
    
    if (transformedLayout.name) schedule.name = transformedLayout.name
    if (transformedLayout.width !== undefined) schedule.width = transformedLayout.width
    if (transformedLayout.height !== undefined) schedule.height = transformedLayout.height
}

/**
 * Process a schedule entity and its related entities
 * @param {Object} rawSchedule - The raw schedule entity from Entu
 * @param {Object} result - The result object containing errors and warnings
 * @returns {Promise<Object|null>} - The processed schedule or null if invalid
 */
async function processSchedule(rawSchedule, result) {
    if (!rawSchedule) {
        console.warn('Received null or undefined schedule')
        result.warnings.push('Received null or undefined schedule')
        return null
    }
    
    const schedule = transformEntity(rawSchedule)
    
    // Validate schedule and get layout ID
    const layoutId = await validateScheduleAndGetLayoutId(rawSchedule, result)
    if (!layoutId) return null
    
    // Fetch and validate layout
    const transformedLayout = await fetchAndValidateLayout(layoutId, schedule._id, result)
    if (!transformedLayout) return null
    
    // Process layout playlists
    const processedLayoutPlaylists = await processLayoutPlaylistsForLayout(layoutId, result)
    if (!processedLayoutPlaylists) return null
    
    // Store layout ID as layoutEid in the schedule
    schedule.layoutEid = layoutId
    
    // Copy layout properties to the schedule level
    copyLayoutPropertiesToSchedule(schedule, transformedLayout)
    
    // Store the processed layout playlists directly in the schedule
    schedule.layoutPlaylists = processedLayoutPlaylists
    
    return schedule
}

/**
 * Process a layout playlist entity and its related entities
 * @param {Object} rawLayoutPlaylist - The raw layout playlist entity from Entu
 * @param {Object} result - The result object containing errors and warnings
 * @returns {Promise<Object|null>} - The processed layout playlist or null if invalid
 */
/**
 * Validates layout playlist and extracts playlist ID
 * @param {Object} rawLayoutPlaylist - The raw layout playlist entity
 * @param {Object} result - The result object for errors/warnings
 * @returns {string|null} - The playlist ID or null if invalid
 */
function validateLayoutPlaylistAndGetPlaylistId(rawLayoutPlaylist, result) {
    const layoutPlaylist = transformEntity(rawLayoutPlaylist)
    
    if (!hasEntuProperty(rawLayoutPlaylist, 'playlist')) {
        console.warn(`Layout playlist ${layoutPlaylist._id || 'unknown'} has no playlist reference`)
        result.warnings.push(`Layout playlist ${layoutPlaylist._id || 'unknown'} has no playlist reference`)
        return null
    }
    
    const playlistId = getFirstReferenceValue(rawLayoutPlaylist, 'playlist')
    if (!playlistId) {
        console.warn(`Layout playlist ${layoutPlaylist._id || 'unknown'} has invalid playlist reference`)
        result.warnings.push(`Layout playlist ${layoutPlaylist._id || 'unknown'} has invalid playlist reference`)
        return null
    }
    
    return playlistId
}

/**
 * Fetches and validates playlist entity
 * @param {string} playlistId - The playlist ID to fetch
 * @param {string} layoutPlaylistId - The layout playlist ID for error reporting
 * @param {Object} result - The result object for errors/warnings
 * @returns {Promise<Object|null>} - The transformed playlist or null if invalid
 */
async function fetchAndValidatePlaylist(playlistId, layoutPlaylistId, result) {
    const playlist = await fetchEntity(playlistId)
    if (!playlist) {
        console.warn(`Failed to fetch playlist: ${playlistId} for layout playlist ${layoutPlaylistId || 'unknown'}`)
        result.warnings.push(`Failed to fetch playlist: ${playlistId} for layout playlist ${layoutPlaylistId || 'unknown'}`)
        return null
    }
    
    return transformEntity(playlist)
}

/**
 * Processes playlist medias for a given playlist
 * @param {string} playlistId - The playlist ID
 * @param {Object} result - The result object for errors/warnings
 * @returns {Promise<Array|null>} - The processed playlist medias or null if invalid
 */
async function processPlaylistMediasForPlaylist(playlistId, result) {
    const playlistMedias = await fetchChildEntities('sw_playlist_media', playlistId, result)
    if (!playlistMedias || playlistMedias.length === 0) {
        console.warn(`No playlist medias found for playlist: ${playlistId}`)
        result.warnings.push(`No playlist medias found for playlist: ${playlistId}`)
        return null
    }
    
    const processedPlaylistMedias = []
    for (const playlistMedia of playlistMedias) {
        if (!playlistMedia) continue
        
        const processedPlaylistMedia = await processPlaylistMedia(playlistMedia, result)
        if (processedPlaylistMedia) {
            processedPlaylistMedias.push(processedPlaylistMedia)
        }
    }
    
    if (processedPlaylistMedias.length === 0) {
        console.warn(`No valid playlist medias for playlist: ${playlistId}`)
        result.warnings.push(`No valid playlist medias for playlist: ${playlistId}`)
        return null
    }
    
    return processedPlaylistMedias
}

/**
 * Copies playlist properties to layout playlist
 * @param {Object} layoutPlaylist - The layout playlist object to modify
 * @param {Object} transformedPlaylist - The playlist object to copy from
 */
function copyPlaylistPropertiesToLayoutPlaylist(layoutPlaylist, transformedPlaylist) {
    if (!transformedPlaylist) return
    
    if (transformedPlaylist.name) layoutPlaylist.name = transformedPlaylist.name
}

/**
 * Process a layout playlist entity and its related entities
 * @param {Object} rawLayoutPlaylist - The raw layout playlist entity from Entu
 * @param {Object} result - The result object containing errors and warnings
 * @returns {Promise<Object|null>} - The processed layout playlist or null if invalid
 */
async function processLayoutPlaylist(rawLayoutPlaylist, result) {
    if (!rawLayoutPlaylist) {
        console.warn('Received null or undefined layout playlist')
        result.warnings.push('Received null or undefined layout playlist')
        return null
    }

    const layoutPlaylist = transformEntity(rawLayoutPlaylist)
    
    // Validate layout playlist and get playlist ID
    const playlistId = validateLayoutPlaylistAndGetPlaylistId(rawLayoutPlaylist, result)
    if (!playlistId) return null
    
    // Fetch and validate playlist
    const transformedPlaylist = await fetchAndValidatePlaylist(playlistId, layoutPlaylist._id, result)
    if (!transformedPlaylist) return null
    
    // Process playlist medias
    const processedPlaylistMedias = await processPlaylistMediasForPlaylist(playlistId, result)
    if (!processedPlaylistMedias) return null
    
    // Store playlist ID as playlistEid in the layoutPlaylist
    layoutPlaylist.playlistEid = playlistId
    
    // Copy playlist properties to the layoutPlaylist level
    copyPlaylistPropertiesToLayoutPlaylist(layoutPlaylist, transformedPlaylist)
    
    // Store the processed playlist medias directly in the layoutPlaylist
    layoutPlaylist.playlistMedias = processedPlaylistMedias
    
    return layoutPlaylist
}

/**
 * Validates playlist media and extracts media ID
 * @param {Object} rawPlaylistMedia - The raw playlist media entity
 * @param {Object} result - The result object for errors/warnings
 * @returns {string|null} - The media ID or null if invalid
 */
function validatePlaylistMediaAndGetMediaId(rawPlaylistMedia, result) {
    const playlistMedia = transformEntity(rawPlaylistMedia)
    
    if (!hasEntuProperty(rawPlaylistMedia, 'media')) {
        console.warn(`Playlist media ${playlistMedia._id || 'unknown'} has no media reference`)
        result.warnings.push(`Playlist media ${playlistMedia._id || 'unknown'} has no media reference`)
        return null
    }
    
    const mediaId = getFirstReferenceValue(rawPlaylistMedia, 'media')
    if (!mediaId) {
        console.warn(`Playlist media ${playlistMedia._id || 'unknown'} has invalid media reference`)
        result.warnings.push(`Playlist media ${playlistMedia._id || 'unknown'} has invalid media reference`)
        return null
    }
    
    return mediaId
}

/**
 * Fetches and validates media entity
 * @param {string} mediaId - The media ID to fetch
 * @param {string} playlistMediaId - The playlist media ID for error reporting
 * @param {Object} result - The result object for errors/warnings
 * @returns {Promise<Object|null>} - The transformed media or null if invalid
 */
async function fetchAndValidateMedia(mediaId, playlistMediaId, result) {
    const media = await fetchEntity(mediaId)
    if (!media) {
        console.warn(`Failed to fetch media: ${mediaId} for playlist media ${playlistMediaId || 'unknown'}`)
        result.warnings.push(`Failed to fetch media: ${mediaId} for playlist media ${playlistMediaId || 'unknown'}`)
        return null
    }
    
    return transformEntity(media)
}

/**
 * Copies media properties to playlist media
 * @param {Object} playlistMedia - The playlist media object to modify
 * @param {Object} transformedMedia - The media object to copy from
 */
function copyMediaPropertiesToPlaylistMedia(playlistMedia, transformedMedia) {
    if (!transformedMedia) return
    
    if (transformedMedia.name) playlistMedia.name = transformedMedia.name
    if (transformedMedia.file) playlistMedia.fileDO = getPublisherFilesApiUrl(transformedMedia._id, transformedMedia.file[0]._id)
    if (transformedMedia.fileName) playlistMedia.fileName = transformedMedia.fileName
    if (transformedMedia.type) playlistMedia.type = transformedMedia.type
}

/**
 * Process a playlist media entity and its related media entity
 * @param {Object} rawPlaylistMedia - The raw playlist media entity from Entu
 * @param {Object} result - The result object containing errors and warnings
 * @returns {Promise<Object|null>} - The processed playlist media or null if invalid
 */
async function processPlaylistMedia(rawPlaylistMedia, result) {
    if (!rawPlaylistMedia) {
        console.warn('Received null or undefined playlist media')
        result.warnings.push('Received null or undefined playlist media')
        return null
    }

    const playlistMedia = transformEntity(rawPlaylistMedia)
    
    // Validate playlist media and get media ID
    const mediaId = validatePlaylistMediaAndGetMediaId(rawPlaylistMedia, result)
    if (!mediaId) return null
    
    // Fetch and validate media
    const transformedMedia = await fetchAndValidateMedia(mediaId, playlistMedia._id, result)
    if (!transformedMedia) return null
    
    // Store media ID as mediaEid in the playlistMedia
    playlistMedia.mediaEid = mediaId
    
    // Copy media properties to the playlistMedia level
    copyMediaPropertiesToPlaylistMedia(playlistMedia, transformedMedia)
    
    return playlistMedia
}
