export async function fetchJSON(url) {
    // console.log(`Fetching ${url}`)
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
