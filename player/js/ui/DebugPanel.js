import { UI_VISIBILITY } from '../../../common/config/constants.js'

// Disclaimer: no semicolons, if unnecessary, are used in this project

export class DebugPanel {
    constructor(parent, options) {
        this.parent = parent
        this.options = options || {}
        this.element = this.createPanel()
        this.statusIndicator = this.element.querySelector('.debug-status')
        this.infoDisplay = this.element.querySelector('.debug-info')
    }
    
    createPanel() {
        const debugPanel = document.createElement('div')
        debugPanel.className = 'debug-panel'
        debugPanel.style.position = 'absolute'
        debugPanel.style.top = '0'
        debugPanel.style.left = '0'
        debugPanel.style.padding = '5px'
        debugPanel.style.background = 'rgba(0,0,0,0.5)'
        debugPanel.style.color = 'white'
        debugPanel.style.fontSize = '10px'
        debugPanel.style.zIndex = '9999'
        
        // Add play/pause button
        const playPauseBtn = document.createElement('button')
        playPauseBtn.textContent = '⏯️'
        playPauseBtn.style.marginRight = '5px'
        playPauseBtn.addEventListener('click', () => {
            if (this.options.onTogglePlayback) {
                this.options.onTogglePlayback()
            }
        })
        
        // Add next button
        const nextBtn = document.createElement('button')
        nextBtn.textContent = '⏭️'
        nextBtn.style.marginRight = '5px'
        nextBtn.addEventListener('click', () => {
            if (this.options.onNextMedia) {
                this.options.onNextMedia()
            }
        })
        
        // Add status indicator
        const statusIndicator = document.createElement('span')
        statusIndicator.className = 'debug-status'
        statusIndicator.textContent = '▶️ Playing'
        
        // Add info display
        const infoDisplay = document.createElement('div')
        infoDisplay.className = 'debug-info'
        infoDisplay.style.fontSize = '8px'
        
        // Assemble debug panel
        debugPanel.appendChild(playPauseBtn)
        debugPanel.appendChild(nextBtn)
        debugPanel.appendChild(statusIndicator)
        debugPanel.appendChild(infoDisplay)
        
        // Hide the panel if not allowed in this environment
        const ui = UI_VISIBILITY
        if (!ui.showDebugPanel) {
            debugPanel.style.display = 'none'
        }

        this.parent.appendChild(debugPanel)
        return debugPanel
    }
    
    updateStatus(isPlaying, currentMedia) {
        if (this.statusIndicator) {
            this.statusIndicator.textContent = isPlaying ? '▶️ Playing' : '⏸️ Paused'
        }
        
        if (this.infoDisplay) {
            if (currentMedia) {
                const mediaId = currentMedia.getAttribute('data-media-eid')
                const mediaType = currentMedia.querySelector('video') ? 'Video' : 'Image'
                this.infoDisplay.textContent = `Current: ${mediaType} (${mediaId})`
            } else {
                this.infoDisplay.textContent = 'No media playing'
            }
        }
    }
}
