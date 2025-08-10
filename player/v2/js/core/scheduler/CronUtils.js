// CronUtils.js - Pure cron evaluation helpers extracted from Scheduler
// Responsibility: parse & evaluate schedule crontabs, independent & side-effect free

import { debugLog } from '../../../../../common/utils/debug-utils.js'

export function hasLaterJs() {
    return typeof window !== 'undefined' && window.later
}

export function getMostRecentOccurrence(schedule, currentTime) {
    if (!schedule.crontab) return null
    try {
        if (hasLaterJs()) {
            return getRecentOccurrenceWithLaterJs(schedule, currentTime)
        } else {
            return getRecentOccurrenceSimple(schedule, currentTime)
        }
    } catch (error) {
        console.error(`[CronUtils] Failed to get recent occurrence for schedule ${schedule.eid}:`, error)
        return null
    }
}

export function getRecentOccurrenceWithLaterJs(schedule, currentTime) {
    const cronSchedule = window.later.parse.cron(schedule.crontab)
    const previousOccurrences = window.later.schedule(cronSchedule).prev(10, currentTime)
    if (previousOccurrences && previousOccurrences.length > 0) {
        return new Date(previousOccurrences[0])
    }
    return null
}

export function getRecentOccurrenceSimple(schedule, currentTime) {
    if (schedule.crontab === '* * * * *') {
        return new Date(currentTime.getTime() - 60000)
    }
    if (schedule.crontab === '0 * * * *') {
        const prevHour = new Date(currentTime)
        prevHour.setMinutes(0, 0, 0)
        if (prevHour >= currentTime) {
            prevHour.setHours(prevHour.getHours() - 1)
        }
        return prevHour
    }
    debugLog(`[CronUtils] Simple cron evaluation fallback for pattern "${schedule.crontab}"`)
    return new Date(currentTime.getTime() - (60 * 60 * 1000))
}
