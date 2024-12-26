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


const DEFAULTS = {
    IMAGE_PLAYBACK_DURATION: 10
}
class SwLayout {
    constructor(parent, dom_element, configuration) {
        this.parent = parent
        this.dom_element = dom_element
        this.playlists = []
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.render(configuration)
    }
    render(configuration) {
        console.log('rendering layout', configuration)
        this.dom_element.id = configuration.layoutEid
        this.dom_element.setAttribute('name', configuration.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${configuration.layoutEid}`)
        this.dom_element.setAttribute('crontab', configuration.crontab)
        this.dom_element.setAttribute('cleanup', configuration.cleanup ? 'true' : 'false')
        this.dom_element.classList.add('layout')
        this.parent.dom_element.appendChild(this.dom_element)

        configuration.layoutPlaylists.forEach(layout_playlist => {
            const playlist_div = document.createElement('div')
            const sw_playlist = new SwPlaylist(this, playlist_div, layout_playlist)
            this.playlists.push(sw_playlist)
        })
    }
    play() {
        this.playlists.forEach(playlist => {
            playlist.play()
        })
    }
}

class SwPlaylist {
    constructor(parent, dom_element, configuration) {
        this.parent = parent
        this.dom_element = dom_element
        this.medias = []
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.render(configuration)
    }
    render(configuration) {
        console.log('rendering playlist', configuration)
        this.dom_element.id = configuration.playlistEid
        this.dom_element.setAttribute('name', configuration.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${configuration.playlistEid}`)
        this.dom_element.setAttribute('left', configuration.left)
        this.dom_element.setAttribute('top', configuration.top)
        this.dom_element.setAttribute('width', configuration.width)
        this.dom_element.setAttribute('height', configuration.height)
        this.dom_element.setAttribute('zindex', configuration.zindex)
        this.dom_element.setAttribute('loop', configuration.loop)

        this.dom_element.classList.add('playlist')
        this.parent.dom_element.appendChild(this.dom_element)

        configuration.playlistMedias.forEach(playlist_media => {
            const media_div = document.createElement('div')
            const sw_media = new SwMedia(this, media_div, playlist_media)
            this.medias.push(sw_media)
            if (this.medias.length === 1) {
                sw_media.next_media = sw_media
                sw_media.prev_media = sw_media
            } else {
                this.medias[this.medias.length - 2].next_media = sw_media
                this.medias[0].prev_media = sw_media
                sw_media.prev_media = this.medias[this.medias.length - 2]
                sw_media.next_media = this.medias[0]
            }
        })
    }
    play() {
        this.medias.forEach(media => {
            media.dom_element.style.display = 'none'
        })
        this.medias[0].play()
    }
}

class SwMedia {
    constructor(parent, dom_element, configuration) {
        this.parent = parent
        this.dom_element = dom_element
        this.type = configuration.type
        this.prev_media = null
        this.next_media = null
        if (this.type === 'Image') {
            this.duration = configuration.duration || DEFAULTS.IMAGE_PLAYBACK_DURATION
        }
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.render(configuration)
    }
    render(configuration) {
        console.log('rendering media', configuration)
        this.dom_element.id = configuration.playlistMediaEid
        this.dom_element.setAttribute('name', configuration.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${configuration.mediaEid}`)
        this.dom_element.setAttribute('type', configuration.type)
        this.dom_element.setAttribute('file', configuration.file)
        this.dom_element.setAttribute('validFrom', configuration.validFrom)
        this.dom_element.setAttribute('validTo', configuration.validTo)
        this.dom_element.setAttribute('ordinal', configuration.ordinal)
        this.dom_element.classList.add('media')
        this.parent.dom_element.appendChild(this.dom_element)

        if (configuration.type === 'Image') {
            const img = document.createElement('img')
            img.src = configuration.file
            img.style.width = '100%'
            img.style.height = '100%'
            img.style.objectFit = configuration.stretch ? 'cover' : 'contain'
            this.dom_element.appendChild(img)
        } else if (configuration.type === 'Video') {
            const video = document.createElement('video')
            video.src = configuration.file
            video.style.width = '100%'
            video.style.height = '100%'
            video.muted = configuration.mute
            video.loop = false  // Changed to false since we handle looping ourselves
            video.autoplay = false  // Changed to false for explicit control
            video.style.objectFit = configuration.stretch ? 'cover' : 'contain'
            
            // Set up the ended event listener during initialization
            video.addEventListener('ended', () => {
                console.log('video ended')
                this.dom_element.style.display = 'none'
                this.next_media.play()
            })
            
            this.dom_element.appendChild(video)
            video.pause()  // Ensure it's paused initially
        }
    }
    play() {
        this.dom_element.style.display = 'block'
        if (this.type === 'Video') {
            const video_div = this.dom_element.querySelector('video')
            video_div.currentTime = 0
            const promise = video_div.play()
            if (promise !== undefined) {
                promise.then(_ => {
                    console.log('Autoplay started')
                }).catch(error => {
                    console.log('Autoplay was prevented:', error)
                })
            }
        } else if (this.type === 'Image') {
            setTimeout(() => {
                this.dom_element.style.display = 'none'
                this.next_media.play()
            }, this.duration * 1e3)
        }
    }
}

class EntuScreenWerkPlayer {
    constructor(dom_element, configuration) {
        this.dom_element = dom_element
        this.layouts = []
        // clear the player
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.render(configuration)
    }
    render(configuration) {
        console.log('rendering player', configuration)
        configuration.schedules.forEach(schedule => {
            const layout_div = document.createElement('div')
            const sw_layout = new SwLayout(this, layout_div, schedule)
            this.layouts.push(sw_layout)
        })
    }

    play() {
        this.layouts.forEach(layout => {
            layout.play()
        })
    }

    stop() {
    }
}