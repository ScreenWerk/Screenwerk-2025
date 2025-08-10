// PlayerPlayback.js - Extracted playback & lifecycle helpers for ScreenWerkPlayer
// Functions operate on the player instance to keep Player.js slim.

import { debugLog } from '../../../../common/utils/debug-utils.js'

export function play(player) {
    if (player.destroyed) {
        console.error('[Player] Cannot play - player is destroyed')
        return false
    }
    if (!player.currentLayout) {
        console.error('[Player] Cannot play - no layout loaded')
        return false
    }
    if (player.isPlaying) {
        return true // idempotent
    }
    player.isPlaying = true
    let playlistsStarted = 0
    player.regions.forEach((regionInfo, regionId) => {
        if (regionInfo.playlist) {
            const started = regionInfo.playlist.play()
            if (started) {
                playlistsStarted++
                debugLog(`[Player] Started playlist in region: ${regionId}`)
            }
        }
    })
    debugLog(`[Player] Playback started - ${playlistsStarted} playlists playing`)
    if (playlistsStarted > 0) {
        player.emit('player:play')
        player.emit('player:stateChange')
    }
    return playlistsStarted > 0
}

export function pause(player) {
    if (player.destroyed) {
        console.error('[Player] Cannot pause - player is destroyed')
        return false
    }
    player.isPlaying = false
    player.regions.forEach((regionInfo, regionId) => {
        if (regionInfo.playlist) {
            regionInfo.playlist.pause()
            debugLog(`[Player] Paused playlist in region: ${regionId}`)
        }
    })
    debugLog('[Player] Playback paused')
    player.emit('player:pause')
    player.emit('player:stateChange')
    return true
}

export function resume(player) {
    return play(player)
}

export function cleanup(player) {
    player.regions.forEach((regionInfo, regionId) => {
        if (regionInfo.playlist) {
            regionInfo.playlist.destroy()
            debugLog(`[Player] Destroyed playlist in region: ${regionId}`)
        }
    })
    player.regions.clear()
    player.container.innerHTML = ''
    player.currentLayout = null
    debugLog('[Player] Cleanup completed')
}

export function destroy(player) {
    if (player.destroyed) return
    pause(player)
    cleanup(player)
    player.container.classList.remove('screenwerk-player')
    player.container.style.position = ''
    player.container.style.overflow = ''
    player.destroyed = true
    debugLog('[Player] Player destroyed')
    player.emit('player:destroyed')
    player.emit('player:stateChange')
}

export function showError(player, message) {
    player.container.innerHTML = `
        <div class="player-error" style="
            color: red; 
            background: rgba(255,0,0,0.1); 
            border: 2px solid red; 
            padding: 20px; 
            text-align: center;
            font-family: Arial, sans-serif;
        ">
            <h3>Player Error</h3>
            <p>${message}</p>
        </div>
    `
}
