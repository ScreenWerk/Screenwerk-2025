# Feature 011 - LocalStorage Configuration Cache

## Goal

Add localStorage caching for screen ID and configuration data to enable instant bootstrap and offline-capable operation.

## Implementation Strategy

### Constructor Warm-Load Pattern

1. **Scheduler constructor**: Attempt to restore screenId if not provided, warm-load cached config
2. **Scheduler start()**: Always fetch fresh config from API
3. **Compare & reload**: If fresh config differs from cached, save new and trigger reload
4. **Demo UI**: Auto-populate screenId input, show cache status, provide clear cache button

## Storage Schema

### Keys

- `sw:screenId` → `"6898784a463d318c3f03d666"` (last used screen ID)
- `sw:config:v1:${screenId}` → ConfigWrapper object

### ConfigWrapper Structure

```javascript
{
  version: 1,
  screenId: "6898784a463d318c3f03d666",
  savedAt: "2025-08-12T15:30:00.000Z",
  config: { /* full Publisher API configuration JSON */ },
  fingerprint: {
    schedules: 3,
    size: 45231,
    configId: "6898784a463d318c3f03d666"
  }
}
```

## Core Components

### LocalStore Module

- **File**: `player/js/storage/LocalStore.js`
- **Methods**:
  - `saveScreenId(screenId)`
  - `loadScreenId()`
  - `saveConfiguration(screenId, config)`
  - `loadConfiguration(screenId)`
  - `clearConfiguration(screenId)`
  - `clearAll()`
  - `listCachedScreens()`

### Scheduler Integration

- **Constructor**: Restore screenId + warm-load cached config
- **loadConfiguration()**: Always fetch fresh, compare with cached, save if different
- **Error handling**: Fallback to cache if network fails

### Demo UI Enhancements

- Auto-populate screenId input from localStorage
- Cache status indicator (✅ cached, ❌ not cached, 🔄 fetching)
- Clear cache button with confirmation
- Optional: List other cached screens for quick switching

## Error Handling

### Corruption Recovery

- **JSON.parse fails**: Remove corrupted key, continue with network fetch
- **Quota exceeded**: Log warning, skip caching for this session
- **Invalid schema**: Ignore cache entry, proceed with fresh fetch
- **Network failure**: Use cached config if available, otherwise throw

### Validation

- **ScreenId format**: Must match `/^[0-9a-f]{24}$/`
- **Config structure**: Must have `configurationEid` and `schedules` array
- **Version mismatch**: Ignore cache, will be overwritten with fresh data

## Success Criteria

- ✅ Scheduler can start instantly with cached config (warm bootstrap)
- ✅ Fresh config always fetched and compared with cache
- ✅ Demo UI shows cache status and allows management
- ✅ Graceful degradation when localStorage unavailable
- ✅ Multi-screen caching (keep configs for multiple screenIds)
- ✅ Sanity check passes with no complexity warnings

## Future Enhancements

- Cache metadata (last fetch time, fetch count)
- Storage event listeners for multi-tab synchronization
- Compression for large configurations
- Migration strategy for schema version changes
- Analytics events for cache hit/miss rates

## Implementation Notes

- No TTL (cache persists until manually cleared)
- Basic debug logging only (no analytics events initially)
- Key prefix: `sw:`
- Soft graceful fallbacks (never break core functionality)
- Compatible with existing Scheduler constructor signatures
