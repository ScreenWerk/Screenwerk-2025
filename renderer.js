/* Sample data:
{
    "_mid": 7472,
    "configurationEid": "5541ec554ecca5c17a5992da",
    "screenGroupEid": "5541ec724ecca5c17a5992dc",
    "screenEid": "5799c2744ecca5c17a599ecd",
    "publishedAt": "2024-12-12T11:55:06.221Z",
    "updateInterval": 1,
    "schedules": [
      {
        "eid": "5541ee914ecca5c17a5992e5",
        "cleanup": true,
        "crontab": "0 * * * *",
        "ordinal": 1,
        "layoutEid": "5541ec454ecca5c17a5992d9",
        "name": "BP RIMI FullScreenLive Layout",
        "width": 0,
        "height": 0,
        "layoutPlaylists": [
          {
            "eid": "5541ee364ecca5c17a5992e4",
            "name": "Bilietai Live Playlist",
            "left": 0,
            "top": 0,
            "width": 100,
            "height": 100,
            "inPixels": false,
            "zindex": 1,
            "loop": true,
            "playlistEid": "5541ec244ecca5c17a5992d8",
            "playlistMedias": [
              {
                "playlistMediaEid": "65c9a4894ecca5c17a598559",
                "duration": 8,
                "delay": 0,
                "mute": false,
                "ordinal": 4,
                "stretch": false,
                "mediaEid": "65c9a2fe4ecca5c17a598558",
                "file": "https://entu.app/api/piletilevi/property/65c9a3364ecca5c17a600673?download=true",
                "fileName": "Auksinis 1920x1080.jpg",
                "name": "blt_dc_2024_12-31",
                "type": "Image",
                "validFrom": "2024-02-11T20:00:00.000Z",
                "validTo": "2024-12-30T20:00:00.000Z"
              },
              {
                "playlistMediaEid": "657197964ecca5c17a598419",
                "duration": 8,
                "delay": 0,
                "mute": false,
                "ordinal": 8,
                "stretch": false,
                "mediaEid": "657195ce4ecca5c17a598418",
                "file": "https://entu.app/api/piletilevi/property/657196e54ecca5c17a5fe3fe?download=true",
                "fileName": "1920x1080_SEL_kasu-ekranai.png",
                "name": "blt_sel_2024 12 14",
                "type": "Image",
                "validFrom": "2023-12-06T20:00:00.000Z",
                "validTo": "2024-12-14T20:00:00.000Z"
              }
            ]
          }
        ]
      }
    ]
  }
*/

const sw_render = (dom_element, configuration) => {

    const renderPlaylist = (dom_element, configuration) => {
        // There are medias in the playlist.
        // For every playlistMedia in playlist, create a new div
        // and append it to the dom_element as media.

        configuration.playlistMedias.forEach(playlist_media => {
            const media_div = document.createElement('div')
            media_div.id = playlist_media.playlistMediaEid
            media_div.setAttribute('name', playlist_media.name)
            media_div.setAttribute('entu', `https://entu.app/piletilevi/${playlist_media.mediaEid}`)
            media_div.setAttribute('duration', playlist_media.duration)
            media_div.setAttribute('type', playlist_media.type)
            media_div.setAttribute('file', playlist_media.file)
            media_div.setAttribute('stretch', playlist_media.stretch)
            media_div.setAttribute('validFrom', playlist_media.validFrom)
            media_div.setAttribute('validTo', playlist_media.validTo)
            media_div.setAttribute('ordinal', playlist_media.ordinal)
            media_div.classList.add('media')
            dom_element.appendChild(media_div)
            playlist_media.dom_element = media_div

            if (playlist_media.type === 'Image') {
                const img = document.createElement('img')
                img.src = playlist_media.file
                img.style.width = '100%'
                img.style.height = '100%'
                img.style.objectFit = playlist_media.stretch ? 'cover' : 'contain'
                media_div.appendChild(img)
            } else if (playlist_media.type === 'Video') {
                const video = document.createElement('video')
                video.src = playlist_media.file
                video.style.width = '100%'
                video.style.height = '100%'
                video.muted = playlist_media.mute
                video.loop = true
                video.autoplay = true
                video.style.objectFit = playlist_media.stretch ? 'cover' : 'contain'
                media_div.appendChild(video)
            }
        })
    }

    const renderLayout = (dom_element, configuration) => {
        // There are playlists on the layout.
        // For every layoutPlaylist in configuration, create a new div
        // and append it to the dom_element as playlist.
        // Then call for renderPlaylist subroutine.
        configuration.layoutPlaylists.forEach(layout_playlist => {
            const playlist_div = document.createElement('div')
            playlist_div.id = layout_playlist.playlistEid
            playlist_div.setAttribute('name', layout_playlist.name)
            playlist_div.setAttribute('entu', `https://entu.app/piletilevi/${layout_playlist.playlistEid}`)

            playlist_div.setAttribute('top', layout_playlist.top)
            playlist_div.setAttribute('left', layout_playlist.left)
            playlist_div.setAttribute('width', layout_playlist.width)
            playlist_div.setAttribute('height', layout_playlist.height)

            playlist_div.classList.add('playlist')
            dom_element.appendChild(playlist_div)
            layout_playlist.dom_element = playlist_div
            renderPlaylist(playlist_div, layout_playlist)
        })
    }

    // For every schedule in configuration, create a new div
    // and append it to the dom_element as layout.
    // Then call for renderLayout subroutine.
    configuration.schedules.forEach(schedule => {
        const layout_div = document.createElement('div')
        layout_div.id = schedule.layoutEid
        layout_div.setAttribute('name', schedule.name)
        layout_div.setAttribute('entu', `https://entu.app/piletilevi/${schedule.layoutEid}`)
        layout_div.setAttribute('crontab', schedule.crontab)
        layout_div.setAttribute('cleanup', schedule.cleanup ? 'true' : 'false')
        
        layout_div.classList.add('layout')
        dom_element.appendChild(layout_div)
        renderLayout(layout_div, schedule)
    })

}