// Disclaimer: no semicolons, if unnecessary, are used in this project

export class ProgressBar {
    constructor(parent, options = {}) {
        this.parent = parent
        this.options = options
        
        // Create the progress bar elements
        const container = document.createElement('div')
        container.className = 'media-progress-container'
        container.style.position = 'absolute'
        container.style.bottom = '0'
        container.style.left = '0'
        container.style.width = '100%'
        container.style.height = options.height || '4px'
        container.style.backgroundColor = options.backgroundColor || 'rgba(0,0,0,0.3)'
        container.style.zIndex = options.zIndex || '5'
        
        const bar = document.createElement('div')
        bar.className = 'media-progress-bar'
        bar.style.height = '100%'
        bar.style.width = '0%'
        bar.style.backgroundColor = options.barColor || '#00a1ff'
        bar.style.transition = 'width 0.1s linear'
        
        container.appendChild(bar)
        this.parent.appendChild(container)
        
        this.container = container
        this.bar = bar
    }
    
    setProgress(percent) {
        const boundedPercent = Math.min(100, Math.max(0, percent))
        this.bar.style.width = `${boundedPercent}%`
        this.bar.setAttribute('data-progress', `${Math.round(boundedPercent)}%`)
    }
    
    reset() {
        this.bar.style.width = '0%'
    }
}
