// MediaTransformer.js - Extracted media transformation helpers

import { debugLog } from '../../../../../common/utils/debug-utils.js'

export function createPlaylistObject(layoutPlaylist) {
    const playlistId = layoutPlaylist.playlistEid || layoutPlaylist.eid || 'unknown-playlist'
    const mediaItems = transformMedia(layoutPlaylist.playlistMedias || [])
    debugLog(`[Scheduler] Created playlist: ${playlistId} with ${mediaItems.length} media items`)
    return {
        id: playlistId,
        name: layoutPlaylist.playlistName || layoutPlaylist.name || 'Unnamed Playlist',
        mediaItems,
        loop: true
    }
}

export function transformMedia(playlistMedias) {
    return playlistMedias.map((media, index) => createMediaObject(media, index))
}

export function createMediaObject(media, index) {
    return buildMediaObject(media, index)
}

export function buildMediaObject(media, index) {
    const basicProps = getMediaBasicProps(media, index)
    const mediaProps = getMediaDisplayProps(media)
    const validationProps = getMediaValidationProps(media)
    return { ...basicProps, ...mediaProps, ...validationProps, originalData: media }
}

export function getMediaBasicProps(media, index) {
    const mediaUrl = getMediaProperty(media, ['fileDO', 'url', 'file'], '')
    return {
        id: getMediaProperty(media, ['mediaEid', 'eid'], `media_${index}`),
        name: media.name || `Media ${index + 1}`,
        type: media.type || 'unknown',
        uri: mediaUrl,
        url: mediaUrl
    }
}

export function getMediaDisplayProps(media) {
    return {
        duration: media.duration || 10,
        ordinal: media.ordinal || 1
    }
}

export function getMediaValidationProps(media) {
    return {
        validFrom: media.validFrom || null,
        validTo: media.validTo || null
    }
}

export function getMediaProperty(media, keys, defaultValue) {
    for (const key of keys) {
        if (media[key] !== undefined) return media[key]
    }
    return defaultValue
}
