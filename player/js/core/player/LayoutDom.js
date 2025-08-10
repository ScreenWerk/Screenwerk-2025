// LayoutDom.js - Extracted DOM creation helpers from Player
// Responsibility: region element creation & styling, empty/error states

import { debugLog } from '../../../../shared/utils/debug-utils.js'
import { Playlist } from '../../media/Playlist.js'

export function createRegionElement(regionData, index) {
    const regionElement = document.createElement('div')
    regionElement.className = 'screenwerk-region'
    regionElement.id = `region_${regionData.id || index}`
    setRegionStyles(regionElement, regionData)
    return regionElement
}

export function setRegionStyles(element, regionData) {
    element.style.position = 'absolute'
    if (regionData.isPercentage) {
        element.style.left = `${regionData.left}%`
        element.style.top = `${regionData.top}%`
        element.style.width = `${regionData.width}%`
        element.style.height = `${regionData.height}%`
    } else {
        element.style.left = `${regionData.left}px`
        element.style.top = `${regionData.top}px`
        element.style.width = `${regionData.width}px`
        element.style.height = `${regionData.height}px`
    }
    element.style.zIndex = regionData.zindex
    if (window.debugMode) {
        element.style.border = '2px dashed rgba(0,255,0,0.5)'
        element.style.backgroundColor = 'rgba(0,255,0,0.1)'
    }
}

export async function setRegionContent(player, element, regionData, index) {
    const regionId = regionData.id || `region_${index}`
    try {
        if (regionData.playlist && regionData.playlist.mediaItems && regionData.playlist.mediaItems.length > 0) {
            const playlist = new Playlist(regionData.playlist, element)
            const loaded = await playlist.load()
            if (loaded) {
                player.regions.get(regionId).playlist = playlist
                debugLog(`[Player] Loaded playlist for region ${regionId}: ${regionData.playlist.name}`)
            } else {
                showRegionError(element, regionId, 'Failed to load playlist')
            }
        } else {
            showEmptyRegion(element, regionId)
        }
    } catch (error) {
        console.error(`[Player] Error setting content for region ${regionId}:`, error)
        showRegionError(element, regionId, error.message)
    }
}

export function showEmptyRegion(element, regionId) {
    element.innerHTML = `
        <div class="region-empty" style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            background: rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            text-align: center;
        ">
            <div>
                <div style="font-size: 24px; margin-bottom: 10px;">📋</div>
                <div style="font-weight: bold;">Empty Region</div>
                <div style="font-size: 12px; margin-top: 5px;">${regionId}</div>
            </div>
        </div>
    `
}

export function showRegionError(element, regionId, error) {
    element.innerHTML = `
        <div class="region-error" style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #ff6b6b;
            background: rgba(255,0,0,0.1);
            font-family: Arial, sans-serif;
            text-align: center;
        ">
            <div>
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div style="font-weight: bold;">Region Error</div>
                <div style="font-size: 12px; margin-top: 5px;">${regionId}</div>
                <div style="font-size: 10px; margin-top: 5px; opacity: 0.8;">${error}</div>
            </div>
        </div>
    `
}
