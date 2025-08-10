// RegionWiring.js - Region/media wiring helpers (Phase C)
// Responsibility: orchestrate region creation & playlist loading abstraction from Player

import { debugLog } from '../../../../shared/utils/debug-utils.js'
import { createRegionElement, setRegionContent as domSetRegionContent } from './LayoutDom.js'

export async function createRegions(player, regionsData) {
    const tasks = regionsData.map(async (regionData, index) => {
        try {
            const el = createRegionElement(regionData, index)
            player.container.appendChild(el)
            const regionId = regionData.id || `region_${index}`
            player.regions.set(regionId, { element: el, data: regionData, playlist: null })
            await domSetRegionContent(player, el, regionData, index)
            debugLog(`[Player] Created region: ${regionId}`)
        } catch (e) {
            console.error(`[Player] Failed to create region ${index}:`, e)
        }
    })
    await Promise.all(tasks)
    debugLog('[Player] All regions created')
}
