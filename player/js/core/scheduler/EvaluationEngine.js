// EvaluationEngine.js - Schedule evaluation and active schedule selection
// Responsibility: Determine active schedule and trigger processing via scheduler instance

import { debugLog } from '../../../../shared/utils/debug-utils.js'
import { getMostRecentOccurrence } from './CronUtils.js'

export async function evaluateSchedules(scheduler) {
    if (scheduler.isEvaluating) {
        debugLog('[Evaluation] Evaluation already in progress, skipping')
        return
    }
    if (!scheduler.configuration || !scheduler.configuration.schedules) {
        debugLog('[Evaluation] No schedules to evaluate')
        return
    }
    try {
        scheduler.isEvaluating = true
        const now = new Date()
        debugLog(`[Evaluation] Evaluating schedules at ${now.toISOString()}`)
        const activeSchedule = findActiveSchedule(scheduler.configuration, now)
        if (activeSchedule) {
            await scheduler.processActiveSchedule(activeSchedule)
        } else {
            debugLog('[Evaluation] No active schedule found for current time')
        }
    } catch (err) {
        console.error('[Evaluation] Schedule evaluation failed:', err)
    } finally {
        scheduler.isEvaluating = false
    }
}

export function findActiveSchedule(configuration, currentTime) {
    if (!configuration.schedules || configuration.schedules.length === 0) {
        debugLog('[Evaluation] Configuration has no schedules array or it is empty')
        return null
    }
    const validSchedules = getValidSchedules(configuration)
    if (!validSchedules.length) {
        debugLog('[Evaluation] No valid schedules with crontabs found')
        return null
    }
    return findMostRecentSchedule(validSchedules, currentTime)
}

export function getValidSchedules(configuration) {
    return configuration.schedules.filter(schedule => {
        if (!schedule.crontab) {
            debugLog(`[Evaluation] Skip: schedule ${schedule.eid || schedule.name} missing crontab`)
            return false
        }
        return true
    })
}

export function findMostRecentSchedule(validSchedules, currentTime) {
    const state = { mostRecentSchedule: null, mostRecentTime: null }
    validSchedules.forEach(schedule => updateMostRecent(state, schedule, currentTime))
    const { mostRecentSchedule, mostRecentTime } = state
    if (!mostRecentSchedule) {
        debugLog('[Evaluation] No recent schedule occurrences found')
        return null
    }
    debugLog(`[Evaluation] Selected schedule: "${mostRecentSchedule.name}" (last occurrence ${mostRecentTime.toISOString()})`)
    logNextOccurrenceHint(mostRecentSchedule, currentTime)
    return mostRecentSchedule
}

function updateMostRecent(state, schedule, currentTime) {
    const recentOccurrence = getMostRecentOccurrence(schedule, currentTime)
    if (recentOccurrence) {
        debugLog(`[Evaluation] Schedule "${schedule.name}": last occurrence ${recentOccurrence.toISOString()}`)
        if (!state.mostRecentTime || recentOccurrence > state.mostRecentTime) {
            state.mostRecentTime = recentOccurrence
            state.mostRecentSchedule = schedule
        }
    } else {
        debugLog(`[Evaluation] Schedule "${schedule.name}": no recent occurrence found (cron may not have fired yet)`)
    }
}

function logNextOccurrenceHint(schedule, currentTime) {
    try {
        if (typeof window !== 'undefined' && window.later && schedule.crontab) {
            const cronSchedule = window.later.parse.cron(schedule.crontab)
            const nextOcc = window.later.schedule(cronSchedule).next(1, currentTime)
            if (nextOcc) debugLog(`[Evaluation] Next occurrence for "${schedule.name}" at ${new Date(nextOcc).toISOString()}`)
        }
    } catch { /* ignore */ }
}
