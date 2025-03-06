
function validateFields(obj, fields) {
    for (const field of fields) {
        if (!obj[field]) {
            console.error(obj)
            throw new Error(`Missing required field: ${field}`)
        }
    }
}

function validateSchedule(schedule) {
    const requiredFields = ['eid', 'layoutEid', 'name', 'crontab', 'layoutPlaylists']
    validateFields(schedule, requiredFields)
    schedule.layoutPlaylists.forEach(validateLayoutPlaylist)
}

function validateLayoutPlaylist(layoutPlaylist) {
    const requiredFields = ['eid', 'playlistEid', 'name', 'playlistMedias']
    validateFields(layoutPlaylist, requiredFields)
    layoutPlaylist.playlistMedias.forEach(validatePlaylistMedia)
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
    console.debug('Configuration:', configuration)
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
