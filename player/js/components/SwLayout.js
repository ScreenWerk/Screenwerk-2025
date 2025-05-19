// Disclaimer: no semicolons, if unnecessary, are used in this project

import { SwPlaylist } from './SwPlaylist.js'
import { debugLog } from '../../../common/utils/debug-utils.js' // Updated path

export class SwLayout {
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
        // console.log('Rendering layout', configuration)
        this.dom_element.id = configuration.layoutEid
        this.dom_element.setAttribute('name', configuration.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${configuration.layoutEid}`)
        this.dom_element.setAttribute('crontab', configuration.crontab)
        this.dom_element.setAttribute('cleanup', configuration.cleanup ? 'true' : 'false')
        this.dom_element.classList.add('layout')
        
        // Set attributes and styles for the layout container
        this.dom_element.className = 'layout-container'
        this.dom_element.style.position = 'relative'
        this.dom_element.style.width = '100%'
        this.dom_element.style.height = '100%'
        this.dom_element.style.overflow = 'hidden'
        this.dom_element.style.backgroundColor = '#000' // Ensure black background

        // Append the layout container to the parent
        if (this.parent.dom_element) {
            this.parent.dom_element.appendChild(this.dom_element)
        } else if (this.parent.element) {
            this.parent.element.appendChild(this.dom_element)
        }

        configuration.layoutPlaylists.forEach(layout_playlist => {
            const playlist_div = document.createElement('div')
            const sw_playlist = new SwPlaylist(this, playlist_div, layout_playlist)
            this.playlists.push(sw_playlist)
        })
    }
    resumeMediaElements() {
        this.playlists.forEach(playlist => {
            playlist.resumeMediaElements()
        })
    }
    pauseMediaElements() {
        this.playlists.forEach(playlist => {
            playlist.pauseMediaElements()
        })
    }
}