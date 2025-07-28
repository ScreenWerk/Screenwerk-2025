// Common UI Visibility Modal logic for both dashboard and player
// Usage: import { setupUIVisibilityModal } from './ui-visibility-modal-common.js';
// Then call setupUIVisibilityModal({ reloadOnChange: true })

import { UI_VISIBILITY } from '../../common/config/constants.js'

const MODAL_ID = 'ui-visibility-modal'
const FORM_ID = 'ui-visibility-form'
const CLOSE_ID = 'ui-visibility-close'
const STORAGE_KEY = 'UI_VISIBILITY'

// Assign hotkeys to each toggle (a-z, 0-9)
const TOGGLE_HOTKEYS = [
  '1','2','3','4','5','6','7','8','9','0',
  'q','w','e','r','t','y','u','i','o','p',
  'a','s','d','f','g','h','j','k','l',
  'z','x','c','v','b','n','m'
]

/**
 * Gets the current UI visibility settings.
 * - Retrieves from localStorage if available
 * - Filters for only valid keys that exist in defaults
 * - Falls back to environment defaults if nothing in storage
 * 
 * @returns {Object} The current UI visibility settings
 */
function getSettings() {
  try {
    // Get environment and defaults
    const env = window.ENVIRONMENT || 'dev'
    const defaults = window.DEFAULT_UI_VISIBILITY ? window.DEFAULT_UI_VISIBILITY[env] : UI_VISIBILITY
    const defaultKeys = defaults ? Object.keys(defaults) : []
    
    // Try to get stored settings
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      
      // Filter for only valid keys that exist in defaults
      const settings = {}
      defaultKeys.forEach(key => {
        settings[key] = parsed[key] !== undefined ? parsed[key] : defaults[key]
      })
      return settings
    }
    
    // No stored settings, use defaults
    return defaults
  } catch (err) {
    console.warn('[UI Visibility] Error getting settings:', err)
    return UI_VISIBILITY
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function applySettings(settings, reloadOnChange) {
  if (reloadOnChange) window.location.reload()
}

/**
 * Checks if current settings match defaults
 * @param {Object} settings - Current settings
 * @param {Object} defaults - Default settings
 * @returns {boolean} True if settings match defaults
 */
function isDefaultSettings(settings, defaults) {
  if (!defaults) return true
  const keys = Object.keys(settings)
  for (const key of keys) {
    if (settings[key] !== defaults[key]) {
      return false
    }
  }
  return true
}

/**
 * Creates restore defaults checkbox element
 * @param {boolean} isDefault - Whether current settings are default
 * @param {Object} defaults - Default settings object
 * @returns {HTMLElement} The restore label element
 */
function createRestoreCheckbox(isDefault, defaults) {
  const restoreLabel = document.createElement('label')
  restoreLabel.style.display = 'block'
  restoreLabel.innerHTML = '<u>[0]</u> '
  
  const restoreCheckbox = document.createElement('input')
  restoreCheckbox.type = 'checkbox'
  restoreCheckbox.setAttribute('data-hotkey', '0')
  restoreCheckbox.tabIndex = 0
  restoreCheckbox.checked = false
  restoreCheckbox.disabled = isDefault
  
  restoreCheckbox.onclick = function(e) {
    e.preventDefault()
    if (restoreCheckbox.disabled) return
    if (defaults) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
      window.location.reload()
    } else {
      alert('Failed to restore defaults: DEFAULT_UI_VISIBILITY not found on window')
    }
  }
  
  restoreLabel.appendChild(restoreCheckbox)
  restoreLabel.appendChild(document.createTextNode(' Restore Defaults'))
  
  if (isDefault) {
    restoreLabel.title = 'Already at default settings'
    restoreLabel.style.opacity = '0.5'
  }
  
  return restoreLabel
}

/**
 * Creates setting checkbox for a specific key
 * @param {string} key - Setting key
 * @param {number} idx - Index for hotkey assignment
 * @param {Object} settings - Current settings
 * @param {Object} defaults - Default settings
 * @returns {HTMLElement} The setting label element
 */
function createSettingCheckbox(key, idx, settings, defaults) {
  const label = document.createElement('label')
  label.style.display = 'block'
  
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.name = key
  checkbox.checked = !!settings[key]
  
  // Assign hotkey
  const hotkey = TOGGLE_HOTKEYS[idx] || ''
  if (hotkey) {
    checkbox.setAttribute('data-hotkey', hotkey)
    label.innerHTML = `<u>[${hotkey.toUpperCase()}]</u> `
  }
  
  label.appendChild(checkbox)
  
  // Mark if different from default
  if (defaults && settings[key] !== defaults[key]) {
    label.appendChild(document.createTextNode(' ' + key + ' *'))
    label.title = 'Modified from default'
    label.style.fontWeight = 'bold'
    label.style.color = '#b00'
  } else {
    label.appendChild(document.createTextNode(' ' + key))
  }
  
  return label
}

/**
 * Creates and configures the clear cache button
 * @param {HTMLElement} modal - The modal element
 * @returns {HTMLElement|null} The clear cache button or null if not added
 */
function createClearCacheButton(modal) {
  const closeDiv = modal.querySelector('div[style*="text-align:right"]')
  if (!closeDiv) return null
  
  const clearCacheBtn = document.createElement('button')
  clearCacheBtn.type = 'button'
  clearCacheBtn.textContent = 'Clear Cache'
  clearCacheBtn.style.marginLeft = '1em'
  
  clearCacheBtn.onclick = async function() {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) await reg.unregister()
    }
    // Delete all caches
    if ('caches' in window) {
      const names = await caches.keys()
      for (const name of names) await caches.delete(name)
    }
    alert('Cache cleared! The page will now reload.')
    window.location.reload()
  }
  
  closeDiv.insertBefore(clearCacheBtn, closeDiv.firstChild)
  return clearCacheBtn
}

