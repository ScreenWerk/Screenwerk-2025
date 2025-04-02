import { fetchJSON } from '../../common/utils/utils.js'
import { ENTU_ENTITY_URL, SCREENWERK_PUBLISHER_API } from '../../common/config/constants.js'
import ConfigValidator from '../../common/validators/config-validator.js'
import { updateProgressBar } from './display.js'
import { getConfigurationById } from '../../common/services/entu-configuration-service.js'
import { fetchEntitiesByType } from '../../common/utils/entu-utils.js'

function validateConfiguration(configuration) {
    if (!configuration){ 
        console.warn('Invalid configuration:', configuration)
        return false
    }
    try {
        const validator = new ConfigValidator(configuration)
        const validationResult = validator.validate()
        if (validationResult.errors.length > 0) {
            console.warn('Validation errors:', validationResult.errors)
        }
        return validationResult.isValid
    } catch (error) {
        console.error("Validation error:", error)
        return false
    }
}

async function fillEntuConfiguration(configuration_eid, updateProgress) {
    try {
        // Fetch configuration entity
        const configuration = await fetchConfigurationEntity(configuration_eid)
        if (!configuration) {
            console.error(`Failed to fetch configuration: ${configuration_eid}`)
            return false
        }
        console.debug('Fetched configuration:', configuration)
        
        // Fetch and process all schedules for this configuration
        configuration.schedules = await fetchSchedules(configuration_eid)
        if (configuration.schedules.length === 0) {
            console.debug(`No schedules found for configuration: ${configuration_eid}`)
            return false
        }
        
        // Process each schedule to get layouts, playlists, and media
        // and keep only valid schedules
        const validSchedules = []
        for (let i = 0; i < configuration.schedules.length; i++) {
            const isValid = await processSchedule(configuration.schedules[i])
            if (isValid) {
                validSchedules.push(configuration.schedules[i])
            }
        }
        configuration.schedules = validSchedules
        
        // Check if we have any valid schedules left
        if (configuration.schedules.length === 0) {
            console.warn(`No valid schedules found for configuration: ${configuration_eid}`)
            return false
        }
        
        updateProgress()
        return configuration
    } catch (error) {
        console.error(`Error processing configuration ${configuration_eid}:`, error)
        return false
    }
}

// Helper function to fetch configuration entity
async function fetchConfigurationEntity(configuration_eid) {
    const url = `${ENTU_ENTITY_URL}/${configuration_eid}`
    const configuration_entity = await fetchJSON(url)
    if (!configuration_entity) {
        throw new Error(`Failed to fetch configuration: ${configuration_eid}`)
    }
    return configuration_entity.entity
}

// Helper function to fetch all schedules for a configuration
async function fetchSchedules(configuration_eid) {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_schedule&_parent.reference=${configuration_eid}`
    const schedule_entities = await fetchJSON(url)
    if (!schedule_entities) {
        console.error(`Failed to fetch schedules for configuration: ${configuration_eid}`)
        return []
    }
    return schedule_entities.entities
}

// Process a single schedule entity
async function processSchedule(schedule) {
    console.debug('Processing schedule:', schedule)
    if (!schedule.layout || schedule.layout.length === 0) {
        console.warn('Schedule has no layout')
        return false
    }
    
    const layout_eid = schedule.layout[0].reference
    const layout = await fetchLayout(layout_eid)
    if (!layout) {
        console.warn(`Failed to fetch layout: ${layout_eid}`)
        return false
    }
    
    schedule.layout = layout;
    
    // Fetch and process layout playlists
    const layout_playlists = await fetchLayoutPlaylists(layout_eid)
    if (layout_playlists.length === 0) {
        console.warn(`No layout playlists found for layout: ${layout_eid}`)
        return false
    }
    
    const filtered_layout_playlists = layout_playlists.filter(lp => lp.playlist && lp.playlist.length > 0)
    if (filtered_layout_playlists.length === 0) {
        console.warn(`Layout playlists have no playlist references for layout: ${layout_eid}`)
        return false
    }
    
    // Process each layout playlist
    const valid_layout_playlists = []
    for (const layout_playlist of filtered_layout_playlists) {
        const processed_playlist = await processLayoutPlaylist(layout_playlist)
        if (processed_playlist) {
            valid_layout_playlists.push(processed_playlist)
        }
    }
    
    // Return true if we have any valid layout playlists, false otherwise
    if (valid_layout_playlists.length === 0) {
        console.warn(`No valid layout playlists for layout: ${layout_eid}`)
        return false
    }
    schedule.layout_playlists = valid_layout_playlists
    return true
}

// Fetch layout entity
async function fetchLayout(layout_eid) {
    const layout_entity = await fetchJSON(`${ENTU_ENTITY_URL}/${layout_eid}`)
    if (!layout_entity) {
        console.warn(`Failed to fetch layout: ${layout_eid}`)
        return null
    }
    return layout_entity.entity
}

// Fetch layout playlists
async function fetchLayoutPlaylists(layout_eid) {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_layout_playlist&_parent.reference=${layout_eid}`
    const layout_playlists_entities = await fetchJSON(url)
    if (!layout_playlists_entities) {
        console.warn(`Failed to fetch layout-playlists for layout: ${layout_eid}`)
        return []
    }
    
    const filled_layout_playlists = layout_playlists_entities.entities.filter(lp => lp.playlist)
    if (filled_layout_playlists.length === 0) {
        console.debug(`B No valid layout-playlists found for layout: ${layout_eid}`)
    }
    
    return filled_layout_playlists
}

