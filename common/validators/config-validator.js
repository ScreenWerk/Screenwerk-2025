import { fetchJSON } from '../utils/utils.js'
import { ENTU_ENTITY_URL, ENTU_FRONTEND_URL } from '../config/constants.js' // Added import

class ConfigValidator {
    constructor(configuration) {
        this.configuration = configuration || {}
        this.errors = []
        this.warnings = []
    }

    formatEntityLink(id, message) {
        return `<a href="${ENTU_ENTITY_URL}/${id}" target="_blank">${message}</a>/<a href="${ENTU_FRONTEND_URL}/${id}" target="_blank">@entu</a>`
    }

    validate() {
        // Basic structure validation first
        if (!this.configuration || Object.keys(this.configuration).length === 0) {
            this.errors.push('Configuration not published')
            console.log('Configuration not published', this.configuration)
            const confId = this.configuration?.configurationEid || 'unknown'
            this.errors.push(`Configuration: ${this.formatEntityLink(confId, confId)}`)
            return this.getResult()
        }

        // Check for required top-level fields
        const requiredTopLevelFields = ['configurationEid', 'schedules']
        requiredTopLevelFields.forEach(field => {
            if (!this.configuration[field]) {
                this.errors.push(`Missing required field: ${field} in configuration ${this.formatEntityLink(this.configuration.configurationEid, this.configuration.configurationEid)}`)
            }
        })

        if (!this.configuration.schedules || !Array.isArray(this.configuration.schedules)) {
            this.errors.push('Schedules array is missing or invalid')
            return this.getResult()
        }

        // Run all validations with null checks
        this.validateSchedules()
        this.validateLayouts()
        this.validatePlaylists()
        this.validateMedia()
        
        return this.getResult()
    }

    validateSchedules() {
        if (!Array.isArray(this.configuration.schedules)) {
            this.errors.push('Schedules must be an array')
            return
        }

        this.configuration.schedules.forEach((schedule, index) => {
            // Check required schedule fields
            const required = ['eid', 'crontab', 'layoutEid', 'layoutPlaylists']
            required.forEach(field => {
                if (!schedule[field]) {
                    this.errors.push(`Schedule ${this.formatEntityLink(schedule.eid, schedule.eid)}: Missing required field: ${field}`)
                }
            })

            // Extract crontab string if it's an array of objects
            if (Array.isArray(schedule.crontab) && schedule.crontab.length > 0 && schedule.crontab[0].string) {
                schedule.crontab = schedule.crontab[0].string
            }

            // Validate crontab format
            if (schedule.crontab && !this.isValidCrontab(schedule.crontab)) {
                this.errors.push(`Schedule ${this.formatEntityLink(schedule.eid, schedule.eid)}: Invalid crontab expression: ${schedule.crontab}`)
            }

            // Ensure layoutPlaylists is an array
            if (!Array.isArray(schedule.layoutPlaylists)) {
                this.errors.push(`Schedule ${this.formatEntityLink(schedule.eid, schedule.eid)}: layoutPlaylists is missing or invalid`)
            }
        })
    }

