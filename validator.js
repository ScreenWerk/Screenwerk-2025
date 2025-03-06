
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
    const requiredFields = ['playlistMediaEid', 'mediaEid', 'name', 'fileName', 'file', 'fileDO', 'type']
    validateFields(playlistMedia, requiredFields)
}

function validateConfiguration(configuration) {
    if (!configuration) {
        throw new Error('Configuration is undefined')
    }
    configuration.validation_errors = []
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

    configuration.is_valid = true

    return true
}

export { validateConfiguration }