// Process a single layout playlist
async function processLayoutPlaylist(layout_playlist) {
    if (!layout_playlist.playlist || layout_playlist.playlist.length === 0) {
        console.warn(`Layout playlist ${layout_playlist.eid} has no playlist reference`)
        return false
    }
    
    const playlist_eid = layout_playlist.playlist[0].reference
    const playlist = await fetchPlaylist(playlist_eid)
    if (!playlist) {
        console.warn(`Failed to fetch playlist: ${playlist_eid}`)
        return false
    }
    
    layout_playlist.playlist = playlist
    
    // Fetch and process playlist medias
    const playlist_medias = await fetchPlaylistMedias(playlist_eid)
    if (playlist_medias.length === 0) {
        console.warn(`No playlist medias found for playlist: ${playlist_eid}`)
        return false
    }
    
    // Process each playlist media
    layout_playlist.playlist.playlist_medias = []
    for (const playlist_media of playlist_medias) {
        const processed_media = await processPlaylistMedia(playlist_media)
        if (processed_media) {
            layout_playlist.playlist.playlist_medias.push(processed_media)
        }
    }
    
    return layout_playlist
}

// Fetch playlist entity
async function fetchPlaylist(playlist_eid) {
    const playlist_entity = await fetchJSON(`${ENTU_ENTITY_URL}/${playlist_eid}`)
    if (!playlist_entity) {
        console.warn(`Failed to fetch playlist: ${playlist_eid}`)
        return null
    }
    return playlist_entity.entity
}

