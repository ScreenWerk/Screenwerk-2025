// Disclaimer: no semicolons, if unnecessary, are used in this project

class Cron {
  constructor() {
    this.schedules = [];
  }

  addSchedule(cronExpression, task) {
    this.schedules.push({ cronExpression, task });
  }

  removeSchedule(task) {
    this.schedules = this.schedules.filter(schedule => schedule.task !== task);
  }

  getSchedules() {
    return this.schedules;
  }
}
