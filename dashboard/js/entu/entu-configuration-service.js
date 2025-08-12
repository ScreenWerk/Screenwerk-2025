// Dashboard-local configuration service (trimmed) - migrated legacy implementation (original shared directory now removed)
import { fetchEntitiesByType } from './entu-entity-utils.js'
import { fetchJSON } from './fetch-utils.js'
import { ENTU_ENTITY_URL, getPublisherFilesApiUrl } from '../../../shared/config/constants.js'

async function fetchEntity(entityId) {
    const response = await fetchJSON(`${ENTU_ENTITY_URL}/${entityId}`)
    return response?.entity || null
}

async function fetchChildEntities(type, parentId) {
    const url = `${ENTU_ENTITY_URL}?_type.string=${type}&_parent.reference=${parentId}`
    const response = await fetchJSON(url)
    return response?.entities && Array.isArray(response.entities) ? response.entities : []
}

function hasEntuProperty(entity, property) {
    return entity && entity[property] && Array.isArray(entity[property]) && entity[property].length > 0
}

function getFirstReferenceValue(entity, property) {
    if (hasEntuProperty(entity, property)) {
        const first = entity[property][0]
        if (typeof first === 'object' && first.id) return first.id
        if (first.reference) return first.reference
    }
    return null
}

function transformValueItem(item) {
    if (item.string !== undefined) return item.string
    if (item.number !== undefined) return item.number
    if (item.boolean !== undefined) return item.boolean
    if (item.datetime !== undefined) return item.datetime
    if (item.reference !== undefined) return { id: item.reference, name: item.string }
    if (item.filename !== undefined) return { _id: item._id, filename: item.filename }
    return item
}

function processArrayProperty(propertyArray) {
    const transformed = propertyArray.map(transformValueItem)
    if (transformed.length === 1) {
        const v = transformed[0]
        if (['string', 'number', 'boolean'].includes(typeof v)) return v
    }
    return transformed
}

function transformEntity(entity) {
    if (!entity) return null
    const transformed = { _id: entity._id }
    for (const key in entity) {
        if (!key.startsWith('_')) {
            if (Array.isArray(entity[key])) transformed[key] = processArrayProperty(entity[key])
            else transformed[key] = entity[key]
        }
    }
    return transformed
}

export async function getConfigurationById(configurationId) {
    const result = { configuration: null, errors: [], warnings: [] }
    const raw = await fetchEntity(configurationId)
    if (!raw) { result.errors.push(`Failed to fetch configuration: ${configurationId}`); return result }
    raw.customer = { _id: raw._parent?.[0]?.reference, name: raw._parent?.[0]?.string || 'Unknown Customer' }
    const processed = await processConfiguration(raw, result)
    if (!processed) return result
    processed.referringScreenGroups = await fetchReferringScreenGroups(configurationId)
    result.configuration = processed
    return result
}

async function fetchReferringScreenGroups(configurationId) {
    const screenGroups = await fetchEntitiesByType('sw_screen_group', {
        props: ['name.string', 'published.datetime', '_parent.reference', '_parent.string'],
        filterProperty: 'configuration.reference',
        filterValue: configurationId
    })
    const dict = {}
    for (const sg of screenGroups) {
        dict[sg._id] = await buildScreenGroupWithScreens(sg)
    }
    return dict
}

function toScreenDict(screens) {
    const dict = {}
    for (const s of screens) {
        dict[s._id] = { _id: s._id, name: s.name?.[0]?.string || 'Unnamed Screen' }
    }
    return dict
}

async function buildScreenGroupWithScreens(screenGroup) {
    const screens = await fetchEntitiesByType('sw_screen', {
        props: ['name.string', '_parent.reference'],
        filterProperty: 'screen_group.reference',
        filterValue: screenGroup._id
    })
    const screenDict = toScreenDict(screens)
    return {
        _id: screenGroup._id,
        name: screenGroup.name?.[0]?.string || 'Unnamed Screen Group',
        published: screenGroup.published?.[0]?.datetime,
        screens: screenDict
    }
}

