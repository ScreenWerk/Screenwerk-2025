# Clean Player Architecture - Fresh Implementation

## Overview

Create new, clean Player and Scheduler classes from scratch in a fresh folder structure. Use existing code as reference and proof of concept, but build a production-ready architecture without legacy baggage. **Goal: Pure two-service architecture aligned with data model design.**

### Phase 1 Progress: Minimal Scheduler → Real Data Pipeline

**Completed (Committed: 333465f):**

- Core Player class with region-based DOM architecture
- Core Scheduler class with basic structure
- Layout → Regions → Playlists → Media hierarchy implemented
- Interactive demo interface for testing and validation
- ESLint compliant with zero complexity warnings
- Modern ES6+ architecture established

**Phase 1 Complete (API Integration & Enhanced Scheduler):**

- Enhanced Scheduler with real API configuration loading
- Built data transformation utilities (API → Player format)
- Implemented `loadConfiguration()` method with fail-fast design
- Added comprehensive schedule evaluation logic with Later.js
- Removed all fallback/mock data - pure ScreenWerk API integration
- Successfully tested with live ScreenWerk Publisher API
- Most-recent schedule evaluation working perfectly
- Enhanced sanity check script to support v2 architecture

### Currently Working On - Phase 3: Video Media Support COMPLETE

#### Phase 3 Achievements

- **VideoMedia Class** - Complete video media handler extending BaseMedia
- **Video Autoplay** - Handles browser autoplay policies with muted fallback
- **Video Lifecycle** - Proper loading, playback, pause, and cleanup
- **MediaFactory Integration** - Automatic video detection and instantiation
- **Service Worker Compatibility** - Video caching works with existing infrastructure

#### Video Features Implemented

- **Video Element Management** - HTML5 video with proper configuration
- **Autoplay Handling** - Smart autoplay with muted fallback for browser policies
- **Video Properties** - Support for mute, loop, preload, and playsInline
- **Error Handling** - Comprehensive video error handling and recovery
- **Status Monitoring** - Detailed video state information for debugging

### Feature 004 Complete - Ready for Production

#### All Phases Complete

- Video media handler for video content
- Advanced playlist features
- Performance monitoring and optimization
- Enhanced error recovery and retry logic

#### Phase 3 Implementation Plan

1. **Video Media Support**
   - Create VideoMedia class extending BaseMedia
   - Handle video-specific properties (mute, loop, controls)
   - Implement video preloading and buffering
   - Add video error handling and fallbacks

2. **Advanced Playlist Features**
   - Playlist analytics and reporting

**Next Up:**

- Begin Phase 2 implementation with enhanced Player
- Implement actual media rendering in regions
- Add playlist progression and timing
- Production integration and advanced features

## Strategy: Fresh Start Approach

### Why Fresh Implementation is Better

1. **No Legacy Constraints** - Clean slate without backward compatibility concerns
2. **Pure Architecture** - Implement data model alignment from the ground up
3. **Modern Code Standards** - Latest ES6+ patterns, clean APIs
4. **Focused Scope** - Each class has single, clear responsibility
5. **Better Testing** - Designed for testability from the start

### Existing Code as Reference Only

**Use as proof of concept:**

- `/player/js/services/LayoutScheduler.js` - Scheduler implementation patterns
- `/player/js/sw-player.js` with `loadLayout()` - Player API design
- `/player/live-publisher-test.html` - Integration examples

**Learn from but don't inherit:**

- Legacy configuration handling complexity
- Administrative concerns mixed in player
- Complex initialization patterns

## Fresh Implementation Plan

### Development Strategy: Data-First Approach

#### Phase 1: Minimal Scheduler → Real Data Pipeline

1. Build just enough Scheduler to load and transform ScreenWerk API data
2. Focus on configuration loading (`loadConfiguration()`)
3. Data transformation (`transformLayout()`, `transformRegion()`, `transformPlaylist()`)
4. Basic schedule evaluation (`evaluateSchedules()` - which layout now)
5. Simple Player coordination (callback interface)

#### Phase 2: Enhanced Player → Rich Content Rendering

1. Replace debug info with actual playlist/media rendering
2. Add media type handlers (image, video, text, widgets)
3. Implement playlist rotation and timing
4. Add transition effects and animations
5. Visual polish and error handling

#### Benefits of This Approach

