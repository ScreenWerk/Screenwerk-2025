# Feature 005: Seamless Single-Item Video Loop

## Goal

Eliminate destroy/recreate cycle for single-item looping playlists to achieve gapless playback, reduced GC churn, and lower CPU usage.

## Motivation

Currently a playlist with one video item completes -> playlist.next() triggers destroy() + re-instantiate of VideoMedia. This introduces:

- Small visual gap risk on some devices
- Unnecessary DOM churn & garbage collection
- Repeated metadata & canplaythrough events inflating logs
- Lost opportunity for future frame-accurate transitions

## Success Criteria

1. Single-item playlist loops by resetting existing Video element (currentTime=0) and replaying.
2. No new VideoMedia instance allocation per loop.
3. Ended event fires exactly once per natural loop.
4. Metrics: loop counter increments; average restart latency < 10ms (best effort observation via timestamps).
5. Fallback: Multi-item playlists unaffected.

## Non-Goals

- Cross-fade transitions (future feature)
- Audio-specific optimizations
- Multi-item pre-buffer sequencing changes

## Design Overview

Augment Playlist.next():

- Detect single-item case (length===1 && loop)
- Instead of loadMediaAtIndex(0), call fastLoopRestart() on current media.

Add fastLoopRestart() to BaseMedia (no-op default) and override in VideoMedia:

- If playing: ensure pause optional (some browsers require pause before seek)
- Set currentTime = 0
- Clear internal completion flags (completed / endedHandled)
- Call play() (native video element) and restart BaseMedia timers if forceDuration active.
- Emit debug log: "Fast loop restart (single-item playlist)".

Preserve completion pipeline: ended event path triggers onComplete(); after onComplete() Playlist.handleMediaComplete() schedules next(); next() sees single-item case and calls fastLoopRestart(); avoid duplicate completion by resetting completed flag only *after* onComplete() cycle has advanced.

## Edge Cases

- Forced duration shorter than video length: treat same as now; restart when timer triggers, ensuring video element resets immediately.
- Video error mid-loop: fallback to existing logic (destroy/recreate) by aborting fast restart if videoElement.error present.
- Rapid scheduler layout swap: if layout changes between completion and restart timer, skip fast restart.

## Implementation Steps

1. Add feature detection & method stub in BaseMedia.
2. Implement fastLoopRestart() in VideoMedia.
3. Modify Playlist.next() to branch to fast restart path.
4. Add loopCounter to Playlist status for diagnostics.
5. Update demo UI to display loop count when single-item.
6. Activity log entries and sanity check.

## Testing Plan

- Manual: Observe logs over 5 loops; ensure no "Created video media" lines after first loop.
- Confirm ended log appears once per loop.
- Verify loopCounter increments.

## Rollback Plan

Flag-guard the optimization with playlistData.fastLoop === false to disable.

## Status

Planned – awaiting implementation.
