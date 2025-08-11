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

## Architecture (Implemented)

- External script inclusion: `<script src="https://analytics.entu.dev/ea.min.js" data-site="screenwerk.entu.dev" defer></script>` in `player/demo.html`.
- Thin wrapper module: `player/js/analytics/Analytics.js` exposes `initAnalytics(screenId)` and `track(eventType, details)`; it enriches events with `screenId` and delegates to `window.analytics.track` provided by external script.
- No custom transport / endpoint management anymore (removed previous sendBeacon/fetch logic & globals `ANALYTICS_ENDPOINT` / `ANALYTICS_SITE_ID`).
- Scheduler: calls `initAnalytics` early and emits `layout_start` when layout activates.
- ConfigurationLoader: wraps configuration fetch to emit `api_call` with timing and status.
- Global error listeners (`error`, `unhandledrejection`) emit `runtime_error` events.
- Heartbeat mechanism (minute 42 each hour) retained in wrapper for future activation (currently optional—disabled unless explicitly started by Scheduler).

## Success Criteria

- Sanity check passes (no new complexity warnings >8)
- Player runs even if external script blocked (wrapper no-ops silently)
- With script loaded, calling `track` produces events visible in Entu Analytics dashboard under configured site.

## Open Questions / Assumptions

- External script guarantees batching / transport reliability; we treat it as a black box.
- `data-site` value `screenwerk.entu.dev` acceptable for dev; production may use different site id.
- No PII included; `screenId` acceptable.

## Future Enhancements

- Enable and document heartbeat event dispatch cadence.
- Add media-level events (start/end/error).
- Layout restart detection (same layout triggered new cron occurrence).
- Fallback local caching if external script unreachable (defer events until available).
