// Dashboard-only UI constants extracted from legacy common/config/constants.js
// Keep player-agnostic UI concerns localized here.

export const UNICODE_ICONS = {
  warning: '⚠️',
  info: 'ℹ️',
  play: '▶️',
  pause: '⏸️',
  stop: '⏹️'
}

export const DEFAULT_UI_VISIBILITY = {
  live: {
    showMediaControls: false,
    showDebugPanel: false,
    showDevBanner: false,
    showProgress: false,
    showScreenInfo: false,
    showConfigurationPanel: false,
    showMediaDebugInfo: false
  },
  dev: {
    showMediaControls: true,
    showDebugPanel: true,
    showDevBanner: true,
    showProgress: true,
    showScreenInfo: true,
    showConfigurationPanel: true,
    showMediaDebugInfo: true
  },
  local: {
    showMediaControls: false,
    showDebugPanel: false,
    showDevBanner: false,
    showProgress: true,
    showScreenInfo: true,
    showConfigurationPanel: true,
    showMediaDebugInfo: false
  }
}

// Compute UI_VISIBILITY for current environment from window injected ENVIRONMENT (fallback dev)
export function getUiVisibility(env) {
  const e = env || (typeof window !== 'undefined' ? window.ENVIRONMENT : 'dev') || 'dev'
  return DEFAULT_UI_VISIBILITY[e] || DEFAULT_UI_VISIBILITY.dev
}

export const UI_VISIBILITY = getUiVisibility()
