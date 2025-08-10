// Dashboard-local fetch helpers (migrated legacy code; original directory removed)
export async function fetchJSON(url) {
  if (url.includes('undefined') || url.includes('null') || url.includes('NaN') || url.includes('Infinity') || url.includes('-Infinity')) {
    console.error(`Invalid URL: ${url}`)
    return false
  }
  try {
    const r = await fetch(url)
    if (r.ok) return await r.json()
    return false
  } catch (e) {
    console.error(`Promise rejected for ${url}: ${e}`)
    return false
  }
}