- **Real data validation** from day one - test with actual ScreenWerk APIs
- **Visual feedback** with live content - see actual layouts and media
- **Integration testing** early - validate Player ↔ Scheduler interface
- **Momentum building** - working demos with real data quickly

### New Folder Structure

```text
player/v2/
  js/
    core/
      Player.js               # Pure content renderer (Layout→Regions→Playlists→Media)
      Scheduler.js            # Minimal data pipeline (Phase 1 focus)
    services/
      ConfigurationService.js # API data loading (Phase 1)
      MediaService.js         # URL handling (Phase 2)
    utils/
      LayoutTransformer.js    # Data transformation (Phase 1)
      CronEvaluator.js        # Schedule evaluation (Phase 1)
    components/
      Layout.js               # Advanced rendering (Phase 2)
      Region.js               # Region components (Phase 2)
      Media.js                # Media handlers (Phase 2)
  css/
    player.css              # Clean styling
  index.html               # New entry point
  demo.html               # Development testing
```

## Implementation Tracking

### Current Development Status

**Completed Phase 1:**

- Core Player class with region-based DOM architecture
- Core Scheduler class with enhanced API integration
- Layout → Regions → Playlists → Media hierarchy implemented
- Interactive demo interface for testing and validation
- ESLint compliant with zero complexity warnings
- Modern ES6+ architecture established
- Real ScreenWerk Publisher API integration with fail-fast design
- Comprehensive data transformation pipeline (API → Player format)
- Later.js cron evaluation with most-recent schedule logic
- Removed all mock/fallback data per fail-fast philosophy
- Enhanced development tools (sanity check with v2 support)

**Completed Phase 2:**

- BaseMedia foundation class with lifecycle, validation, timing
- ImageMedia class with sizing modes, error handling, async loading
- MediaFactory class with smart media type detection from URI/type
- Playlist class with automatic progression, timing, looping, event-driven completion
- Enhanced Player class with async loadLayout(), real playlist control, proper cleanup
- Live demo validation with real images displaying and 10s timing
- Automatic playlist progression working with real ScreenWerk API data
- Zero complexity warnings maintained across all new code

**Ready for Phase 3:**

- Video media handler for video content support
- Transition effects between media items for smooth UX
- Advanced playlist features (shuffle, weighted selection, conditional media)
- Performance optimization (preloading, caching, monitoring)
- Production integration features (service worker, analytics)

**Current Workflow Status:**

- Phase 1 Complete: Real API integration, enhanced Scheduler, most-recent schedule logic
- Phase 2 Complete: Media rendering architecture, actual media display, playlist progression  
- Ready to proceed to Phase 3 advanced features development cycle
- All core architecture goals achieved with live validation completed

### Current Development Focus - Phase 3

**Next Goal:** Implement advanced features including video media support and transition effects

**Target Output:** Enhanced player with video content, smooth transitions, and advanced playlist features

**Success Criteria:**

1. VideoMedia class handles video content with proper controls and buffering
2. Smooth fade transitions between media items enhance user experience
3. Advanced playlist features like weighted selection and conditional media
4. Performance optimization with preloading and resource management
5. Production-ready features with comprehensive error recovery

### Core Classes Design

#### Clean Player Class

```javascript
// player/v2/js/core/Player.js
export class ScreenWerkPlayer {
  constructor(container) {
    this.container = container;
    this.currentLayout = null;
    this.isPlaying = false;
    this.regions = new Map();
  }

  loadLayout(layout) {
    // Simple, focused API
    // Only handles rendering, no administrative logic
  }

  play() {
    /* Pure playback control */
  }
  pause() {
    /* Pure playback control */
  }
  destroy() {
    /* Clean cleanup */
  }
}
```

#### Clean Scheduler Class

```javascript
// player/v2/js/core/Scheduler.js
export class LayoutScheduler {
  constructor({ configurationId, onLayoutChange }) {
    this.configurationId = configurationId;
    this.onLayoutChange = onLayoutChange;
    this.configuration = null;
    this.currentLayoutId = null;
  }

  async start() {
    // Pure scheduling logic
    // No rendering concerns
  }

  evaluateSchedules() {
    // Clean cron evaluation
    // Layout selection only
  }
}
```

### Implementation Phases

#### Phase 1: Core Classes (Day 1)

1. Create clean Player class with simple API
2. Create clean Scheduler class with focused responsibilities
3. Basic layout transformation utilities
4. Simple integration test

#### Phase 2: Service Layer (Day 2)

