class ConfigurationValidator {
    constructor(configuration) {
        this.configuration = configuration
        this.errors = []
        this.warnings = []
    }

    validate() {
        this.validateBasicStructure()
        this.validateSchedules()
        this.validateLayouts()
        this.validatePlaylists()
        this.validateMedia()
        this.validateDates()
        
        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        }
    }

    validateBasicStructure() {
        const required = ['configurationEid', 'publishedAt', 'updateInterval', 'schedules']
        required.forEach(field => {
            if (!this.configuration[field]) {
                this.errors.push(`Missing required field: ${field}`)
            }
        })
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
                    this.errors.push(`Schedule ${index}: Missing required field: ${field}`)
                }
            })

            // Validate crontab format
            if (schedule.crontab && !this.isValidCrontab(schedule.crontab)) {
                this.errors.push(`Schedule ${index}: Invalid crontab expression: ${schedule.crontab}`)
            }
        })
    }

    validateLayouts() {
        this.configuration.schedules.forEach((schedule, scheduleIndex) => {
            if (!Array.isArray(schedule.layoutPlaylists)) {
                this.errors.push(`Schedule ${scheduleIndex}: layoutPlaylists must be an array`)
                return
            }

            const totalWidth = schedule.layoutPlaylists.reduce((sum, playlist) => {
                return sum + (playlist.width || 0)
            }, 0)

            const totalHeight = schedule.layoutPlaylists.reduce((sum, playlist) => {
                return sum + (playlist.height || 0)
            }, 0)

            // Check for overlapping playlists
            this.checkPlaylistOverlap(schedule.layoutPlaylists, scheduleIndex)
        })
    }

    validatePlaylists() {
        this.configuration.schedules.forEach((schedule, scheduleIndex) => {
            schedule.layoutPlaylists.forEach((playlist, playlistIndex) => {
                // Check required playlist fields
                const required = ['eid', 'name', 'left', 'top', 'width', 'height', 'playlistMedias']
                required.forEach(field => {
                    if (!playlist[field]) {
                        this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}: Missing required field: ${field}`)
                    }
                })

                // Validate dimensions
                if (playlist.width < 0 || playlist.width > 100) {
                    this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}: Invalid width: ${playlist.width}`)
                }
                if (playlist.height < 0 || playlist.height > 100) {
                    this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}: Invalid height: ${playlist.height}`)
                }
            })
        })
    }

    validateMedia() {
        this.configuration.schedules.forEach((schedule, scheduleIndex) => {
            schedule.layoutPlaylists.forEach((playlist, playlistIndex) => {
                if (!Array.isArray(playlist.playlistMedias)) {
                    this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}: playlistMedias must be an array`)
                    return
                }

                playlist.playlistMedias.forEach((media, mediaIndex) => {
                    // Check required media fields
                    const required = ['playlistMediaEid', 'mediaEid', 'file', 'type']
                    required.forEach(field => {
                        if (!media[field]) {
                            this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}, Media ${mediaIndex}: Missing required field: ${field}`)
                        }
                    })

                    // Validate media type
                    if (!['Image', 'Video'].includes(media.type)) {
                        this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}, Media ${mediaIndex}: Invalid media type: ${media.type}`)
                    }

                    // Check file URL
                    if (media.file && !this.isValidUrl(media.file)) {
                        this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}, Media ${mediaIndex}: Invalid file URL: ${media.file}`)
                    }
                })
            })
        })
    }

    validateDates() {
        this.configuration.schedules.forEach((schedule, scheduleIndex) => {
            schedule.layoutPlaylists.forEach((playlist, playlistIndex) => {
                playlist.playlistMedias.forEach((media, mediaIndex) => {
                    if (media.validFrom && !this.isValidDate(media.validFrom)) {
                        this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}, Media ${mediaIndex}: Invalid validFrom date: ${media.validFrom}`)
                    }
                    if (media.validTo && !this.isValidDate(media.validTo)) {
                        this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}, Media ${mediaIndex}: Invalid validTo date: ${media.validTo}`)
                    }
                    if (media.validFrom && media.validTo && new Date(media.validFrom) > new Date(media.validTo)) {
                        this.errors.push(`Schedule ${scheduleIndex}, Playlist ${playlistIndex}, Media ${mediaIndex}: validFrom date is after validTo date`)
                    }
                })
            })
        })
    }

    // Helper methods
    isValidCrontab(crontab) {
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

    checkPlaylistOverlap(playlists, scheduleIndex) {
        for (let i = 0; i < playlists.length; i++) {
            for (let j = i + 1; j < playlists.length; j++) {
                const p1 = playlists[i]
                const p2 = playlists[j]
                
                if (this.doPlaylistsOverlap(p1, p2)) {
                    this.warnings.push(`Schedule ${scheduleIndex}: Playlists ${p1.eid} and ${p2.eid} overlap`)
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
}