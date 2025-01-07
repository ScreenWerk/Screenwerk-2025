import Cron from './cron.js'

describe('Cron', () => {
  describe('current', () => {
    it('should return the schedule that should play right now', () => {
      const schedules = [
        { cron_expression: '* * * * * *', schedule_id: '1' },
      ]
      const cron = new Cron(schedules)
      expect(cron.current()).toEqual({ schedule_id: '1' })
    })

    it('should return null if no schedules are passed', () => {
      const schedules = []
      const cron = new Cron(schedules)
      expect(cron.current()).toBeNull()
    })
  })

  describe('next', () => {
    it('should return the next schedule to be executed', () => {
      const now = new Date()
      const future_date_time = new Date(now.getTime() + 1000 * 60)
      const future_hour = new Date(future_date_time).getHours()
      const future_minute = new Date(future_date_time).getMinutes()
      const schedules = [
        { cron_expression: `0 ${future_minute} ${future_hour} * * *`, schedule_id: '1' },
      ]
      const cron = new Cron(schedules)
      expect(cron.next().schedule_id).toEqual('1')
      expect(cron.next().in_ms).toBeCloseTo(60000, -2)
    })

    it('should return the next schedule even if it\'s on the next day', () => {
      const schedules = [
        { cron_expression: '0 0 0 * * *', schedule_id: '1' },
      ]
      const cron = new Cron(schedules)
      expect(cron.next().schedule_id).toEqual('1')
      expect(cron.next().in_ms).toBeGreaterThan(0)
    })
  })

  describe('calculateNextRunTime', () => {
    // it('should calculate the next run time for a given cron expression', () => {
    //   const cron = new Cron([{ cron_expression: '0 */5 * * * *', schedule_id: '1' }])
    //   const now = new Date()
    //   const currentMinutes = now.getMinutes()
    //   const currentSeconds = now.getSeconds()
    //   let nextMinute = Math.ceil((currentMinutes + 1) / 5) * 5

    //   if (nextMinute >= 60) {
    //     nextMinute = 0
    //     now.setHours(now.getHours() + 1)
    //   }

    //   const expectedDate = new Date(now)
    //   expectedDate.setMinutes(nextMinute)
    //   expectedDate.setSeconds(0)
    //   expectedDate.setMilliseconds(0)

    //   if (currentSeconds > 0) {
    //     expectedDate.setTime(expectedDate.getTime() + (5 * 60 * 1000))
    //   }

    //   const nextRunTime = cron.calculateNextRunTime('0', '*/5', '*', '*', '*', '*', now.getTime())
    //   nextRunTime.setMilliseconds(0)
    //   expect(nextRunTime.getTime()).toEqual(expectedDate.getTime())
    // })

    // it('should handle different cron expressions', () => {
    //   const cron = new Cron([{ cron_expression: '0 0 * * * *', schedule_id: '1' }])
    //   const now = new Date()
    //   const expectedDate = new Date(now)
    //   expectedDate.setMinutes(0)
    //   expectedDate.setSeconds(0)
    //   expectedDate.setMilliseconds(0)
    //   expectedDate.setHours(expectedDate.getHours() + 1)
    //   const nextRunTime = cron.calculateNextRunTime('0', '0', '*', '*', '*', '*', now.getTime())
    //   nextRunTime.setMilliseconds(0)
    //   expect(nextRunTime.getTime()).toEqual(expectedDate.getTime())
    // })
  })

  describe('calculatePrevRunTime', () => {
    // Tests for calculatePrevRunTime will go here
  })
})
