// test-cron.js
import Cron from './cron.mjs';

console.log('Testing Cron class');
try {
  const schedules = [
    { cron_expression: '*/1 * * * * *', schedule_id: '111' },
    { cron_expression: '*/2 * * * * *', schedule_id: '222' }
  ];

  const cron = new Cron(schedules);
  console.log('Cron instance created successfully');
  
  const current = cron.current();
  console.log('Current schedule:', current);
  
  const next = cron.next();
  console.log('Next schedule:', next);
  
  console.log('Test successful!');
} catch (error) {
  console.error('Error testing Cron class:', error);
}
