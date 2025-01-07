// Disclaimer: no semicolons, if unnecessary, are used in this project
//
// Example input:
// const cron = new Cron([
//     { cron_expression: '*/5 * * * * *', schedule_id: '55adf9d94ecca5c17a5994db' },
//     ...
// ])

class Cron {
    constructor(schedules) {
        this.schedules = schedules
    }

    // Calculate and return the schedule that should play right now
    // Decide based on the current time and the cron expressions in the schedules
    current() {
        const now = Date.now();
        for (const schedule of this.schedules) {
            const { cron_expression, schedule_id } = schedule;
            const [second, minute, hour, dayOfMonth, month, dayOfWeek] = cron_expression.split(' ');
            const nextRunTime = this.calculateNextRunTime(second, minute, hour, dayOfMonth, month, dayOfWeek, now);
            if (nextRunTime.getTime() <= now) {
                return { schedule_id };
            }
        }
        return null;
    }
 trend

    // Return the next schedule to be executed
    // Example output:
    // {
    //     schedule_id: '55adf9d94ecca5c17a5994db',
    //     in_ms: 99998
    // }

    next() {
        let nextSchedule = null
        let minMs = Infinity
        const now = Date.now()

        for (const schedule of this.schedules) {
            const { cron_expression, schedule_id } = schedule
            const [second, minute, hour, dayOfMonth, month, dayOfWeek] = cron_expression.split(' ')

            const nextRunTime = this.calculateNextRunTime(second, minute, hour, dayOfMonth, month, dayOfWeek, now)

            const diff = nextRunTime.getTime() - now

            if (diff > 0 && diff < minMs) {
                minMs = diff
                nextSchedule = { schedule_id, in_ms: diff }
            }
        }
        return nextSchedule
    }

    calculateNextRunTime(second, minute, hour, dayOfMonth, month, dayOfWeek, now) {
        let nextRunTime = new Date(now);
    
        if (minute !== '*') {
            const minutes = this.parseCronValues(minute, 0, 59);
            const currentMinute = nextRunTime.getMinutes();
            const nextMinute = minutes.find(m => m > currentMinute);
            if (nextMinute !== undefined) {
                nextRunTime.setMinutes(nextMinute);
            } else {
                nextRunTime.setMinutes(minutes[0]);
                this.incrementHigherUnit(nextRunTime, 'Minutes');
            }
        }
    
        return nextRunTime;
    }

    calculatePrevRunTime(second, minute, hour, dayOfMonth, month, dayOfWeek, now) {
        const prevRunTime = new Date(now);
    
        this.setPrevComponent(prevRunTime, 'Seconds', second, 0, 59);
        this.setPrevComponent(prevRunTime, 'Minutes', minute, 0, 59);
        this.setPrevComponent(prevRunTime, 'Hours', hour, 0, 23);
        this.setPrevComponent(prevRunTime, 'Date', dayOfMonth, 1, 31);
        this.setPrevComponent(prevRunTime, 'Month', month, 1, 12);
        this.setPrevComponent(prevRunTime, 'Day', dayOfWeek, 0, 6); // Sunday is 0
    
        return prevRunTime;
    }
    
    setPrevComponent(date, unit, cronValue, min, max) {
        if (cronValue === '*') {
            return;
        }
    
        const currentValue = date[`get${unit}`]();
        const parsedValues = this.parseCronValues(cronValue, min, max);
        const prevValue = [...parsedValues].reverse().find(v => v < currentValue);
    
        if (prevValue !== undefined) {
            date[`set${unit}`](prevValue);
        } else {
            date[`set${unit}`](parsedValues[parsedValues.length - 1]);
            this.decrementHigherUnit(date, unit);
            this.resetLowerComponents(date, unit);
        }
    }
    
    resetLowerComponents(date, unit) {
        if (unit === 'Month') {
            date.setDate(1);
        }
        if (unit === 'Date') {
            date.setHours(0);
        }
        if (unit === 'Hours') {
            date.setMinutes(0);
        }
        if (unit === 'Minutes') {
            date.setSeconds(0);
        }
    }

    parseCronValues(value, min, max) {
        if (value === '*') {
            return Array.from({ length: max - min + 1 }, (_, i) => min + i)
        }
        return value.split(',').flatMap(item => {
            if (item.includes('-')) {
                const [start, end] = item.split('-').map(Number)
                return Array.from({ length: end - start + 1 }, (_, i) => start + i)
            } else if (item.includes('/')) {
                const [startStr, intervalStr] = item.split('/')
                const start = startStr === '*' ? min : Number(startStr)
                const interval = Number(intervalStr)
                return Array.from({ length: Math.floor((max - start) / interval) + 1 }, (_, i) => start + i * interval)
            } else {
                return Number(item)
            }
        })
    }

    setNextValue(date, unit, current, values) {
        const currentValue = date[`get${unit}`]()
        const nextValue = values.find(v => v > currentValue)
        if (nextValue !== undefined) {
            date[`set${unit}`](nextValue)
        } else {
            date[`set${unit}`](values[0])
            this.incrementHigherUnit(date, unit)
        }
    }

    setPrevValue(date, unit, current, values) {
        const currentValue = date[`get${unit}`]()
        const prevValue = [...values].reverse().find(v => v < currentValue)
        if (prevValue !== undefined) {
            date[`set${unit}`](prevValue)
        } else {
            date[`set${unit}`](values[values.length - 1])
            this.decrementHigherUnit(date, unit)
        }
    }

    setNextDayOfWeek(date, currentDayOfWeek, daysOfWeek) {
        const nextDayOfWeek = daysOfWeek.find(d => d > currentDayOfWeek)
        if (nextDayOfWeek !== undefined) {
            date.setDate(date.getDate() + (nextDayOfWeek - currentDayOfWeek))
        } else {
            date.setDate(date.getDate() + (daysOfWeek[0] + 7 - currentDayOfWeek + 7) % 7)
        }
    }

    setPrevDayOfWeek(date, currentDayOfWeek, daysOfWeek) {
        const prevDayOfWeek = [...daysOfWeek].reverse().find(d => d < currentDayOfWeek)
        if (prevDayOfWeek !== undefined) {
            date.setDate(date.getDate() - (currentDayOfWeek - prevDayOfWeek))
        } else {
            date.setDate(date.getDate() - (currentDayOfWeek - daysOfWeek[daysOfWeek.length - 1] + 7) % 7)
        }
    }

    incrementHigherUnit(date, unit) {
        if (unit === 'Seconds') {
            date.setMinutes(date.getMinutes() + 1)
        } else if (unit === 'Minutes') {
            date.setHours(date.getHours() + 1)
        } else if (unit === 'Hours') {
            date.setDate(date.getDate() + 1)
        } else if (unit === 'Date') {
            date.setMonth(date.getMonth() + 1)
        } else if (unit === 'Month') {
            date.setFullYear(date.getFullYear() + 1)
        }
    }

    decrementHigherUnit(date, unit) {
        if (unit === 'Seconds') {
            date.setMinutes(date.getMinutes() - 1)
        } else if (unit === 'Minutes') {
            date.setHours(date.getHours() - 1)
        } else if (unit === 'Hours') {
            date.setDate(date.getDate() - 1)
        } else if (unit === 'Date') {
            date.setMonth(date.getMonth() - 1)
        } else if (unit === 'Month') {
            date.setFullYear(date.getFullYear() - 1)
        }
    }
}

export default Cron;