async function processConfiguration(rawConfiguration, result) {
    const configuration = transformEntity(rawConfiguration)
    const schedules = await fetchChildEntities('sw_schedule', configuration._id)
    if (schedules.length === 0) { result.errors.push(`No schedules found for configuration: ${configuration._id}`); return null }
    const processedSchedules = []
    for (const schedule of schedules) {
        const processed = await processSchedule(schedule, result)
        if (processed) processedSchedules.push(processed)
    }
    configuration.schedules = processedSchedules
    if (processedSchedules.length === 0) { result.errors.push(`No valid schedules for configuration: ${configuration._id}`); return null }
    return configuration
}

async function processSchedule(rawSchedule, result) {
    if (!rawSchedule) { result.warnings.push('Received null or undefined schedule'); return null }
    const schedule = transformEntity(rawSchedule)
    const layoutId = getFirstReferenceValue(rawSchedule, 'layout')
    if (!layoutId) { result.warnings.push(`Schedule ${schedule._id || 'unknown'} has invalid layout reference`); return null }
    const processedLayoutPlaylists = await processLayoutPlaylistsForLayout(layoutId, result)
    if (!processedLayoutPlaylists) return null
    schedule.layoutEid = layoutId
    schedule.layoutPlaylists = processedLayoutPlaylists
    return schedule
}

async function processLayoutPlaylistsForLayout(layoutId, result) {
    const layoutPlaylists = await fetchChildEntities('sw_layout_playlist', layoutId)
    if (!layoutPlaylists.length) { result.warnings.push(`No layout playlists found for layout: ${layoutId}`); return null }
    const processed = []
    for (const lp of layoutPlaylists) {
        const p = await processLayoutPlaylist(lp, result)
        if (p) processed.push(p)
    }
    if (!processed.length) { result.warnings.push(`No valid layout playlists for layout: ${layoutId}`); return null }
    return processed
}

async function processLayoutPlaylist(rawLayoutPlaylist, result) {
    if (!rawLayoutPlaylist) { result.warnings.push('Received null or undefined layout playlist'); return null }
    const playlistId = getFirstReferenceValue(rawLayoutPlaylist, 'playlist')
    if (!playlistId) { result.warnings.push('Layout playlist missing playlist reference'); return null }
    const processedPlaylistMedias = await processPlaylistMediasForPlaylist(playlistId, result)
    if (!processedPlaylistMedias) return null
    const lp = transformEntity(rawLayoutPlaylist)
    lp.playlistEid = playlistId
    lp.playlistMedias = processedPlaylistMedias
    return lp
}

async function processPlaylistMediasForPlaylist(playlistId, result) {
    const playlistMedias = await fetchChildEntities('sw_playlist_media', playlistId)
    if (!playlistMedias.length) { result.warnings.push(`No playlist medias found for playlist: ${playlistId}`); return null }
    const processed = []
    for (const pm of playlistMedias) {
        const p = await processPlaylistMedia(pm, result)
        if (p) processed.push(p)
    }
    if (!processed.length) { result.warnings.push(`No valid playlist medias for playlist: ${playlistId}`); return null }
    return processed
}

async function processPlaylistMedia(rawPlaylistMedia, result) {
    if (!rawPlaylistMedia) { result.warnings.push('Received null or undefined playlist media'); return null }
    const mediaId = getFirstReferenceValue(rawPlaylistMedia, 'media')
    if (!mediaId) { result.warnings.push('Playlist media missing media reference'); return null }
    const media = await fetchEntity(mediaId)
    if (!media) { result.warnings.push(`Failed to fetch media: ${mediaId}`); return null }
    const transformedMedia = transformEntity(media)
    const pm = transformEntity(rawPlaylistMedia)
    pm.mediaEid = mediaId
    if (transformedMedia.file) pm.fileDO = getPublisherFilesApiUrl(transformedMedia._id, transformedMedia.file[0]._id)
    if (transformedMedia.name) pm.name = transformedMedia.name
    if (transformedMedia.type) pm.type = transformedMedia.type
    return pm
}
