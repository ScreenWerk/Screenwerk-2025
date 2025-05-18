import Cron from '../cron.mjs'

describe('Cron', () => {
  describe('current', () => {
    it('should return the schedule id that should play right now when current second is within the range', () => {
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-03-14T10:30:30.000Z').getTime());

      const schedules = [
        { cron_expression: '*/1 * * * * *', schedule_id: '111' },
        { cron_expression: '*/2 * * * * *', schedule_id: '222' }
      ]

      const cron = new Cron(schedules)
      expect(cron.current().schedule_id).toEqual('111')
    })

    it('should return the schedule id that should play right now when current second is outside the range', () => {
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-03-14T10:30:10.000Z').getTime());

      const schedules = [
        { cron_expression: '*/1 * * * * *', schedule_id: '111' },
        { cron_expression: '*/2 * * * * *', schedule_id: '222' }
      ]

      const cron = new Cron(schedules)
      expect(cron.current().schedule_id).toEqual('111')
    })

    // it('should return null if no schedules are passed', () => {
    //   const schedules = []
    //   const cron = new Cron(schedules)
    //   expect(cron.current()).toBeNull()
    // })
  })
})
