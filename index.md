# ScreenWerk '25

Welcome to the ScreenWerk '25 project

## Overview

- **Player**: Used for displaying media content on screens. Supports various environments and UI controls.
- **Dashboard**: Used for managing screens, configurations, and monitoring deployments.

## Quick Links

- [Player UI](./player/index.html)
- [Dashboard UI](./dashboard/index.html)
- [GitHub: ScreenWerk/Screenwerk-2025](https://github.com/ScreenWerk/Screenwerk-2025)

## Documentation

- [ScreenWerk '25](#screenwerk-25)
  - [Overview](#overview)
  - [Quick Links](#quick-links)
  - [Documentation](#documentation)
  - [How to use the Player](#how-to-use-the-player)
  - [How to use the Dashboard](#how-to-use-the-dashboard)
  - [UI Visibility Settings](#ui-visibility-settings)
  - [Environment Configuration](#environment-configuration)

---

## How to use the Player

1. Open the [Player UI](./player/index.html).
2. Enter or select a valid Screen ID.
3. The player will load the configuration and begin playback.

## How to use the Dashboard

1. Open the [Dashboard UI](./dashboard/index.html).
2. Browse, edit, or validate screen configurations.
3. Use the dashboard to monitor deployments and screen status.

## UI Visibility Settings

The UI visibility settings allow you to customize which interface elements are displayed in both the Player and Dashboard:

### Accessing the Settings

- Press **Alt+U** at any time to open the UI visibility settings modal
- Press **Esc** to close the modal without submitting changes

### Available Settings

- **showMediaControls**: Toggle media control buttons (play, pause, etc.)
- **showDebugPanel**: Toggle the main debug panel overlay
- **showDevBanner**: Toggle the developer environment banner
- **showProgress**: Toggle the media progress bar
- **showScreenInfo**: Toggle the screen info panel (top right)
- **showConfigurationPanel**: Toggle the configuration/settings panel
- **showMediaDebugInfo**: Toggle debug info overlays on media elements

### Using the Settings Modal

- Each setting has an assigned hotkey (shown in brackets, e.g., **[Q]**)
- Press the corresponding key to toggle a setting while the modal is open
- Modified settings are marked with an asterisk (*) and shown in bold red
- Press **0** to restore all settings to the environment defaults
- Settings are saved to your browser's localStorage automatically

### Environment-Specific Defaults

Different environments (dev, live, local) have different default visibility settings to support various use cases:

- **Development**: Most UI elements enabled for debugging
- **Live**: Minimal UI for production displays
- **Local**: Balanced settings for local testing

## Environment Configuration

- The environment is auto-detected (dev, live, local) and controls UI visibility and API endpoints.
- See `common/config/constants.js` for details.

---
