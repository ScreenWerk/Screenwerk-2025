// Disclaimer: no semicolons, if unnecessary, are used in this project

import { LinkedList } from '../../../common/utils/linked-list.js'
import { SwMedia } from './SwMedia.js'

export class SwPlaylist extends LinkedList {
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
    resumeMediaElements() {
        const currentMedia = this.getCurrent()
        if (currentMedia) {
            currentMedia.resume()
        }
    }
    pauseMediaElements() {
        const currentMedia = this.getCurrent()
        if (currentMedia) {
            currentMedia.pause()
        }
    }
}