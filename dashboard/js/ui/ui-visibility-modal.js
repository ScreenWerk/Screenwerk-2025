// Dashboard-local UI Visibility Modal (migrated legacy modal implementation; original directory removed)
import { UI_VISIBILITY, DEFAULT_UI_VISIBILITY } from '../../config/ui-constants.js'

const MODAL_ID = 'ui-visibility-modal'
const FORM_ID = 'ui-visibility-form'
const CLOSE_ID = 'ui-visibility-close'
const STORAGE_KEY = 'UI_VISIBILITY'
const TOGGLE_HOTKEYS = ['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m']

function getSettings() {
  try {
    const env = window.ENVIRONMENT || 'dev'
    const defaults = DEFAULT_UI_VISIBILITY ? DEFAULT_UI_VISIBILITY[env] : UI_VISIBILITY
    const defaultKeys = defaults ? Object.keys(defaults) : []
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const settings = {}
      defaultKeys.forEach(k => { settings[k] = parsed[k] !== undefined ? parsed[k] : defaults[k] })
      return settings
    }
    return defaults
  } catch (e) {
    console.warn('[UI Visibility] fallback to UI_VISIBILITY', e)
    return UI_VISIBILITY
  }
}

function saveSettings(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }
function applySettings(s, reload) { if (reload) window.location.reload() }
function isDefaultSettings(settings, defaults) { return Object.keys(settings).every(k => settings[k] === defaults[k]) }

function createRestoreCheckbox(isDefault, defaults) {
  const label = document.createElement('label'); label.style.display='block'; label.innerHTML='<u>[0]</u> '
  const cb = document.createElement('input'); cb.type='checkbox'; cb.setAttribute('data-hotkey','0'); cb.disabled=isDefault
  cb.onclick = (e)=>{ e.preventDefault(); if (cb.disabled) return; if (defaults){ localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); window.location.reload() } }
  label.appendChild(cb); label.appendChild(document.createTextNode(' Restore Defaults'))
  if (isDefault){ label.style.opacity='0.5'; label.title='Already default' }
  return label
}

function createSettingCheckbox(key, idx, settings, defaults) {
  const label=document.createElement('label'); label.style.display='block'
  const cb=document.createElement('input'); cb.type='checkbox'; cb.name=key; cb.checked=!!settings[key]
  const hotkey=TOGGLE_HOTKEYS[idx]||''
  if (hotkey){ cb.setAttribute('data-hotkey', hotkey); label.innerHTML=`<u>[${hotkey.toUpperCase()}]</u> ` }
  label.appendChild(cb)
  if (defaults && settings[key] !== defaults[key]) { label.appendChild(document.createTextNode(' '+key+' *')); label.style.fontWeight='bold'; label.style.color='#b00' } else label.appendChild(document.createTextNode(' '+key))
  return label
}

function createClearCacheButton(modal){ const closeDiv=modal.querySelector('div[style*="text-align:right"]'); if(!closeDiv) return null; const btn=document.createElement('button'); btn.type='button'; btn.textContent='Clear Cache'; btn.style.marginLeft='1em'; btn.onclick=async()=>{ if('serviceWorker' in navigator){ const regs=await navigator.serviceWorker.getRegistrations(); for(const reg of regs) await reg.unregister() } if('caches' in window){ const names=await caches.keys(); for(const name of names) await caches.delete(name) } alert('Cache cleared! Reloading.'); window.location.reload() }; closeDiv.insertBefore(btn, closeDiv.firstChild); return btn }

function openModal(id, _reload){ const modal=document.getElementById(id); if(!modal) throw new Error('No modal'); const form=document.getElementById(FORM_ID); modal.style.display='flex'; form.innerHTML=''; const settings=getSettings(); const env=window.ENVIRONMENT||'dev'; const defaults=DEFAULT_UI_VISIBILITY?DEFAULT_UI_VISIBILITY[env]:undefined; const isDef=isDefaultSettings(settings, defaults); form.appendChild(createRestoreCheckbox(isDef, defaults)); Object.keys(settings).forEach((k,i)=> form.appendChild(createSettingCheckbox(k,i,settings,defaults))); createClearCacheButton(modal) }
function closeModal(id){ const modal=document.getElementById(id); if(modal) modal.style.display='none' }

export function setupUIVisibilityModal({ reloadOnChange = true } = {}) {
  function register(){ const env=window.ENVIRONMENT||'dev'; const defaults=DEFAULT_UI_VISIBILITY?DEFAULT_UI_VISIBILITY[env]:undefined; const defaultKeys=defaults?Object.keys(defaults):[]
    document.addEventListener('keydown', (e)=>{ if(e.altKey && e.key.toLowerCase()==='u'){ e.preventDefault(); openModal(MODAL_ID, reloadOnChange) } const modal=document.getElementById(MODAL_ID); if(modal && modal.style.display==='flex'){ if(e.key==='Escape'){ closeModal(MODAL_ID) } else if(e.key==='0'){ if (defaults){ localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); window.location.reload() } } else { const form=document.getElementById(FORM_ID); const boxes=form.querySelectorAll('input[type=checkbox]'); boxes.forEach(cb=>{ const hk=cb.getAttribute('data-hotkey'); if(hk && e.key.toLowerCase()===hk){ cb.checked=!cb.checked; const newSettings={}; boxes.forEach(c=>{ if(c.name && defaultKeys.includes(c.name)) newSettings[c.name]=c.checked }); saveSettings(newSettings); applySettings(newSettings, reloadOnChange) } }) } } })
    document.getElementById(CLOSE_ID).onclick=()=>closeModal(MODAL_ID)
    document.getElementById(FORM_ID).onsubmit=(e)=>{ e.preventDefault(); const form=e.target; const newSettings={}; Array.from(form.elements).forEach(el=>{ if(el.type==='checkbox' && el.name && defaultKeys.includes(el.name)) newSettings[el.name]=el.checked }); saveSettings(newSettings); applySettings(newSettings, reloadOnChange); closeModal(MODAL_ID) }
    document.getElementById(FORM_ID).addEventListener('change',(e)=>{ const form=e.target.form; const newSettings={}; Array.from(form.elements).forEach(el=>{ if(el.type==='checkbox' && el.name && defaultKeys.includes(el.name)) newSettings[el.name]=el.checked }); saveSettings(newSettings); applySettings(newSettings, reloadOnChange) }) }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', register); else register()
}
