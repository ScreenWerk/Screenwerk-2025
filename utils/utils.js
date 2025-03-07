export async function fetchJSON(url) {
    // TODO: Solve the issue with the fetch error bubbling up to the top level
    try {
        const r = await fetch(url)
        if (r.status !== 200) {
            return false
        }
        return await r.json()
    } catch (e) {
        console.error(`Error fetching ${url}: ${e}`)
        return false
    }
}
