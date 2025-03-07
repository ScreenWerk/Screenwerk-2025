// Disclaimer: no semicolons, if unnecessary, are used in this project

const SCREENWERK_PUBLISHER_API = 'https://swpublisher.entu.eu/screen/' // append screen ID (.json) to load configuration

function toDateTimeString(ISODate) {
  return ISODate.slice(0, 10) + ' ' + ISODate.slice(11, 19)
}

async function fetchJSON(url) {
  console.log(`Fetching ${url} in redundant code`)
  const r = await fetch(url)
  try {
    if (r.status !== 200) {
      return false
    }
    return await r.json()
  } catch (e) {
    console.error(`Error fetching ${url}: ${e}`)
    return false
  }
}