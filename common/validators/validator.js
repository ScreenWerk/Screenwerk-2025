function validateFields(obj, fields, errors) {
    for (const field of fields) {
        if (!obj[field]) {
            // console.error(obj)
            errors.push({'error':`Missing required field: ${field}`, 'object': obj})
        }
    }
}

function validateSchedule(schedule, errors) {
    const requiredFields = ['eid', 'layoutEid', 'name', 'crontab', 'layoutPlaylists']
    validateFields(schedule, requiredFields, errors)
    schedule.layoutPlaylists.forEach(layoutPlaylist => validateLayoutPlaylist(layoutPlaylist, errors))
}

function validateLayoutPlaylist(layoutPlaylist, errors) {
    const requiredFields = ['eid', 'playlistEid', 'name', 'playlistMedias']
    validateFields(layoutPlaylist, requiredFields, errors)
    layoutPlaylist.playlistMedias.forEach(playlistMedia => validatePlaylistMedia(playlistMedia, errors))
}

function validatePlaylistMedia(playlistMedia, errors) {
    const requiredFields = ['playlistMediaEid', 'mediaEid', 'name', 'fileName', 'file', 'fileDO', 'type']
    validateFields(playlistMedia, requiredFields, errors)
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
            configuration.validation_errors.push(`Configuration missing required field: ${field}`)
        }
    }

    if (!Array.isArray(configuration.schedules)) {
        configuration.validation_errors.push('Configuration schedules must be an array')
    }

    if (configuration.schedules.length === 0) {
        configuration.validation_errors.push('Configuration schedules array is empty')
    }

    configuration.schedules.forEach(schedule => {
        validateSchedule(schedule, configuration.validation_errors)
    })

    configuration.is_valid = configuration.validation_errors.length === 0

    return configuration.is_valid
}

export { validateConfiguration }
