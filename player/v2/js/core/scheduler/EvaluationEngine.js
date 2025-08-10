// EvaluationEngine.js - Schedule evaluation and active schedule selection
// Responsibility: Determine active schedule and trigger processing via scheduler instance

import { debugLog } from '../../../../../common/utils/debug-utils.js'
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
    if (!configuration.schedules || configuration.schedules.length === 0) return null
    debugLog(`[Evaluation] Evaluating schedules at ${currentTime.toISOString()}`)
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
            debugLog(`[Evaluation] Schedule ${schedule.eid} has no crontab, skipping`)
            return false
        }
        return true
    })
}

export function findMostRecentSchedule(validSchedules, currentTime) {
    let mostRecentSchedule = null
    let mostRecentTime = null
    for (const schedule of validSchedules) {
        const recentOccurrence = getMostRecentOccurrence(schedule, currentTime)
        if (recentOccurrence) {
            debugLog(`[Evaluation] Schedule "${schedule.name}": most recent occurrence at ${recentOccurrence.toISOString()}`)
            if (!mostRecentTime || recentOccurrence > mostRecentTime) {
                mostRecentTime = recentOccurrence
                mostRecentSchedule = schedule
            }
        } else {
            debugLog(`[Evaluation] Schedule "${schedule.name}": no recent occurrence found`)
        }
    }
    if (mostRecentSchedule) {
        debugLog(`[Evaluation] Most recent schedule: "${mostRecentSchedule.name}" at ${mostRecentTime.toISOString()}`)
        return mostRecentSchedule
    }
    debugLog('[Evaluation] No recent schedule occurrences found')
    return null
}
