// LayoutTransformer.js - Extracted layout/region transformation helpers

import { debugLog } from '../../../../shared/utils/debug-utils.js'
import { createPlaylistObject } from './MediaTransformer.js'

export function transformScheduleToLayout(schedule) {
    debugLog(`[Scheduler] Transforming schedule to layout: ${schedule.name}`)
    return {
        id: schedule.layoutEid || schedule.eid || 'unknown-layout',
        name: schedule.name || `Layout ${schedule.layoutEid || schedule.eid}`,
        width: schedule.layoutWidth || 1920,
        height: schedule.layoutHeight || 1080,
        regions: transformRegions(schedule.layoutPlaylists || [])
    }
}

export function transformRegions(layoutPlaylists) {
    debugLog(`[Scheduler] Transforming ${layoutPlaylists.length} regions`)
    return layoutPlaylists.map((layoutPlaylist, index) => createRegionObject(layoutPlaylist, index))
}

export function createRegionObject(layoutPlaylist, index) {
    const regionId = layoutPlaylist.regionEid || layoutPlaylist.eid || `region_${index}`
    const position = extractRegionPosition(layoutPlaylist)
    const playlist = createPlaylistObject(layoutPlaylist)
    debugLog(`[Scheduler] Created region: ${regionId}`, position)
    return {
        id: regionId,
        name: layoutPlaylist.regionName || layoutPlaylist.name || `Region ${index + 1}`,
        ...position,
        playlist
    }
}

export function extractRegionPosition(layoutPlaylist) {
    const availableProps = Object.keys(layoutPlaylist)
    console.log('🔍 Available region properties:', availableProps)
    console.log('🔍 Raw region data:', layoutPlaylist)
    const inPixels = layoutPlaylist.inPixels || false
    const left = getRegionProperty(layoutPlaylist, ['left'], 0)
    const top = getRegionProperty(layoutPlaylist, ['top'], 0)
    const width = getRegionProperty(layoutPlaylist, ['width'], 100)
    const height = getRegionProperty(layoutPlaylist, ['height'], 100)
    const zindex = getRegionProperty(layoutPlaylist, ['zindex'], 1)
    const position = { left, top, width, height, zindex, isPercentage: !inPixels }
    console.log('🔍 Extracted position:', position)
    console.log('🔍 Position mode:', inPixels ? 'pixels' : 'percentages')
    return position
}

export function getRegionProperty(obj, keys, defaultValue) {
    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key]
    }
    return defaultValue
}
