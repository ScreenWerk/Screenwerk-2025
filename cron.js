// Disclaimer: no semicolons, if unnecessary, are used in this project
//
// Example input:
// const cron = new Cron([
//     { cron_expression: '*/5 * * * * *', schedule_id: '55adf9d94ecca5c17a5994db' },
//     ...
// ])

// If running in Node.js, import later from 'later'
// If running in browser, include later.js in your HTML file
// and remove the line below
// import later from 'later'


class Cron {
    constructor(schedules) {
        this.schedules = schedules.map(({ cron_expression, schedule_id }) => {
            // if cron_expression has seconds
            if (cron_expression.split(' ').length === 6) {
                return {
                    schedule_id,
                    schedule: later.parse.cron(cron_expression, true)
                }
            }
            return  {
                        schedule_id,
                        schedule: later.parse.cron(cron_expression)
                    }
        })
    }

    // Calculate and return the schedule that should play right now
    // Find the schedule with biggest previous occurrence
    current() {
        const latest_occurrences = this.schedules.map(schedule => {
            return {
                schedule_id: schedule.schedule_id,
                time: later.schedule(schedule.schedule).prev(1).getTime(),
                datetime: later.schedule(schedule.schedule).prev(1)
            }
        })
        const latest_schedule = latest_occurrences.reduce((prev, current) => (prev.time > current.time) ? prev : current)
        return latest_schedule
    }

    // Return the next schedule to be executed
    // Example output:
    // {
    //     schedule_id: '55adf9d94ecca5c17a5994db',
    //     in_ms: 99998
    // }

    next() {
        const next_occurrences = this.schedules.map(schedule => {
            return {
                schedule_id: schedule.schedule_id,
                time: later.schedule(schedule.schedule).next(1).getTime(),
                datetime: later.schedule(schedule.schedule).next(1)
            }
        })
        const next_schedule = next_occurrences.reduce((prev, current) => (prev.time < current.time) ? prev : current)
        return next_schedule
    }
}

// If running in Node.js, export Cron
// If running in browser, remove the line below
// export default Cron