
function validateFields(obj, fields) {
    for (const field of fields) {
        if (!obj[field]) {
            console.error(obj)
            throw new Error(`Missing required field: ${field}`)
        }
    }
}

function validateSchedule(schedule) {
    const requiredFields = ['_id', 'layout']
    validateFields(schedule, requiredFields)
    schedule.layout.layout_playlists.forEach(validateLayoutPlaylist)
}

function validateLayoutPlaylist(layoutPlaylist) {
    const requiredFields = ['_id', 'playlist']
    validateFields(layoutPlaylist, requiredFields)
    validatePlaylist(layoutPlaylist.playlist)
}

function validatePlaylist(playlist) {
    // console.log('Playlist:', playlist)
    const arrayFields = ['_id', 'playlist_medias']
    validateFields(playlist, arrayFields)
    playlist.playlist_medias.forEach(validatePlaylistMedia)
}

function validatePlaylistMedia(playlistMedia) {
    const requiredFields = ['_id', 'media']
    validateFields(playlistMedia, requiredFields)
    validateMedia(playlistMedia.media)
}

function validateMedia(media) {
    const requiredFields = ['_id', 'media']
    validateFields(media, requiredFields)
    // if (media.type === 'Video' && !media.duration) {
    //     throw new Error('Video media missing duration')
    // }
    // if (media.type === 'Image' && !media.duration) {
    //     throw new Error('Image media missing duration')
    // }
}

function validateConfiguration(configuration) {
    if (!configuration) {
        throw new Error('Configuration is undefined')
    }
    console.log('Configuration:', configuration)
    const requiredFields = ['schedules']
    for (const field of requiredFields) {
        if (!configuration[field]) {
            throw new Error(`Configuration missing required field: ${field}`)
        }
    }

    if (!Array.isArray(configuration.schedules)) {
        throw new Error('Configuration schedules must be an array')
    }

    if (configuration.schedules.length === 0) {
        throw new Error('Configuration schedules array is empty')
    }

    configuration.schedules.forEach(validateSchedule)

    return true
}

export { validateConfiguration }