    validateLayouts() {
        // Safely check schedules array
        const schedules = this.configuration.schedules || []
        
        schedules.forEach((schedule) => {
            // console.log(schedule.eid)
            const schedule_eid = schedule.eid
            // Check if layoutPlaylists exists
            if (!schedule.layoutPlaylists) {
                this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}: layoutPlaylists is missing`)
                return
            }

            if (!Array.isArray(schedule.layoutPlaylists)) {
                this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}: layoutPlaylists must be an array`)
                return
            }

            // Validate each layout playlist
            schedule.layoutPlaylists.forEach((playlist) => {
                const playlist_eid = playlist.eid
                this.validateLayoutPlaylist(playlist, schedule_eid, playlist_eid)
            })
        })
    }

    validateLayoutPlaylist(playlist, schedule_eid, playlist_eid) {
        if (!playlist) {
            this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}: Invalid playlist`)
            return
        }

        // Check required fields
        const required = ['left', 'top', 'width', 'height']
        required.forEach(field => {
            if (typeof playlist[field] !== 'number') {
                this.errors.push(`Schedule ${schedule_eid}, Playlist ${playlist_eid}: Missing or invalid ${field}. Value ${JSON.stringify(playlist[field])}`)
            }
        })

        // Validate dimensions using the normalized values
        if (playlist.width < 0 || playlist.width > 100) {
            this.warnings.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}: Width should be between 0 and 100`)
        }
        if (playlist.height < 0 || playlist.height > 100) {
            this.warnings.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}: Height should be between 0 and 100`)
        }
    }

    validatePlaylists() {
        this.configuration.schedules.forEach((schedule) => {
            const schedule_eid = schedule.eid

            // Ensure layoutPlaylists is an array before iterating
            if (!Array.isArray(schedule.layoutPlaylists)) {
                this.errors.push(`Invalid or missing layoutPlaylists for Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}`)
                return
            }

            schedule.layoutPlaylists.forEach((playlist) => {
                const playlist_eid = playlist.eid

                // Check required playlist fields
                const required = ['eid', 'name', 'left', 'top', 'width', 'height', 'playlistMedias']
                required.forEach(field => {
                    if (!playlist[field] && playlist[field] !== 0) {
                        this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}: Missing required field: ${field}`)
                    }
                })

                // Ensure playlistMedias is an array before iterating
                if (!Array.isArray(playlist.playlistMedias)) {
                    console.warn(`Invalid or missing playlistMedias for Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}`)
                    return
                }

                // Validate dimensions
                if (playlist.width < 0 || playlist.width > 100) {
                    this.warnings.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}: Invalid width: ${playlist.width}`)
                }
                if (playlist.height < 0 || playlist.height > 100) {
                    this.warnings.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}: Invalid height: ${playlist.height}`)
                }
            })
        })
    }

    validateMedia() {
        this.configuration.schedules.forEach((schedule) => {
            const schedule_eid = schedule.eid

            // Ensure layoutPlaylists is an array before iterating
            if (!Array.isArray(schedule.layoutPlaylists)) {
                this.errors.push(`Invalid or missing layoutPlaylists for Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}`)
                return
            }

            schedule.layoutPlaylists.forEach((playlist) => {
                const playlist_eid = playlist.eid

                // Ensure playlistMedias is an array before iterating
                if (!Array.isArray(playlist.playlistMedias)) {
                    this.errors.push(`Invalid or missing playlistMedias for Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}`)
                    return
                }

                playlist.playlistMedias.forEach((media, mediaIndex) => {
                    // Check required media fields
                    const required = ['playlistMediaEid', 'mediaEid', 'file', 'type']
                    required.forEach(field => {
                        if (!media[field]) {
                            this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}, Media ${this.formatEntityLink(media.mediaEid, media.mediaEid)}: Missing required field: ${field}`)
                        }
                    })

                    // Validate media type
                    if (!['Image', 'Video'].includes(media.type)) {
                        this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}, Media ${this.formatEntityLink(media.mediaEid, media.mediaEid)}: Invalid media type: ${media.type}`)
                    }

                    // Check file URL
                    if (media.file && !this.isValidUrl(media.file)) {
                        this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}, Media ${this.formatEntityLink(media.mediaEid, media.mediaEid)}: Invalid file URL: ${media.file}`)
                    }
                })
            })
        })
    }

    validateDates() {
        this.configuration.schedules.forEach((schedule) => {
            const schedule_eid = schedule.eid
            schedule.layoutPlaylists.forEach((playlist) => {
                const playlist_eid = playlist.eid
                playlist.playlistMedias.forEach((media, mediaIndex) => {
                    if (media.validFrom && !this.isValidDate(media.validFrom)) {
                        this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}, Media ${this.formatEntityLink(media.mediaEid, media.mediaEid)}: Invalid validFrom date: ${media.validFrom}`)
                    }
                    if (media.validTo && !this.isValidDate(media.validTo)) {
                        this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}, Media ${this.formatEntityLink(media.mediaEid, media.mediaEid)}: Invalid validTo date: ${media.validTo}`)
                    }
                    if (media.validFrom && media.validTo && new Date(media.validFrom) > new Date(media.validTo)) {
                        this.errors.push(`Schedule ${this.formatEntityLink(schedule_eid, schedule_eid)}, Playlist ${this.formatEntityLink(playlist_eid, playlist_eid)}, Media ${this.formatEntityLink(media.mediaEid, media.mediaEid)}: validFrom date is after validTo date`)
                    }
                })
            })
        })
    }

    // Helper methods
    isValidCrontab(crontab) {
        if (typeof crontab !== 'string') {
            console.warn('Invalid crontab value:', crontab)
            return false
        }
        const parts = crontab.split(' ')
        return parts.length === 5 || parts.length === 6
    }

    isValidUrl(string) {
        try {
            new URL(string)
            return true
        } catch (_) {
            return false
        }
    }

    isValidDate(dateString) {
        const date = new Date(dateString)
        return date instanceof Date && !isNaN(date)
    }

    checkPlaylistOverlap(playlists, schedule_eid) {
        for (let i = 0; i < playlists.length; i++) {
            for (let j = i + 1; j < playlists.length; j++) {
                const p1 = playlists[i]
                const p2 = playlists[j]
                
                if (this.doPlaylistsOverlap(p1, p2)) {
                    this.warnings.push(`Schedule ${schedule_eid}: Playlists ${p1.eid} and ${p2.eid} overlap`)
                }
            }
        }
    }

    doPlaylistsOverlap(p1, p2) {
        return !(p1.left >= p2.left + p2.width ||
                p2.left >= p1.left + p1.width ||
                p1.top >= p2.top + p2.height ||
                p2.top >= p1.top + p1.height)
    }

    getResult() {
        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        }
    }
}

export default ConfigValidator