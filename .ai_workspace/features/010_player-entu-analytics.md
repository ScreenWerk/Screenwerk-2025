# Feature 010 - Player Entu Analytics Integration

## Goal

Add lightweight analytics event emission from player to Entu Analytics service.

## Events (Phase 1)

- api_call: swpublisher configuration fetch (success/fail) with duration & status
- layout_start: when a new layout becomes active
- runtime_error: global window error & unhandled promise rejection

(Planned Phase 2: layout_restart detection using occurrence boundaries, media_start/media_end, heartbeat.)

## Data Points (each event)

- timestamp (ISO)
- screenId (scheduler.configurationId)
- event.type
- details: type-specific payload

### api_call details

- target: 'configuration'
- url
- status
- ok (boolean)
- durationMs

### layout_start details

- layoutId
- scheduleId (best-effort)

### runtime_error details

- message
- source (file)
- lineno / colno (if available)
- stack (truncated)
- isUnhandledRejection (boolean)

## Architecture

- New module: `player/js/analytics/Analytics.js` exporting singleton `analytics` and `initAnalytics(screenId, options)`
- Uses in-memory queue; immediate send for runtime_error; batch for others (future optimization – phase 1: immediate send)
- Transport: `navigator.sendBeacon` if available else `fetch` POST JSON to `${endpoint}/api/track`
- Endpoint & site id configurable via global `window.ANALYTICS_ENDPOINT` & `window.ANALYTICS_SITE_ID`; fallback no-op if missing.
- Scheduler integrates:
  - Initialize analytics in constructor (after parsing args)
  - Emit `layout_start` inside `processActiveSchedule` after successful preload
- ConfigurationLoader integrates:
  - Wrap fetch for configuration & emit `api_call`
- Global error listeners registered on first init.

## Success Criteria

- Sanity check passes (no new complexity warnings >8)
- Player runs without analytics config (no errors, silent no-ops)
- When globals provided, network requests to analytics endpoint show expected JSON payload

## Open Questions / Assumptions

- Assumes analytics backend compatible with simple POST JSON at `/api/track`.
- site identifier used only for backend indexing; included in payload.
- No PII included; screenId considered acceptable.

## Future Enhancements

- Debounced / batched sender
- Heartbeat events (every N minutes with current layout)
- Media-level events (start/end/error)
- Layout restart detection (same layout triggered new cron occurrence)
