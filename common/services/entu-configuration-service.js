import { fetchEntity, fetchChildEntities, transformEntity, hasEntuProperty, getFirstReferenceValue } from '../utils/entu-utils.js'

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
        // Fetch the main configuration
        const rawConfiguration = await fetchEntity(configurationId)
        if (!rawConfiguration) {
            console.warn(`Failed to fetch configuration: ${configurationId}`)
            result.errors.push(`Failed to fetch configuration: ${configurationId}`)
            return result
        }

        // Begin processing the configuration
        result.configuration = await processConfiguration(rawConfiguration, result)
        
        return result
    } catch (error) {
        console.error(`Error fetching configuration ${configurationId}:`, error)
        result.errors.push(`Error fetching configuration ${configurationId}: ${error.message}`)
        return result
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
        result.warnings.push(`No schedules found for configuration: ${configuration._id}`)
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
        result.errors.push(`No valid schedules for configuration: ${configuration._id}`)
    }
    
    return configuration
}

/**
 * Process a schedule entity and its related entities
 * @param {Object} rawSchedule - The raw schedule entity from Entu
 * @param {Object} result - The result object containing errors and warnings
 * @returns {Promise<Object|null>} - The processed schedule or null if invalid
 */
async function processSchedule(rawSchedule, result) {
    const schedule = transformEntity(rawSchedule)
    // console.log('Processing schedule:', {id: schedule._id, from:rawSchedule, to:schedule})
    
    // Check if schedule has a layout reference
    if (!hasEntuProperty(rawSchedule, 'layout')) {
        console.warn(`Schedule ${schedule._id} has no layout reference`)
        result.warnings.push(`Schedule ${schedule._id} has no layout reference`)
        return null
    }
    
    const layoutId = getFirstReferenceValue(rawSchedule, 'layout')
    // console.log('Layout ID:', layoutId)
    // Fetch the layout
    const layout = await fetchEntity(layoutId)
    if (!layout) {
        console.warn(`Failed to fetch layout: ${layoutId} for schedule ${schedule._id}`)
        result.warnings.push(`Failed to fetch layout: ${layoutId} for schedule ${schedule._id}`)
        return null
    }
    
    const transformedLayout = transformEntity(layout)
    // console.log('Transformed layout:', {id: transformedLayout._id, from:layout, to:transformedLayout})
    
    // Fetch and process layout playlists
    const layoutPlaylists = await fetchChildEntities('sw_layout_playlist', layoutId, result)
    if (layoutPlaylists.length === 0) {
        console.warn(`No layout playlists found for layout: ${layoutId}`)
        result.warnings.push(`No layout playlists found for layout: ${layoutId}`)
        return null
    }
    
    // Process each layout playlist and filter out invalid ones
    const processedLayoutPlaylists = []
    for (const layoutPlaylist of layoutPlaylists) {
        const processedLayoutPlaylist = await processLayoutPlaylist(layoutPlaylist, result)
        console.log('Processed layout playlist:', {id: processedLayoutPlaylist._id, from:layoutPlaylist, to:processedLayoutPlaylist})
        if (processedLayoutPlaylist) {
            processedLayoutPlaylists.push(processedLayoutPlaylist)
        }
    }
    
    if (processedLayoutPlaylists.length === 0) {
        console.warn(`No valid layout playlists for layout: ${layoutId}`)
        result.warnings.push(`No valid layout playlists for layout: ${layoutId}`)
        return null
    }
    
    // Store layout ID as layoutEid in the schedule
    schedule.layoutEid = layoutId
    
    // Copy layout properties to the schedule level
    if (transformedLayout) {
        // Copy basic layout properties
        if (transformedLayout.name) schedule.name = transformedLayout.name;
        if (transformedLayout.width !== undefined) schedule.width = transformedLayout.width;
        if (transformedLayout.height !== undefined) schedule.height = transformedLayout.height;
        
        // Copy any other relevant layout properties
        // Add more properties as needed
    }
    
    // Store the processed layout playlists directly in the schedule
    schedule.layoutPlaylists = processedLayoutPlaylists;
    
    return schedule;
}

