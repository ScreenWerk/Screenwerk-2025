// Disclaimer: no semicolons, if unnecessary, are used in this project

import { LinkedList } from '../../../common/utils/linked-list.js'
import { SwMedia } from './SwMedia.js'
import { ENVIRONMENT, UI_VISIBILITY } from '../../../common/config/constants.js'

export class SwPlaylist extends LinkedList {
    constructor(parent, dom_element, configuration) {
        super() // Call the super constructor
        this.parent = parent
        this.dom_element = dom_element
        this.medias = []
        
        // Store a reference to this playlist in the DOM element for easier access
        this.dom_element.playlist = this
        
        while (this.dom_element.firstChild) {
            this.dom_element.removeChild(this.dom_element.firstChild)
        }
        this.render(configuration)
    }
    render(configuration) {
        console.log('Rendering playlist', configuration)
        this.dom_element.id = configuration.playlistEid
        this.dom_element.setAttribute('name', configuration.name)
        this.dom_element.setAttribute('entu', `https://entu.app/piletilevi/${configuration.playlistEid}`)
        
        // Set position and dimensions using percentage values
        const left = configuration.left + '%'
        const top = configuration.top + '%'
        const width = configuration.width + '%'
        const height = configuration.height + '%'
        
        // Apply styles to the playlist container
        this.dom_element.style.position = 'absolute'
        this.dom_element.style.overflow = 'hidden'
        this.dom_element.style.left = left
        this.dom_element.style.top = top
        this.dom_element.style.width = width
        this.dom_element.style.height = height
        this.dom_element.style.zIndex = configuration.zindex || 0
        
        this.dom_element.setAttribute('zindex', configuration.zindex)
        this.dom_element.setAttribute('loop', configuration.loop)

        this.dom_element.classList.add('playlist')
        this.parent.dom_element.appendChild(this.dom_element)

        // Create a debug overlay for this playlist
        const ui = (typeof UI_VISIBILITY !== 'undefined' && typeof ENVIRONMENT !== 'undefined')
            ? (UI_VISIBILITY[ENVIRONMENT] || UI_VISIBILITY.dev)
            : { showDebugPanel: true }
        if (window.debugMode && ui.showDebugPanel) {
            const debugOverlay = document.createElement('div')
            debugOverlay.className = 'playlist-debug'
            debugOverlay.style.position = 'absolute'
            debugOverlay.style.top = '0'
            debugOverlay.style.left = '0'
            debugOverlay.style.padding = '5px'
            debugOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)'
            debugOverlay.style.color = 'white'
            debugOverlay.style.fontSize = '10px'
            debugOverlay.style.zIndex = '1000'
            debugOverlay.textContent = `Playlist: ${configuration.name}`
            this.dom_element.appendChild(debugOverlay)
        }

        // Check if playlistMedias exists and has items
        if (!configuration.playlistMedias || configuration.playlistMedias.length === 0) {
            console.error(`Playlist ${configuration.name} has no media items`)
            
            // Create an error message
            const errorMsg = document.createElement('div')
            errorMsg.style.position = 'absolute'
            errorMsg.style.top = '50%'
            errorMsg.style.left = '50%'
            errorMsg.style.transform = 'translate(-50%, -50%)'
            errorMsg.style.color = 'red'
            errorMsg.style.backgroundColor = 'rgba(0,0,0,0.7)'
            errorMsg.style.padding = '10px'
            errorMsg.textContent = 'No media items found in this playlist'
            this.dom_element.appendChild(errorMsg)
            return
        }

        // Create media elements
        configuration.playlistMedias.forEach(playlist_media => {
            const media_div = document.createElement('div')
            media_div.style.display = 'none'
            const sw_media = new SwMedia(this, media_div, playlist_media)
            this.add(sw_media)
        })
    }
    play() {
        const currentMedia = this.getCurrent()
        if (currentMedia) {
            console.log(`Starting playback with media: ${currentMedia.name}`)
            this.debugPrintList() // Add debug info
            currentMedia.play()
        } else {
            console.error('No current media found to play')
            // Try to move to first item
            if (this.moveToBeginning()) {
                const firstMedia = this.getCurrent()
                if (firstMedia) {
                    console.log('Starting playback with first media')
                    this.debugPrintList() // Add debug info
                    firstMedia.play()
                } else {
                    console.error('Failed to get first media after moveToBeginning')
                }
            } else {
                console.error('Failed to move to beginning of playlist')
            }
        }
    }
    
    // Override the next method to add logging
    next() {
        if (!this.head) {
            console.error('LinkedList is empty in next()')
            return false
        }
        
        if (!this.current) {
            console.error('No current node in LinkedList in next()')
            return this.first() // Try to move to first
        }
        
        console.log(`Before next(): Current media is ${this.current.value.name}`)
        
        if (this.current.next) {
            console.log(`Moving to next node: ${this.current.next.value.name}`)
            this.current = this.current.next
            console.log(`After next(): Current media is now ${this.current.value.name}`)
            return true
        } else {
            // Loop back to beginning
            console.log(`Reached end of LinkedList, looping back to beginning`)
            this.current = this.head
            console.log(`After looping: Current media is now ${this.current.value.name}`)
            return true
        }
    }
    resumeMediaElements() {
        console.log(`Resuming media elements in playlist ${this.dom_element.id}`)
        const currentMedia = this.getCurrent()
        if (currentMedia) {
            console.log(`Found current media to resume: ${currentMedia.name}`)
            currentMedia.resume()
        } else {
            // If there's no current media but we have items in the list,
            // try to move to the beginning and start playing
            console.log(`No current media found, trying to start from beginning`)
            this.moveToBeginning()
            const firstMedia = this.getCurrent()
            if (firstMedia) {
                console.log(`Starting playback with first media: ${firstMedia.name}`)
                firstMedia.play()
            } else {
                console.error(`Failed to find any media to play in playlist ${this.dom_element.id}`)
            }
        }
    }
    pauseMediaElements() {
        const currentMedia = this.getCurrent()
        if (currentMedia) {
            currentMedia.pause()
        }
    }
    
    moveToBeginning() {
        console.log('Moving playlist to beginning')
        
        // Check if the list has any items
        if (!this.head) {
            console.error('Cannot move to beginning: playlist is empty')
            return false
        }
        
        // Reset the list to the beginning
        return this.first() // Use the first() method from LinkedList
    }
    
    // Debug method to help with diagnostics
    debugPrintList() {
        console.log('--- Playlist Debug Info ---');
        console.log(`Playlist: ${this.dom_element.getAttribute('name')}`);
        
        if (!this.head) {
            console.log('List is empty');
            return;
        }
        
        let node = this.head;
        let count = 0;
        let currentMarker = '';
        
        while (node) {
            currentMarker = (node === this.current) ? ' (CURRENT)' : '';
            console.log(`Media ${count++}: ${node.value.name}${currentMarker}`);
            node = node.next;
        }
        
        console.log('------------------------');
    }
}