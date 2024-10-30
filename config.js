// sw_screen belongs to sw_screen_group.
// sw_screen_group belongs to sw_configuration.
//
// Data model
//
// sw_configuration
//   sw_screen_group
//     sw_screen
//   sw_schedule
//     sw_layout
//       sw_layout_playlist
//         sw_playlist
//           sw_playlist_media
//             sw_media

// get()
// 1. check, if remote is more recent than local
// 1.1. if so, fetch sw_schedule tree
// 1.2. compile and store sw_schedule tree as screen's configuration
// 2. read compiled configuration from localstore and return it

const hostname = 'entu.app/api'
const account = 'piletilevi'

async function getConfiguration(callback) {
  const selectedScreen = JSON.parse(localStorage.getItem('selectedScreen'))
  const screen_id = selectedScreen.id
  const screen_group_id = selectedScreen.screen_group_id

  // true, if selected screen has saved schedule in localStore
  const compiled = `schedule_${screen_id}` in localStorage
  // null, if selected screen has no saved schedule in localStore
  const compiled_schedule = JSON.parse(localStorage.getItem(`schedule_${screen_id}`))
  const local_published = compiled ? compiled_schedule.published[0].string : '0'

  // read remote screen
  const remote_screen = await fetchEntity(screen_id)
  const remote_published = remote_screen.published[0].string

  if (compiled && remote_published <= local_published) {
    callback(compiled_schedule)
    return compiled_schedule
  } else {
    // fetch remote configuration
    const sw_screen_group = await fetchEntity(screen_group_id)
    if (!sw_screen_group) {
      console.log('sw_screen_group not found')
      throw new Error('sw_screen_group not found')
    }
    if (!sw_screen_group.configuration) {
      console.log('configuration not found')
      throw new Error('configuration not found')
    }
    const configuration_id = sw_screen_group.configuration[0].reference
    
    // fetch schedules using the configuration
    const sw_schedules = await fetchChilds(configuration_id, 'sw_schedule')
    if (!sw_schedules) {
      console.log('sw_schedules not found')
      throw new Error('sw_schedules not found')
    }

    // fetch remote schedule.layout
    for (const sw_schedule of sw_schedules) {
      await expandProperty(sw_schedule, 'layout')
      const sw_layout = sw_schedule.layout[0].entity
      const sw_layout_id = sw_layout._id
      const sw_layout_playlists = await fetchChilds(sw_layout_id, 'sw_layout_playlist')
      if (!sw_layout_playlists) {
        console.log('sw_layout_playlists not found')
        throw new Error('sw_layout_playlists not found')
      }
      sw_layout.playlists = sw_layout_playlists

      for (const sw_layout_playlist of sw_layout_playlists) {
        await expandProperty(sw_layout_playlist, 'playlist')
        const sw_playlist = sw_layout_playlist.playlist[0].entity
        const sw_playlist_id = sw_playlist._id
        const sw_playlist_medias = await fetchChilds(sw_playlist_id, 'sw_playlist_media')
        if (!sw_playlist_medias) {
          console.log('sw_playlist_medias not found')
          throw new Error('sw_playlist_medias not found')
        }
        console.log(`sw_playlist_medias: ${sw_playlist_medias.length}`)
        console.log(sw_playlist_medias)
        sw_playlist.medias = sw_playlist_medias

        for (const sw_playlist_media of sw_playlist_medias) {
          await expandProperty(sw_playlist_media, 'media')
        }
      }
    }
    callback(sw_schedules)
    // callback(distill(sw_schedules))
    return sw_schedules
  }
}

const expandProperty = async(entity, property) => {
  for (const item of entity[property]) {
    const id = item.reference
    try {
      item.entity = await fetchEntity(id)
    } catch (error) {
      console.log(`Error fetching ${property} ${id}: ${error.message}`)
    }
  }
}


const fetchChilds = async (id, type = null) => {
  let e_type = ''
  if (type) {
    e_type = `_type.string=${type}&`
  }
  const url = `https://${hostname}/${account}/entity?${e_type}_parent.reference=${id}`
  try {
    const response = await fetch(url)
    const data = await response.json()
    return data.entities
  } catch (error) {
    console.log(`Error fetching childs ${id}: ${error.message}`)
    return null
  }
}

const fetchEntity = async (id) => {
  const url = `https://${hostname}/${account}/entity/${id}`
  try {
    const response = await fetch(url)
    console.log(response)
    const data = await response.json()
    return data.entity
  } catch (error) {
    console.log(`Error fetching entity ${id}: ${error.message}`)
    return null
  }
}

// distill configuration to have only information essential
// for player
const distill = (conf_in) => {
  const conf_out = conf_in.map(schedule => {
    return {
      _id: schedule._id,
      cleanup: schedule.cleanup[0].boolean,
      crontab: schedule.crontab[0].string,
      layout: {
        _id: schedule.layout[0].entity._id,
        name: schedule.layout[0].entity.name[0].string,
        playlists: schedule.layout[0].entity.playlists.map(layout_playlist => {
          const sw_playlist = layout_playlist.playlist[0].entity
          return {
            lp_id: layout_playlist._id, // of layout_playlist
            // lp_name: layout_playlist.name[0].string,
            _id: sw_playlist._id,
            name: sw_playlist.name[0].string,
            height: layout_playlist.height[0].number,
            width: layout_playlist.width[0].number,
            top: layout_playlist.top[0].number,
            left: layout_playlist.left[0].number,
            loop: layout_playlist.loop[0].boolean,
            medias: sw_playlist.medias.map(playlist_media => {
              const sw_media = playlist_media.media[0].entity
              return {
                pm_id: playlist_media._id,
                // pm_name: playlist_media.name[0].string,
                _id: sw_media._id,
                name: sw_media.name[0].string,
                type: sw_media.type[0].string,
                file: sw_media.file[0],
              }
            })
          }
        })
      }
    }    
  })
  return conf_out
}