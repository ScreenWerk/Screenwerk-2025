import { fetchJSON } from '../../common/utils/utils.js'
import { ENTU_ENTITY_URL, SCREENWERK_PUBLISHER_API } from '../../common/config/constants.js' // Updated path
import ConfigValidator from '../../common/validators/config-validator.js' // Updated path
import { updateProgressBar } from './display.js'

async function fillEntuConfiguration(configuration_eid, updateProgress) {
    const url = `${ENTU_ENTITY_URL}/${configuration_eid}`
    const configuration_entity = await fetchJSON(url)
    if (!configuration_entity) {
        throw new Error(`Failed to fetch configuration: ${configuration_eid}`)
    }
    const configuration = configuration_entity.entity
    const schedule_props = ''
    const schedule_entities = await fetchJSON(`${ENTU_ENTITY_URL}?_type.string=sw_schedule&_parent.reference=${configuration_eid}${schedule_props}`)
    if (!schedule_entities) {
        console.error(`Failed to fetch schedules for configuration: ${configuration_eid}`)
        return false
    }
    configuration.schedules = schedule_entities.entities
    if (configuration.schedules.length === 0) {
        console.debug(`No schedules found for configuration: ${configuration_eid}`)
        return false
    }
    for (let schedule of configuration.schedules) {
        const layout_eid = schedule.layout[0].reference
        let layout_entity = await fetchJSON(`${ENTU_ENTITY_URL}/${layout_eid}`)
        if (!layout_entity) {
            console.warn(`Failed to fetch layout: ${layout_eid}`)
            continue
        }
        schedule.layout = layout_entity.entity
        const layout_playlist_props = ''
        let layout_playlists_entities = await fetchJSON(`${ENTU_ENTITY_URL}?_type.string=sw_layout_playlist&_parent.reference=${layout_eid}${layout_playlist_props}`)
        if (!layout_playlists_entities) {
            console.warn(`Failed to fetch layout-playlists for layout: ${layout_eid}`)
            continue
        }
        let filled_layout_playlists = layout_playlists_entities.entities.filter(lp => lp.playlist)
        schedule.layout.layout_playlists = filled_layout_playlists
        if (schedule.layout.layout_playlists.length === 0) {
            console.debug(`No valid layout-playlists found for layout: ${layout_eid}`)
            continue
        }
        for (const layout_playlist of schedule.layout.layout_playlists) {
            const playlist_eid = layout_playlist.playlist[0].reference
            const playlist_entity = await fetchJSON(`${ENTU_ENTITY_URL}/${playlist_eid}`)
            if (!playlist_entity) {
                console.warn(`Failed to fetch playlist: ${playlist_eid}`)
                continue
            }
            layout_playlist.playlist = playlist_entity.entity
            const playlist_media_props = ''
            const playlist_medias_entities = await fetchJSON(`${ENTU_ENTITY_URL}?_type.string=sw_playlist_media&_parent.reference=${playlist_eid}${playlist_media_props}`)
            if (!playlist_medias_entities) {
                console.warn(`Failed to fetch playlist-medias for playlist: ${playlist_eid}`)
                continue
            }
            layout_playlist.playlist.playlist_medias = playlist_medias_entities.entities
            if (layout_playlist.playlist.playlist_medias.length === 0) {
                console.debug(`No playlist-medias found for playlist: ${playlist_eid}`)
                continue
            }
            for (const playlist_media of layout_playlist.playlist.playlist_medias) {
                const media_eid = playlist_media.media[0].reference
                const media_entity = await fetchJSON(`${ENTU_ENTITY_URL}/${media_eid}`)
                if (!media_entity) {
                    console.warn(`Failed to fetch media: ${media_eid}`)
                    continue
                }
                playlist_media.media = media_entity.entity
            }
            layout_playlist.playlist.playlist_medias = layout_playlist.playlist.playlist_medias.filter(pm => pm.media && pm.media.length > 0)
        }
        schedule.layout.layout_playlists = schedule.layout.layout_playlists.filter(lp => lp.playlist)
    }
    configuration.schedules = configuration.schedules.filter(s => s.layout)
    if (configuration.schedules.length === 0) {
        console.warn(`No valid schedules found for configuration: ${configuration_eid}`, configuration)
        return false
    }
    updateProgress()
    return configuration
}