function openModal(modalId, _reloadOnChange) {
  if (!modalId) throw new Error('openModal: modalId is required')
  const modal = document.getElementById(modalId)
  if (!modal) throw new Error(`openModal: No modal found with id '${modalId}'`)
  
  const form = document.getElementById(FORM_ID)
  modal.style.display = 'flex'
  form.innerHTML = ''
  
  const settings = getSettings()
  const keys = Object.keys(settings)
  const env = window.ENVIRONMENT || 'dev'
  const defaults = window.DEFAULT_UI_VISIBILITY ? window.DEFAULT_UI_VISIBILITY[env] : undefined
  
  const isDefault = isDefaultSettings(settings, defaults)
  
  // Add restore defaults checkbox
  const restoreLabel = createRestoreCheckbox(isDefault, defaults)
  form.appendChild(restoreLabel)
  
  // Add setting checkboxes
  keys.forEach((key, idx) => {
    const settingLabel = createSettingCheckbox(key, idx, settings, defaults)
    form.appendChild(settingLabel)
  })
  
  // Add clear cache button
  createClearCacheButton(modal)
}

function closeModal(modalId) {
  if (!modalId) throw new Error('closeModal: modalId is required')
  const modal = document.getElementById(modalId)
  if (!modal) throw new Error(`closeModal: No modal found with id '${modalId}'`)
  modal.style.display = 'none'
}

/**
 * Sets up the UI Visibility Settings modal and hotkey logic for toggling UI elements.
 *
 * - Injects event listeners for opening the modal (Alt+U), closing (Esc/button), and toggling settings via hotkeys.
 * - Renders checkboxes for each UI visibility option, with hotkey hints.
 * - Saves changes to localStorage and applies them (optionally reloads page).
 * - Intended for use in both dashboard and player UIs.
 *
 * @param {Object} [options]
 * @param {boolean} [options.reloadOnChange=true] - If true, reloads the page after a setting is changed.
 */
export function setupUIVisibilityModal({ reloadOnChange = true } = {}) {
  function registerListeners() {
    // Get environment and defaults (need this here for the event handlers)
    const env = window.ENVIRONMENT || 'dev'
    const defaults = window.DEFAULT_UI_VISIBILITY ? window.DEFAULT_UI_VISIBILITY[env] : undefined
    const defaultKeys = defaults ? Object.keys(defaults) : []
    
    console.debug('[UI Visibility Modal] Registering keyboard event for Alt+U')
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'u') {
        console.debug('[UI Visibility Modal] Alt+U pressed - opening modal')
        e.preventDefault()
        openModal(MODAL_ID, reloadOnChange)
      }
      // Modal open: handle toggle hotkeys, Esc, and 0 for restore
      const modal = document.getElementById(MODAL_ID)
      if (modal && modal.style.display === 'flex') {
        if (e.key === 'Escape') {
          console.debug('[UI Visibility Modal] Escape pressed - closing modal')
          closeModal(MODAL_ID)
        } else if (e.key === '0') {
          // Restore defaults for current environment (no dynamic import needed)
          if (defaults) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
            window.location.reload()
          } else {
            alert('Failed to restore defaults: DEFAULT_UI_VISIBILITY not found on window')
          }
        } else {
          // Check if key matches a toggle
          const form = document.getElementById(FORM_ID)
          const checkboxes = form.querySelectorAll('input[type=checkbox]')
          checkboxes.forEach(function(cb) {
            const hk = cb.getAttribute('data-hotkey')
            if (hk && e.key.toLowerCase() === hk) {
              console.debug(`[UI Visibility Modal] Hotkey ${hk} pressed - toggling ${cb.name}`)
              cb.checked = !cb.checked
              // Save and apply
              const newSettings = {}
              checkboxes.forEach(function(c) { 
                if (c.name && defaultKeys.includes(c.name)) {
                  newSettings[c.name] = c.checked
                }
              })
              saveSettings(newSettings)
              applySettings(newSettings, reloadOnChange)
            }
          })
        }
      }
    })
    document.getElementById(CLOSE_ID).onclick = () => closeModal(MODAL_ID)
    document.getElementById(FORM_ID).onsubmit = (e) => {
      e.preventDefault()
      // Save settings
      const form = e.target
      const newSettings = {}
      Array.from(form.elements).forEach((el) => {
        if (
          el.type === 'checkbox' &&
          el.name &&
          defaultKeys.includes(el.name)
        ) {
          newSettings[el.name] = el.checked
        }
      })
      saveSettings(newSettings)
      applySettings(newSettings, reloadOnChange)
      closeModal(MODAL_ID)
    }
    // Save on change
    document.getElementById(FORM_ID).addEventListener('change', (e) => {
      const form = e.target.form
      const newSettings = {}
      Array.from(form.elements).forEach((el) => {
        if (
          el.type === 'checkbox' &&
          el.name &&
          defaultKeys.includes(el.name)
        ) {
          newSettings[el.name] = el.checked
        }
      })
      saveSettings(newSettings)
      applySettings(newSettings, reloadOnChange)
    })
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerListeners)
  } else {
    registerListeners()
  }
}
