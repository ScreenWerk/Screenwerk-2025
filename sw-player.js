// Disclaimer: no semicolons, if unnecessary, are used in this project

// import { LinkedList } from './linked-list.js'

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
        // console.log('rendering layout', configuration)
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

class SwPlaylist extends LinkedList {
    constructor(parent, dom_element, configuration) {
        super() // Call the super constructor
        this.parent = parent
        this.dom_element = dom_element
        this.medias = []
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.render(configuration)
    }
    render(configuration) {
        // console.log('rendering playlist', configuration)
        this.dom_element.id = configuration.playlistEid
        this.dom_element.setAttribute('name', configuration.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${configuration.playlistEid}`)
        
        // Set position and dimensions using percentage values
        const left = configuration.left + '%'
        const top = configuration.top + '%'
        const width = configuration.width + '%'
        const height = configuration.height + '%'
        
        this.dom_element.style.left = left
        this.dom_element.style.top = top
        this.dom_element.style.width = width
        this.dom_element.style.height = height
        this.dom_element.setAttribute('zindex', configuration.zindex)
        this.dom_element.setAttribute('loop', configuration.loop)

        this.dom_element.classList.add('playlist')
        this.parent.dom_element.appendChild(this.dom_element)

        configuration.playlistMedias.forEach(playlist_media => {
            const media_div = document.createElement('div')
            media_div.style.display = 'none'
            const sw_media = new SwMedia(this, media_div, playlist_media)
            this.add(sw_media)
        })
    }
    play() {
        this.current.play()
    }
}

class SwMedia {
    constructor(parent, dom_element, configuration) {
        this.parent = parent
        this.dom_element = dom_element
        this.type = configuration.type
        if (this.type === 'Image') {
            this.duration = configuration.duration || DEFAULTS.IMAGE_PLAYBACK_DURATION
        }
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.render(configuration)
    }
    render(configuration) {
        // console.log('rendering media', configuration)
        this.dom_element.id = configuration.playlistMediaEid
        this.dom_element.setAttribute('name', configuration.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${configuration.mediaEid}`)
        this.dom_element.setAttribute('type', configuration.type)
        this.dom_element.setAttribute('file', configuration.fileDO)
        this.dom_element.setAttribute('validFrom', configuration.validFrom)
        this.dom_element.setAttribute('validTo', configuration.validTo)
        this.dom_element.setAttribute('ordinal', configuration.ordinal)
        this.dom_element.classList.add('media')
        this.parent.dom_element.appendChild(this.dom_element)

        if (configuration.type === 'Image') {
            const img = document.createElement('img')
            img.src = configuration.fileDO
            img.style.width = '100%'
            img.style.height = '100%'
            // img.style.objectFit = configuration.stretch ? 'cover' : 'contain'
            this.dom_element.appendChild(img)
        } else if (configuration.type === 'Video') {
            const video = document.createElement('video')
            video.src = configuration.fileDO
            video.style.width = '100%'
            video.style.height = '100%'
            video.muted = configuration.mute
            video.loop = false  // Changed to false since we handle looping ourselves
            video.autoplay = false  // Changed to false for explicit control
            // video.style.objectFit = configuration.stretch ? 'cover' : 'contain'
            
            // Set up the ended event listener during initialization
            video.addEventListener('ended', () => {
                const elapsed_ms = new Date().getTime() - this.dom_element.start_ms
                // console.log(`Video ${this.dom_element.id} ended after ${elapsed_ms} ms`)
                this.dom_element.style.display = 'none'
                this.parent.next().play()
            })
            
            this.dom_element.appendChild(video)
            video.pause()  // Ensure it's paused initially
        }
    }
    play() {
        this.dom_element.style.display = 'block'
        this.dom_element.start_ms = new Date().getTime()
        if (this.type === 'Video') {
            const video_div = this.dom_element.querySelector('video')
            video_div.currentTime = 0 // rewind
            const promise = video_div.play()
            if (promise !== undefined) {
                promise.then(_ => {
                    // console.log(`Autoplay started for ${this.dom_element.id}`)
                }).catch(error => {
                    // console.log(`Autoplay failed for ${this.dom_element.id}: ${error}`)
                })
            }
        } else if (this.type === 'Image') {
            console.log(`Image ${this.dom_element.id} started for ${this.duration} s`)
            setTimeout(() => {
                this.dom_element.style.display = 'none'
                const elapsed_ms = new Date().getTime() - this.dom_element.start_ms
                console.log(`Image ${this.dom_element.id} ended after ${elapsed_ms} ms`)
                this.parent.next().play()
            }, this.duration * 1e3)
        }
    }
}

class EntuScreenWerkPlayer {
    constructor(dom_element, configuration) {
        this.dom_element = dom_element
        this.layout = {}
        // clear the player
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.render(configuration)
    }
    render(configuration) {
        const cron_schedules = configuration.schedules.map(schedule => {
            return {
                cron_expression: schedule.crontab,
                schedule_id: schedule.eid
            }
        })
        // console.log('rendering player', configuration)
        // [{ cron_expression, schedule_id }, ...]
        const cron = new Cron(cron_schedules)
        const current_schedule_id = cron.current().schedule_id
        const current_schedule = configuration.schedules.find(schedule => schedule.eid === current_schedule_id)
        const layout_div = document.createElement('div')
        const sw_layout = new SwLayout(this, layout_div, current_schedule)
        this.layout = sw_layout
    }

    play() {
        this.layout.play()
    }

    stop() {
    }
}

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