function flattenEntuConfiguration(configuration) {
    if (!configuration || !configuration.schedules) {
        console.warn('Invalid configuration structure:', configuration)
        return null
    }

    try {
        const validator = new ConfigValidator(configuration)
        const validationResult = validator.validate()
        if (!validationResult.isValid) {
            console.warn('Configuration validation failed:', validationResult.errors)
            return null
        }

        configuration.schedules.forEach(schedule => {
            if (!schedule || !schedule.layout || !schedule.layout.layout_playlists) {
                console.warn('Invalid schedule structure:', schedule)
                return
            }

            // rename id's
            schedule.eid = schedule._id
            delete schedule._id
            schedule.layout.layoutEid = schedule.layout._id
            delete schedule.layout._id
            
            // camelCase
            schedule.layout.layoutPlaylists = schedule.layout.layout_playlists
            delete schedule.layout.layout_playlists

            // bring all properties from layout to schedule
            Object.assign(schedule, schedule.layout)
            delete schedule.layout

            schedule.layoutPlaylists.forEach(layoutPlaylist => {
                if (!layoutPlaylist || !layoutPlaylist.playlist) {
                    console.warn('Invalid layout playlist:', layoutPlaylist)
                    return
                }

                // rename id's
                layoutPlaylist.eid = layoutPlaylist._id
                delete layoutPlaylist._id
                layoutPlaylist.playlist.playlistEid = layoutPlaylist.playlist._id
                delete layoutPlaylist.playlist._id

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

                        // rename id's
                        playlistMedia.eid = playlistMedia._id
                        playlistMedia.playlistMediaEid = playlistMedia._id // for some reason, this is the naming in API
                        delete playlistMedia._id
                        playlistMedia.media.mediaEid = playlistMedia.media._id
                        delete playlistMedia.media._id

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

export async function fetchFromPublisher(id) {
    return await fetchJSON(`${SCREENWERK_PUBLISHER_API}${id}.json`)
}

export async function fetchEntuConfigurations() {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_configuration&props=name.string,_parent.reference,_parent.string`
    try {
        const data = await fetchJSON(url)
        const totalConfigurations = data.entities.length
        let loadedConfigurations = 0

        const updateProgress = () => {
            loadedConfigurations++
            updateProgressBar(Math.round((loadedConfigurations / totalConfigurations) * 100))
        }

        const fullConfigurations = await Promise.all(
            data.entities.map(config => fillEntuConfiguration(config._id, updateProgress))
        )

        const flattenedConfigurations = fullConfigurations
            .filter(config => config)
            .map(flattenEntuConfiguration)

        const valid_entu_configurations = flattenedConfigurations
            .filter(validateConfiguration)
        if (valid_entu_configurations.length === 0) {
            throw new Error("All configurations are invalid")
        }
        return valid_entu_configurations
    } catch (error) {
        console.error("Failed to fetch configurations from entu:", error)
        return []
    }
}

export async function fetchEntuScreenGroups() {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_screen_group&props=name.string,configuration.reference,published.datetime`
    try {
        const data = await fetchJSON(url)
        return data.entities
    } catch (error) {
        console.error("Failed to fetch screen groups:", error)
        return []
    }
}

export async function fetchEntuScreens() {
    const url = `${ENTU_ENTITY_URL}?_type.string=sw_screen&props=name.string,screen_group.reference,screen_group.string,published.string&limit=10000`
    try {
        const data = await fetchJSON(url)
        return data.entities
            // Filter out screens, that are not related to any screen group
            .filter(screen => screen.screen_group && screen.screen_group.length > 0)
    } catch (error) {
        console.error("Failed to fetch screens:", error)
        return []
    }
}

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
