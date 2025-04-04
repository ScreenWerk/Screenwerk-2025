// Disclaimer: no semicolons, if unnecessary, are used in this project

export class ProgressBar {
    constructor(parent, options = {}) {
        this.parent = parent
        this.options = options
        
        // Create the progress bar elements
        const container = document.createElement('div')
        container.className = 'media-progress-container'
        container.style.cssText = `
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: ${options.height || '4px'} !important;
            background-color: ${options.backgroundColor || 'rgba(0,0,0,0.3)'} !important;
            z-index: ${options.zIndex || '999'} !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        const bar = document.createElement('div')
        bar.className = 'media-progress-bar'
        bar.style.cssText = `
            height: 100% !important;
            width: 0% !important;
            background-color: ${options.barColor || '#ff0000'} !important;
            transition: width 0.05s linear !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        container.appendChild(bar)
        this.parent.appendChild(container)
        
        this.container = container
        this.bar = bar
        
        // Debug flag to help troubleshoot progress updates
        this.debugMode = true
        this.lastProgress = 0
        
        // Make progress visible immediately
        this.ensureVisible()
        console.log(`Progress bar initialized for ${parent.id || 'element'}`)
    }
    
    setProgress(percent) {
        const boundedPercent = Math.min(100, Math.max(0, percent))
        
        // Force direct style manipulation
        this.bar.style.width = `${boundedPercent}%`
        
        // Use data attribute for debugging
        this.bar.setAttribute('data-progress', `${Math.round(boundedPercent)}%`)
        
        // Log every 5% to avoid too many logs
        if (Math.abs(boundedPercent - this.lastProgress) >= 5) {
            console.log(`Progress updated to ${boundedPercent.toFixed(1)}%`)
            this.lastProgress = boundedPercent
        }
    }
    
    reset() {
        console.log('Progress bar reset', this.parent)
        this.bar.style.width = '0%'
        this.lastProgress = 0
    }
    
    // Make sure the progress bar is visible
    ensureVisible() {
        this.container.style.display = 'block'
        this.container.style.opacity = '1'
    }
}