1. ConfigurationService - API communication
2. MediaService - URL handling and caching
3. Component classes - Layout, Region, Media
4. Enhanced testing and validation

#### Phase 3: Production Integration (Day 3)

1. New entry point HTML
2. Service worker integration
3. UI components integration
4. Full end-to-end testing

#### Phase 4: Migration Planning (Day 4)

1. Performance comparison with legacy
2. Migration strategy documentation
3. Feature parity validation
4. Production deployment plan

## Files to Create

### Core Architecture

**`player/v2/js/core/Player.js`** - Clean player implementation

- Simple constructor, no configuration dependency
- Pure `loadLayout()` API for layout objects
- Clean lifecycle methods (play, pause, destroy)
- Focused on content rendering only

**`player/v2/js/core/Scheduler.js`** - Clean scheduler implementation

- Configuration management and API communication
- Schedule evaluation and cron logic
- Layout selection and transformation
- Player coordination through callbacks

### Service Layer

**`player/v2/js/services/ConfigurationService.js`** - API communication

- Fetch configuration from publisher API
- Handle polling and updates
- Configuration caching and validation
- Error handling and retry logic

**`player/v2/js/services/MediaService.js`** - Media handling

- Media URL construction
- Service worker integration for caching
- Media validation and fallbacks
- Performance optimization

### Component Layer

**`player/v2/js/components/Layout.js`** - Layout rendering

- Canvas setup and dimensions
- Region positioning and management
- Layout lifecycle and cleanup
- Animation and transitions

**`player/v2/js/components/Region.js`** - Region management

- Playlist container creation
- Region-specific properties
- Media sequencing and timing
- Region interaction and events

**`player/v2/js/components/Media.js`** - Media display

- Image and video rendering
- Media-specific properties (duration, stretch, mute)
- Validation (valid_from/to)
- Error handling and fallbacks

### Entry Points

**`player/v2/index.html`** - Production entry point

- Clean HTML structure
- Modern ES6 module imports
- UI components integration
- Service worker registration

**`player/v2/demo.html`** - Development testing

- Development tools and debugging
- Test data and scenarios
- Performance monitoring
- Live API testing

## Implementation Strategy

### Clean Slate Approach

1. **Modern ES6+ Architecture**

   ```javascript
   // Clean, focused APIs
   const player = new ScreenWerkPlayer(container);
   const scheduler = new LayoutScheduler({
     configurationId: "config123",
     onLayoutChange: (layout) => player.loadLayout(layout),
   });

   await scheduler.start();
   player.play();
   ```

2. **Single Responsibility Classes**

   - Player: Only handles content rendering
   - Scheduler: Only handles configuration and timing
   - Services: Focused utilities (API, Media, etc.)
   - Components: Specific rendering tasks (Layout, Region, Media)

3. **Testable Architecture**
   - Dependency injection for services
   - Mock-friendly interfaces
   - Isolated unit testing
   - Clear integration points

### Development Process

1. **Iterative Development**

   - Start with minimal viable classes
   - Add features incrementally
   - Test each component independently
   - Integrate step by step

2. **Reference-Driven Design**

   - Use existing LayoutScheduler as reference
   - Learn from current player patterns
   - Improve on proven concepts
   - Avoid legacy complexity

3. **Modern Tooling**
   - ES6 modules and classes
   - Modern DOM APIs
   - Fetch API for HTTP
   - Standard browser features only

### Testing Strategy

1. **Regression Testing**

   - Ensure existing functionality continues to work
   - Test with live publisher API data
   - Validate all UI components function correctly

2. **New Architecture Testing**
   - Test scheduler + player integration in production context
   - Validate configuration polling with scheduler
   - Test layout switching and transitions

## Expected Benefits

### Immediate Improvements

1. **Clean Architecture** - Pure separation of concerns from day one
2. **Modern Code Standards** - ES6+ patterns, clean APIs, focused classes
3. **Better Performance** - Optimized for modern browsers, no legacy baggage
4. **Enhanced Maintainability** - Single responsibility, clear interfaces

### Long-term Benefits

1. **Superior Testability** - Designed for testing, dependency injection
2. **Easy Extension** - Plugin architecture, service-based design
3. **Production Ready** - Built for scale, performance, and reliability
4. **Future Proof** - Modern standards, extensible architecture

## Success Criteria

### Functional Requirements

