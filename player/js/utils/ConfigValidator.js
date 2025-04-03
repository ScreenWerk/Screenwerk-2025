// Disclaimer: no semicolons, if unnecessary, are used in this project

export class ConfigValidator {
    static validateConfiguration(config) {
        const errors = []
        
        if (!config) {
            errors.push('Configuration is undefined')
            return { valid: false, errors }
        }
        
        if (!config.schedules || !Array.isArray(config.schedules) || config.schedules.length === 0) {
            errors.push('Configuration must have at least one schedule')
        }
        
        // Validate each schedule
        if (config.schedules) {
            config.schedules.forEach((schedule, index) => {
                if (!schedule.layoutPlaylists || !Array.isArray(schedule.layoutPlaylists)) {
                    errors.push(`Schedule at index ${index} must have layoutPlaylists array`)
                } else if (schedule.layoutPlaylists.length === 0) {
                    errors.push(`Schedule at index ${index} must have at least one playlist`)
                }
                
                // Validate each playlist
                schedule.layoutPlaylists?.forEach((playlist, pIndex) => {
                    if (!playlist.playlistMedias || !Array.isArray(playlist.playlistMedias) || playlist.playlistMedias.length === 0) {
                        errors.push(`Playlist at index ${pIndex} in schedule ${index} must have at least one media`)
                    }
                    
                    // Validate positioning
                    if (typeof playlist.left !== 'number' || typeof playlist.top !== 'number' ||
                        typeof playlist.width !== 'number' || typeof playlist.height !== 'number') {
                        errors.push(`Playlist at index ${pIndex} in schedule ${index} has invalid position or dimensions`)
                    }
                })
            })
        }
        
        return {
            valid: errors.length === 0,
            errors
        }
    }
}
