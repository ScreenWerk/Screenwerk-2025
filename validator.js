
function validateSchedule(schedule) {
    const requiredFields = ['eid', 'crontab', 'layoutEid', 'name', 'layoutPlaylists']
    for (const field of requiredFields) {
        if (!schedule[field]) {
            throw new Error(`Schedule missing required field: ${field}`)
        }
    }
    schedule.layoutPlaylists.forEach(validatePlaylist)
}

function validatePlaylist(playlist) {
    const requiredFields = ['playlistEid', 'name', 'left', 'top', 'width', 'height', 'playlistMedias']
    for (const field of requiredFields) {
        if (!playlist[field]) {
            throw new Error(`Playlist missing required field: ${field}`)
        }
    }
    playlist.playlistMedias.forEach(validateMedia)
}

function validateMedia(media) {
    const requiredFields = ['playlistMediaEid', 'mediaEid', 'name', 'type', 'fileDO']
    for (const field of requiredFields) {
        if (!media[field]) {
            throw new Error(`Media missing required field: ${field}`)
        }
    }
    if (media.type === 'Image' && !media.duration) {
        throw new Error('Image media missing duration')
    }
}

function validateConfiguration(configuration) {
    if (!configuration) {
        throw new Error('Configuration is undefined')
    }

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