- **Complete feature parity** - All current functionality replicated
- **Scheduler + player integration** - Seamless layout switching
- **Live API connectivity** - Publisher API integration working
- **UI components functional** - All interface elements working

### Non-functional Requirements

- **Performance superior** - Faster than legacy implementation
- **Memory optimized** - Clean lifecycle management
- **Code quality excellent** - Zero complexity warnings
- **Architecture clean** - Pure data model alignment

## Implementation Milestones

### Milestone 1: Core Classes (Day 1)

- Create clean Player and Scheduler classes
- Basic layout transformation utilities
- Simple integration test
- Validation with existing data

### Milestone 2: Service Layer (Day 2)

- ConfigurationService and MediaService implementation
- Component classes (Layout, Region, Media)
- Enhanced error handling and validation
- Service integration testing

### Milestone 3: Production Integration (Day 3)

- New entry point HTML and CSS
- Service worker integration
- UI components and controls
- Full end-to-end testing

### Milestone 4: Migration Planning (Day 4)

- Performance benchmarking vs legacy
- Migration strategy documentation
- Production deployment plan
- Feature comparison validation

## Immediate Next Steps

1. **Create feature branch** - `feature/clean-player-architecture`
2. **Set up v2 folder structure** - Create clean directory layout
3. **Start with core Player class** - Simple, focused implementation
4. **Build core Scheduler class** - Clean scheduling logic
5. **Create basic integration test** - Prove the concept works

This feature will deliver a production-ready, modern player architecture that serves as the foundation for future ScreenWerk development.

## Dependencies

- **Feature 003 as reference** - Proven patterns and integration examples
- **Live API knowledge** - Publisher API connectivity understood
- **Data model understanding** - Clear scope and responsibilities
- **Development tools ready** - Sanity check, ESLint, workflow conventions

## Success Metrics

**Code Quality:**

- ESLint complexity warnings remain at zero
- Modern ES6+ patterns throughout
- Clean, readable, maintainable code
- Comprehensive error handling

**Functionality:**

- Complete feature parity with current player
- Superior performance characteristics
- Seamless layout switching and transitions
- Robust API integration and error handling

**Architecture:**

- Pure two-service architecture achieved
- Perfect data model alignment
- Single responsibility principle followed
- Extensible and future-proof design

## Implementation Status Summary

### COMPLETED: Phase 1 - Foundation & API Integration

- **Clean Architecture** - ES6+ Player and Scheduler classes implemented
- **Real API Integration** - ScreenWerk Publisher API with fail-fast design
- **Schedule Logic** - Most-recent evaluation using Later.js prev() method
- **Data Pipeline** - Complete API → Player format transformation
- **Quality Tools** - Enhanced sanity check with context awareness (v2/scripts/player/all)

### COMPLETED: Phase 2 - Media Rendering Architecture

- **Media Foundation** - BaseMedia class with lifecycle, validation, timing
- **Image Rendering** - ImageMedia with sizing modes, error handling, async loading
- **Media Factory** - Smart media type detection from URI/type
- **Playlist Engine** - Automatic progression, timing, looping, event-driven completion
- **Player Enhancement** - Async loadLayout(), real playlist control, proper cleanup
- **Scheduler-Driven Caching** - Scheduler preloads all media before triggering Player
- **Live Validation** - Real images displaying with 10s timing and automatic progression

### COMPLETED: Image Loading Bug Fixes

- **Cache-Busting Issue** - Fixed problematic query parameter cache-busting that broke ScreenWerk URLs
- **Element Cleanup** - Resolved DOM element corruption during media transitions
- **Duplicate Events** - Eliminated duplicate event listeners causing timing conflicts
- **Server Compatibility** - Ensured URL formats work with ScreenWerk media server requirements

### COMPLETED: Architecture Refinement

- **Pure Player Responsibility** - Player only renders, assumes all media is cached
- **Scheduler Media Management** - Scheduler handles all media preloading before layout changes
- **Clean Separation** - No media loading concerns in Player, pure rendering focus
- **Robust Media Delivery** - No missing media, streaming issues eliminated by preloading

### NEXT: Phase 3 - Advanced Features

- **Video Media Support** - Video handler with controls, buffering, fallbacks
- **Performance Optimization** - Preloading, caching, monitoring, resource management
- **Production Integration** - Service worker, error recovery, analytics

**Current Status:** Phase 2 Complete - Ready for Phase 3 Advanced Features
