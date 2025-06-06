// Issue with the fetch error bubbling up to the top level
// can not be solved, because the browser's console is
// designed to report network errors as they occur,
// regardless of how your JavaScript code handles them. 
// This is a fundamental part of the browser's developer tools.

export async function fetchJSON(url) {
    // If url contains 'undefined' or 'null' or other invalid values,
    // let us know about it with a console.error
    if (url.includes('undefined') || url.includes('null') || url.includes('NaN') || url.includes('Infinity') || url.includes('-Infinity')) {
        console.error(`Invalid URL: ${url}`)
        return false
    }
    try {
        const r = await fetch(url)
        if (r.ok) {
            return await r.json()
        }
        // console.error(`Failed to fetch ${url}: ${r.status}`)
        return false
    } catch (e) {
        console.error(`Promise rejected for ${url}: ${e}`)
        return false
    }
}

// Disclaimer: no semicolons, if unnecessary, are used in this project
