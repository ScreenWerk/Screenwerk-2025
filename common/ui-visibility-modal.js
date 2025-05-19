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

function getSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return UI_VISIBILITY
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function applySettings(settings, reloadOnChange) {
  if (reloadOnChange) window.location.reload()
}

function openModal(modalId, reloadOnChange) {
  if (!modalId) throw new Error('openModal: modalId is required')
  const modal = document.getElementById(modalId)
  if (!modal) throw new Error(`openModal: No modal found with id '${modalId}'`)
  const form = document.getElementById(FORM_ID)
  modal.style.display = 'flex'
  // Clear form
  form.innerHTML = ''
  const settings = getSettings()
  const keys = Object.keys(settings)
  keys.forEach((key, idx) => {
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
    label.appendChild(document.createTextNode(' ' + key))
    form.appendChild(label)
  })
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
    console.debug('[UI Visibility Modal] Registering keyboard event for Alt+U')
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'u') {
        console.debug('[UI Visibility Modal] Alt+U pressed - opening modal')
        e.preventDefault()
        openModal(MODAL_ID, reloadOnChange)
      }
      // Modal open: handle toggle hotkeys and Esc
      const modal = document.getElementById(MODAL_ID)
      if (modal && modal.style.display === 'flex') {
        if (e.key === 'Escape') {
          console.debug('[UI Visibility Modal] Escape pressed - closing modal')
          closeModal(MODAL_ID)
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
              checkboxes.forEach(function(c) { newSettings[c.name] = c.checked })
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
        if (el.type === 'checkbox') newSettings[el.name] = el.checked
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
        if (el.type === 'checkbox') newSettings[el.name] = el.checked
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
