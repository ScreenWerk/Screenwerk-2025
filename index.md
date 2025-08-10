# ScreenWerk '25

Welcome to the ScreenWerk '25 project

## Overview

- **[Player UI](./player/index.html)**: Used for displaying media content on screens. Supports various environments and UI controls.
- **[Dashboard UI](./dashboard/index.html)**: Used for managing screens, configurations, and monitoring deployments.

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
// Legacy note removed: UI constants relocated to dashboard/js/config/ui-constants.js

---