// Fetch playlist medias
async function fetchPlaylistMedias(playlist_eid) {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_playlist_media&_parent.reference=${playlist_eid}`
    const playlist_medias_entities = await fetchJSON(url)
    if (!playlist_medias_entities) {
        console.warn(`Failed to fetch playlist-medias for playlist: ${playlist_eid}`)
        return []
    }
    return playlist_medias_entities.entities;
}

// Process a single playlist media
async function processPlaylistMedia(playlist_media) {
    if (!playlist_media.media || playlist_media.media.length === 0) {
        return null;
    }
    
    const media_eid = playlist_media.media[0].reference;
    const media = await fetchMedia(media_eid);
    if (!media) {
        return null;
    }
    
    playlist_media.media = media;
    return playlist_media;
}

// Fetch media entity
async function fetchMedia(media_eid) {
    const media_entity = await fetchJSON(`${ENTU_ENTITY_URL}/${media_eid}`);
    if (!media_entity) {
        console.warn(`Failed to fetch media: ${media_eid}`);
        return null;
    }
    return media_entity.entity;
}

function flattenEntuConfiguration(configuration) {
    if (!configuration || !configuration.schedules) {
        console.warn('Invalid configuration structure:', configuration)
        return false
    }

    console.debug('Flattening configuration:', configuration)

    try {
        // Helper function to flatten properties
        const flattenProperty = (obj, prop) => {
            if (!obj || !obj[prop]) return;
            
            // Check if it's an array with objects that have simple types
            if (Array.isArray(obj[prop]) && obj[prop].length > 0) {
                const firstItem = obj[prop][0];
                
                if (firstItem.string !== undefined) {
                    obj[prop] = firstItem.string;
                } else if (firstItem.number !== undefined) {
                    obj[prop] = firstItem.number;
                } else if (firstItem.boolean !== undefined) {
                    obj[prop] = firstItem.boolean;
                } else if (firstItem.datetime !== undefined) {
                    obj[prop] = firstItem.datetime;
                } else if (firstItem.reference !== undefined) {
                    obj[prop] = firstItem.reference;
                }
            }
        }

        console.log('Flattening configuration:', configuration)
        // Bring layout properties to schedule
        // and flatten the schedule properties
        configuration.schedules.forEach(schedule => {
            if (!schedule || !schedule.layout || !schedule.layout.layout_playlists) {
                console.warn('Invalid schedule structure:', schedule)
                return
            }

            // Flatten schedule properties
            flattenProperty(schedule, 'name');
            flattenProperty(schedule, 'crontab');
            flattenProperty(schedule, 'cleanup');
            flattenProperty(schedule, 'ordinal');

            // rename id's
            schedule.eid = schedule._id
            delete schedule._id
            schedule.layout.layoutEid = schedule.layout._id
            delete schedule.layout._id
            
            // camelCase
            schedule.layout.layoutPlaylists = schedule.layout.layout_playlists
            delete schedule.layout.layout_playlists

            // Flatten layout properties
            flattenProperty(schedule.layout, 'name');
            flattenProperty(schedule.layout, 'width');
            flattenProperty(schedule.layout, 'height');

            // bring all properties from layout to schedule
            Object.assign(schedule, schedule.layout)
            delete schedule.layout

            schedule.layoutPlaylists.forEach(layoutPlaylist => {
                if (!layoutPlaylist || !layoutPlaylist.playlist) {
                    console.warn('Invalid layout playlist:', layoutPlaylist)
                    return
                }

                // Flatten layoutPlaylist properties
                flattenProperty(layoutPlaylist, 'left');
                flattenProperty(layoutPlaylist, 'top');
                flattenProperty(layoutPlaylist, 'width');
                flattenProperty(layoutPlaylist, 'height');
                flattenProperty(layoutPlaylist, 'name');
                flattenProperty(layoutPlaylist, 'loop');
                flattenProperty(layoutPlaylist, 'zindex');
                flattenProperty(layoutPlaylist, 'inPixels');

                // rename id's
                layoutPlaylist.eid = layoutPlaylist._id
                delete layoutPlaylist._id
                layoutPlaylist.playlist.playlistEid = layoutPlaylist.playlist._id
                delete layoutPlaylist.playlist._id

                // Flatten playlist properties
                flattenProperty(layoutPlaylist.playlist, 'name');

                // camelCase
                layoutPlaylist.playlist.playlistMedias = layoutPlaylist.playlist.playlist_medias
                delete layoutPlaylist.playlist.playlist_medias

                // bring all properties from playlist to layoutPlaylist
                Object.assign(layoutPlaylist, layoutPlaylist.playlist)
                delete layoutPlaylist.playlist

                if (Array.isArray(layoutPlaylist.playlist_medias)) {
                    layoutPlaylist.playlist_medias.forEach(playlistMedia => {
                        if (!playlistMedia || !playlistMedia.media) {
                            console.warn('Invalid playlist media:', playlistMedia)
                            return
                        }

                        // Flatten playlistMedia properties
                        flattenProperty(playlistMedia, 'duration');
                        flattenProperty(playlistMedia, 'delay');
                        flattenProperty(playlistMedia, 'mute');
                        flattenProperty(playlistMedia, 'ordinal');
                        flattenProperty(playlistMedia, 'stretch');
                        flattenProperty(playlistMedia, 'validFrom');
                        flattenProperty(playlistMedia, 'validTo');
                        
                        // rename id's
                        playlistMedia.eid = playlistMedia._id
                        playlistMedia.playlistMediaEid = playlistMedia._id
                        delete playlistMedia._id
                        playlistMedia.media.mediaEid = playlistMedia.media._id
                        delete playlistMedia.media._id

                        // Flatten media properties
                        flattenProperty(playlistMedia.media, 'name');
                        flattenProperty(playlistMedia.media, 'file');
                        flattenProperty(playlistMedia.media, 'fileName');
                        
                        // camelCase
                        playlistMedia.media.mediaType = playlistMedia.media.type
                        delete playlistMedia.media.type

                        // bring all properties from media to playlistMedia
                        Object.assign(playlistMedia, playlistMedia.media)
                        delete playlistMedia.media
                    })
                }
            })
        })
        return configuration
    } catch (error) {
        console.error('Error flattening configuration:', error)
        return null
    }
}

export async function fetchEntuConfigurations() {
    console.log('Fetching configuration id\'s from entu...')
    try {
        // Use fetchEntitiesByType instead of direct URL construction
        const configurations = await fetchEntitiesByType('sw_configuration')
        
        // console.debug('Fetched configuration id\'s:', configurations)
        const debug_configuration = '5da5a2944ecca5c17a596cb0'
        const filteredConfigurations = configurations
            .filter(config => config._id === debug_configuration)

        // console.debug('Filtered configuration id\'s:', filteredConfigurations)
        const totalConfigurations = filteredConfigurations.length
        let loadedConfigurations = 0

        const updateProgress = () => {
            loadedConfigurations++
            updateProgressBar(Math.round((loadedConfigurations / totalConfigurations) * 100))
        }

        // Use the new service functions to fetch and process configurations
        const fullConfigurations = await Promise.all(
            filteredConfigurations.map(async config => {
                const result = await getConfigurationById(config._id)
                if (!result.configuration) {
                    console.error(`Failed to fetch configuration: ${config._id}`)
                    return null
                }
                
                updateProgress()
                return result
            })
        )
        console.debug('Fetched and processed configurations:', fullConfigurations)
        
        return fullConfigurations
    } catch (error) {
        console.error("Failed to fetch configurations from entu:", error)
        return []
    }
}

export async function fetchEntuScreenGroups() {
    try {
        // Use fetchEntitiesByType instead of direct URL construction
        const screenGroups = await fetchEntitiesByType('sw_screen_group', {
            props: ['name.string', 'configuration.reference', 'published.datetime']
        })
        
        const debug_screen_group = '5da59e6f4ecca5c17a596ca3'
        const filteredScreenGroups = screenGroups
            .filter(screen_group => screen_group._id === debug_screen_group)
        
        return filteredScreenGroups
    } catch (error) {
        console.error("Failed to fetch screen groups:", error)
        return []
    }
}

export async function fetchEntuScreens() {
    try {
        // Use fetchEntitiesByType instead of direct URL construction
        const screens = await fetchEntitiesByType('sw_screen', {
            props: ['name.string', 'screen_group.reference', 'screen_group.string', 'published.string'],
            limit: 10000
        })
        
        const debug_screen = '5da5a9ce4ecca5c17a596cbb'
        const filteredScreens = screens
            .filter(screen => screen.screen_group && screen.screen_group.length > 0)
            .filter(screen => screen._id === debug_screen)

        return filteredScreens
    } catch (error) {
        console.error("Failed to fetch screens:", error)
        return []
    }
}

// Main entry point for the dashboard
export async function groupEntities() {
    const configurations = await fetchEntuConfigurations()
    const screen_groups = await fetchEntuScreenGroups()
    const screens = await fetchEntuScreens()
    const grouped_customers = {}

    for (const screen of screens) {
        const screen_id = screen._id
        const screen_group_id = screen.screen_group[0].reference
        const screen_group = screen_groups.find(sg => sg._id === screen_group_id)
        if (!screen_group) return
        const screen_group_name = screen_group.name[0].string
        const screen_group_published_at = screen_group.published[0].datetime

        const configuration_id = screen_group.configuration[0].reference
        const configuration = configurations.find(c => c._id === configuration_id)
        if (!configuration) return
        const configuration_name = configuration.name[0].string

        const customer_id = configuration._parent[0].reference
        const customer_name = configuration._parent[0].string

        // Group screens under screen groups, screen groups under configurations, and configurations under customers
        if (!grouped_customers[customer_id]) {
            grouped_customers[customer_id] = {
                customerName: customer_name,
                configurations: {}
            }
        }
        if (!grouped_customers[customer_id].configurations[configuration_id]) {
            grouped_customers[customer_id].configurations[configuration_id] = {
                configName: configuration_name,
                screenGroups: {},
                ...configuration
            }
        }
        if (!grouped_customers[customer_id].configurations[configuration_id].screenGroups[screen_group_id]) {
            grouped_customers[customer_id].configurations[configuration_id].screenGroups[screen_group_id] = {
                screen_group_name: screen_group_name,
                published: screen_group_published_at,
                screens: []
            }
        }

        grouped_customers[customer_id].configurations[configuration_id].screenGroups[screen_group_id].screens.push(screen)
    }

    return grouped_customers
}

export async function fetchFromPublisher(id) {
    return await fetchJSON(`${SCREENWERK_PUBLISHER_API}${id}.json`)
}

export async function fetchPublishedScreenGroups(grouped_customers) {
    for (const customerId in grouped_customers) {
        for (const configId in grouped_customers[customerId].configurations) {
            const configuration = grouped_customers[customerId].configurations[configId]
            for (const screenGroupId in configuration.screenGroups) {
                const screenGroup = configuration.screenGroups[screenGroupId]
                // Files at swpublisher are named after screen IDs
                const publisher_id = screenGroup.screens[0]._id
                const screenGroupData = await fetchFromPublisher(publisher_id)
                if (screenGroupData) {
                    screenGroup.configuration = screenGroupData
                    screenGroup.published = screenGroupData.published
                }
            }
        }
    }
}
