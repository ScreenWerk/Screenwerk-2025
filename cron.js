// Disclaimer: no semicolons, if unnecessary, are used in this project
//
// Example input:
// const cron = new Cron([
//     { cronExpression: '*/5 * * * * *', schedule_id: '55adf9d94ecca5c17a5994db' },
//     ...
// ])



class Cron {
    constructor(schedules) {
        this.schedules = schedules
    }

    // Calculate and return the previous schedule executed
    // Decuide based on the current time and the cron expressions in the schedules
    prev() {
    }

    // Return the next schedule to be executed
    // Example output:
    // {
    //     schedule_id: '55adf9d94ecca5c17a5994db',
    //     in_ms: 99998
    // }

    next() {
    }  
}