/**
 * Process a layout playlist entity and its related entities
 * @param {Object} rawLayoutPlaylist - The raw layout playlist entity from Entu
 * @param {Object} result - The result object containing errors and warnings
 * @returns {Promise<Object|null>} - The processed layout playlist or null if invalid
 */
async function processLayoutPlaylist(rawLayoutPlaylist, result) {
    const layoutPlaylist = transformEntity(rawLayoutPlaylist)
    
    // Check if layout playlist has a playlist reference
    if (!hasEntuProperty(rawLayoutPlaylist, 'playlist')) {
        console.warn(`Layout playlist ${layoutPlaylist._id} has no playlist reference`)
        result.warnings.push(`Layout playlist ${layoutPlaylist._id} has no playlist reference`)
        return null
    }
    
    const playlistId = getFirstReferenceValue(rawLayoutPlaylist, 'playlist')
    
    // Fetch the playlist
    const playlist = await fetchEntity(playlistId)
    if (!playlist) {
        console.warn(`Failed to fetch playlist: ${playlistId} for layout playlist ${layoutPlaylist._id}`)
        result.warnings.push(`Failed to fetch playlist: ${playlistId} for layout playlist ${layoutPlaylist._id}`)
        return null
    }
    
    const transformedPlaylist = transformEntity(playlist)
    
    // Fetch and process playlist medias
    const playlistMedias = await fetchChildEntities('sw_playlist_media', playlistId, result)
    if (playlistMedias.length === 0) {
        console.warn(`No playlist medias found for playlist: ${playlistId}`)
        result.warnings.push(`No playlist medias found for playlist: ${playlistId}`)
        return null
    }
    
    // Process each playlist media and filter out invalid ones
    const processedPlaylistMedias = []
    for (const playlistMedia of playlistMedias) {
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
    
    // Store playlist ID as playlistEid in the layoutPlaylist
    layoutPlaylist.playlistEid = playlistId
    
    // Copy playlist properties to the layoutPlaylist level
    if (transformedPlaylist) {
        if (transformedPlaylist.name) layoutPlaylist.name = transformedPlaylist.name;
        // Add any other relevant playlist properties
    }
    
    // Store the processed playlist medias directly in the layoutPlaylist
    layoutPlaylist.playlistMedias = processedPlaylistMedias;
    
    return layoutPlaylist;
}

/**
 * Process a playlist media entity and its related media entity
 * @param {Object} rawPlaylistMedia - The raw playlist media entity from Entu
 * @param {Object} result - The result object containing errors and warnings
 * @returns {Promise<Object|null>} - The processed playlist media or null if invalid
 */
async function processPlaylistMedia(rawPlaylistMedia, result) {
    const playlistMedia = transformEntity(rawPlaylistMedia)
    
    // Check if playlist media has a media reference
    if (!hasEntuProperty(rawPlaylistMedia, 'media')) {
        console.warn(`Playlist media ${playlistMedia._id} has no media reference`)
        result.warnings.push(`Playlist media ${playlistMedia._id} has no media reference`)
        return null
    }
    
    const mediaId = getFirstReferenceValue(rawPlaylistMedia, 'media')
    
    // Fetch the media
    const media = await fetchEntity(mediaId)
    if (!media) {
        console.warn(`Failed to fetch media: ${mediaId} for playlist media ${playlistMedia._id}`)
        result.warnings.push(`Failed to fetch media: ${mediaId} for playlist media ${playlistMedia._id}`)
        return null
    }
    
    const transformedMedia = transformEntity(media)
    
    // Store media ID as mediaEid in the playlistMedia
    playlistMedia.mediaEid = mediaId
    
    // Copy media properties to the playlistMedia level
    if (transformedMedia) {
        if (transformedMedia.name) playlistMedia.name = transformedMedia.name;
        if (transformedMedia.file) playlistMedia.file = transformedMedia.file;
        if (transformedMedia.fileName) playlistMedia.fileName = transformedMedia.fileName;
        
        // Rename type to mediaType for clarity
        if (transformedMedia.type) {
            playlistMedia.mediaType = transformedMedia.type;
        }
        
        // Add any other relevant media properties
    }
    
    return playlistMedia;
}
