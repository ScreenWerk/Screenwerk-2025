// Disclaimer: no semicolons, if unnecessary, are used in this project

export function getMediaListContainer(element) {
    let current = element
    while (current && !current.mediaList) {
        current = current.parentNode
    }
    return current
}

export function showError(element, message) {
    console.error(`ScreenWerk Player Error: ${message}`)
    element.innerHTML = `<div class="error-message">${message}</div>`
}
