import { fetchEntity, fetchChildEntities, transformEntity, hasEntuProperty, getFirstReferenceValue, fetchEntitiesByType } from '../utils/entu-utils.js'
import { getPublisherFilesApiUrl } from '../config/constants.js'

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
        // Fetch the main configuration and parent customer name
        const rawConfiguration = await fetchEntity(configurationId, {
            props: ['name.string', 'published.datetime', '_parent.reference', '_parent.string']
        })
        if (!rawConfiguration) {
            console.warn(`Failed to fetch configuration: ${configurationId}`)
            result.errors.push(`Failed to fetch configuration: ${configurationId}`)
            return result
        }
        rawConfiguration.customer = {
            _id: rawConfiguration._parent?.[0]?.reference,
            name: rawConfiguration._parent?.[0]?.string || 'Unknown Customer'}

        // Begin processing the configuration
        result.configuration = await processConfiguration(rawConfiguration, result)
        if (result.configuration === null) {
            console.warn(`Configuration ${configurationId} is invalid or has no schedules`)
            result.errors.push(`Configuration ${configurationId} is invalid or has no schedules`)
            return result
        }
        
        // Add referring screen groups
        result.configuration.referringScreenGroups = await fetchReferringScreenGroups(configurationId)
        
        return result
    } catch (error) {
        console.error(`Error fetching configuration ${configurationId}:`, error)
        result.errors.push(`Error fetching configuration ${configurationId}: ${error.message}`)
        return result
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
            // Fetch screens for each screen group
            const screens = await fetchEntitiesByType('sw_screen', {
                props: ['name.string', '_parent.reference'],
                filterProperty: 'screen_group.reference',
                filterValue: screenGroup._id
            })

            // Convert screens to a subdictionary
            const screenDict = {}
            for (const screen of screens) {
                screenDict[screen._id] = {
                    _id: screen._id,
                    name: screen.name?.[0]?.string || 'Unnamed Screen'
                }
            }

            screenGroupDict[screenGroup._id] = {
                _id: screenGroup._id,
                name: screenGroup.name?.[0]?.string || 'Unnamed Screen Group',
                published: screenGroup.published?.[0]?.datetime,
                screens: screenDict // Add screens subdictionary
            }
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
    // console.log('Processing schedule:', {id: schedule._id, from:rawSchedule, to:schedule})
    
    // Check if schedule has a layout reference
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
    
    // Fetch the layout
    const layout = await fetchEntity(layoutId)
    if (!layout) {
        console.warn(`Failed to fetch layout: ${layoutId} for schedule ${schedule._id || 'unknown'}`)
        result.warnings.push(`Failed to fetch layout: ${layoutId} for schedule ${schedule._id || 'unknown'}`)
        return null
    }
    
    const transformedLayout = transformEntity(layout)
    // console.log('Transformed layout:', {id: transformedLayout._id, from:layout, to:transformedLayout})
    
    // Fetch and process layout playlists
    const layoutPlaylists = await fetchChildEntities('sw_layout_playlist', layoutId, result)
    if (!layoutPlaylists || layoutPlaylists.length === 0) {
        console.warn(`No layout playlists found for layout: ${layoutId}`)
        result.warnings.push(`No layout playlists found for layout: ${layoutId}`)
        return null
    }
    
    // Process each layout playlist and filter out invalid ones
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
    
    // Store layout ID as layoutEid in the schedule
    schedule.layoutEid = layoutId
    
    // Copy layout properties to the schedule level
    if (transformedLayout) {
        // Copy basic layout properties
        if (transformedLayout.name) schedule.name = transformedLayout.name
        if (transformedLayout.width !== undefined) schedule.width = transformedLayout.width
        if (transformedLayout.height !== undefined) schedule.height = transformedLayout.height
        
        // Copy any other relevant layout properties
        // Add more properties as needed
    }
    
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
async function processLayoutPlaylist(rawLayoutPlaylist, result) {
    if (!rawLayoutPlaylist) {
        console.warn('Received null or undefined layout playlist')
        result.warnings.push('Received null or undefined layout playlist')
        return null
    }

    const layoutPlaylist = transformEntity(rawLayoutPlaylist)
    
    // Check if layout playlist has a playlist reference
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
    
    // Fetch the playlist
    const playlist = await fetchEntity(playlistId)
    if (!playlist) {
        console.warn(`Failed to fetch playlist: ${playlistId} for layout playlist ${layoutPlaylist._id || 'unknown'}`)
        result.warnings.push(`Failed to fetch playlist: ${playlistId} for layout playlist ${layoutPlaylist._id || 'unknown'}`)
        return null
    }
    
    const transformedPlaylist = transformEntity(playlist)
    
    // Fetch and process playlist medias
    const playlistMedias = await fetchChildEntities('sw_playlist_media', playlistId, result)
    if (!playlistMedias || playlistMedias.length === 0) {
        console.warn(`No playlist medias found for playlist: ${playlistId}`)
        result.warnings.push(`No playlist medias found for playlist: ${playlistId}`)
        return null
    }
    
    // Process each playlist media and filter out invalid ones
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
    
    // Store playlist ID as playlistEid in the layoutPlaylist
    layoutPlaylist.playlistEid = playlistId
    
    // Copy playlist properties to the layoutPlaylist level
    if (transformedPlaylist) {
        if (transformedPlaylist.name) layoutPlaylist.name = transformedPlaylist.name
        // Add any other relevant playlist properties
    }
    
    // Store the processed playlist medias directly in the layoutPlaylist
    layoutPlaylist.playlistMedias = processedPlaylistMedias
    
    return layoutPlaylist
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
    
    // Check if playlist media has a media reference
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
    
    // Fetch the media
    const media = await fetchEntity(mediaId)
    if (!media) {
        console.warn(`Failed to fetch media: ${mediaId} for playlist media ${playlistMedia._id || 'unknown'}`)
        result.warnings.push(`Failed to fetch media: ${mediaId} for playlist media ${playlistMedia._id || 'unknown'}`)
        return null
    }
    
    const transformedMedia = transformEntity(media)
    // Store media ID as mediaEid in the playlistMedia
    playlistMedia.mediaEid = mediaId
    // playlistMedia.mediaFileEid = playlistMedia.file[0].id
    // console.log('Transformed media:', {id: transformedMedia._id, from:media, to:transformedMedia, plmedia:playlistMedia})
    
    // Copy media properties to the playlistMedia level
    if (transformedMedia) {
        if (transformedMedia.name) playlistMedia.name = transformedMedia.name
        if (transformedMedia.file) playlistMedia.fileDO = getPublisherFilesApiUrl(transformedMedia._id, transformedMedia.file[0]._id)
        if (transformedMedia.fileName) playlistMedia.fileName = transformedMedia.fileName
        
        // Keep original type property for consistency
        if (transformedMedia.type) {
            playlistMedia.type = transformedMedia.type
        }
        
        // Add any other relevant media properties
    }
    
    return playlistMedia
}
